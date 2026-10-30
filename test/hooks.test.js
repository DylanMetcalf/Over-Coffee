import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { runPipeline } from '../server/engine/pipeline.js';
import { runQualityGate } from '../server/engine/quality.js';
import { LIMITS, withLink } from '../server/engine/hooks.js';
import { deliver, renderEmailHtml } from '../server/delivery/channels.js';
import { renderNewspaper } from '../web/js/render/newspaper.js';
import { countWords } from '../web/js/shared/format.js';

const run = (topics, m, date = '2026-10-02') => runPipeline({ store: new Store(':memory:'), userId: 'u', topicIds: topics, budgetMinutes: m, date });
const EMOJI = /\p{Extended_Pictographic}/u;

test('every edition carries honest hooks for push, email and WhatsApp in both voices', async () => {
  for (const topics of [['ai'], ['ai', 'food', 'farming'], ['robotics'], ['football']])
    for (const m of [3, 5, 10]) {
      const ed = await run(topics, m);
      assert.ok(ed.hooks, 'hooks exist');
      assert.equal(ed.quality.checks.find((c) => c.id === 'hooks').status, 'pass', JSON.stringify(ed.quality.checks.find((c) => c.id === 'hooks').items));
      for (const mode of ['business', 'social']) {
        const h = ed.hooks[mode];
        assert.ok(h.push.title.length <= LIMITS.pushTitle && h.push.body.length <= LIMITS.pushBody);
        assert.ok(h.email.subject.length <= LIMITS.subject && h.email.preheader.length <= LIMITS.preheader);
        assert.ok(h.whatsapp.text.length <= LIMITS.whatsapp);
        if (mode === 'business') assert.ok(![h.push.title, h.push.body, h.email.subject, h.whatsapp.text].some((t) => EMOJI.test(t)), 'no emoji in Business');
      }
    }
});

test('a hook always points at a published story, and a quiet day gets an honest quiet ping', async () => {
  const ed = await run(['ai', 'food', 'farming'], 10);
  const lead = ed.stories[0];
  assert.ok(ed.hooks.social.push.title.includes(lead.hooks.social.title) || ed.hooks.social.push.body.includes(lead.hooks.social.title.replace(/\s*\p{Extended_Pictographic}/u, '')));
  const quiet = await run(['football'], 10);
  assert.equal(quiet.hooks.pattern, 'quiet');
  assert.match(quiet.hooks.social.push.body, /Nothing was worth your time/);
  assert.match(quiet.hooks.business.push.body, /up to date/);
});

test('hooks vary day to day so the ping does not become wallpaper', async () => {
  const patterns = new Set();
  for (const d of ['01', '02', '03', '04', '05', '06', '07']) patterns.add((await run(['ai', 'food', 'farming'], 10, `2026-10-${d}`)).hooks.pattern);
  assert.ok(patterns.size >= 2, [...patterns].join());
});

test('the gate refuses hooks with false urgency, invented numbers, clickbait or over-length text', async () => {
  const ed = await run(['ai'], 10);
  const bad = structuredClone(ed);
  bad.hooks.social.push.title = 'Act now! Sales up 340% 🔥🔥';
  bad.hooks.business.email.subject = 'You won’t believe this shocking AI result';
  bad.hooks.business.push.body = 'x'.repeat(300);
  const q = runQualityGate(bad);
  const h = q.checks.find((c) => c.id === 'hooks');
  assert.equal(h.status, 'fail');
  const text = h.items.join(' | ');
  assert.match(text, /340/);
  assert.match(text, /act now/);
  assert.match(text, /more than one emoji/);
  assert.match(text, /max 150/);
});

test('Social is written simply: short sentences, and excited but never shouting', async () => {
  const ed = await run(['ai', 'food', 'farming'], 20);
  for (const st of ed.stories) {
    const sentences = st.copy.social.body.join(' ').split(/(?<=[.?!])\s+/);
    const avg = sentences.reduce((a, s) => a + countWords(s), 0) / sentences.length;
    assert.ok(avg <= 15, `${st.id} avg ${avg}`);
    const bangs = (JSON.stringify(st.copy.social).match(/!/g) || []).length;
    assert.ok(bangs <= 3);
  }
  const html = renderNewspaper(ed, 'social');
  assert.match(html, /Here’s the tea/);
  assert.match(html, /The quick version/);
});

test('delivery writes a push payload, a WhatsApp message and an HTML email from the stored edition', async () => {
  const ed = await run(['ai', 'food', 'farming'], 10);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-outbox-'));
  const out = await deliver({ edition: ed, profile: { mode: 'social', delivery: { channels: ['push', 'email', 'whatsapp'], whatsapp: '+27 82 123 4567' } }, baseUrl: 'https://example.test', outDir: dir });
  assert.deepEqual(Object.keys(out).sort(), ['email', 'push', 'whatsapp']);
  assert.match(out.push.url, /https:\/\/example\.test\/#\/read\//);
  assert.ok(!out.whatsapp.text.includes('{{link}}'));
  assert.match(out.whatsapp.click_to_chat, /wa\.me\/27821234567/);
  const html = fs.readFileSync(path.join(dir, `${ed.id}-social.email.html`), 'utf8');
  assert.ok(html.includes(ed.hooks.social.email.subject.replace(/&/g, '&amp;')));
  assert.match(html, /Read today’s paper/);
  assert.match(renderEmailHtml({ edition: ed, mode: 'business', baseUrl: 'https://example.test' }), /Good morning\. Here’s what matters\./);
  assert.ok(!JSON.stringify(withLink(ed.hooks, 'L')).includes('{{link}}'));
  fs.rmSync(dir, { recursive: true });
});
