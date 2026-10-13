// 11 — QUALITY CHECK
//
// Every edition passes through this gate before delivery. Checks run on both
// presentation voices, because Social is a translation of the same facts,
// not a looser standard. A failing check holds the edition; warnings are
// recorded on the edition for audit.

import { tierCopy, textOf, countWords, WORDS_PER_MINUTE } from '../../web/js/shared/format.js';
import { LIMITS } from './hooks.js';

const stripE = (s) => s.replace(/\s*\p{Extended_Pictographic}\uFE0F?/gu, '').trim();

const GENERIC_AI = [
  'in today’s fast-paced', "in today's fast-paced", 'game-changer', 'game changer', 'delve', 'revolutioniz', 'revolutionis', 'paradigm shift',
  'unleash', 'cutting-edge', 'ever-evolving', 'landscape of', 'it is important to note', 'in conclusion', 'a testament to', 'navigating the',
  'harness the power', 'seamless', 'groundbreaking', 'unprecedented',
];
const URGENCY = ['act now', 'last chance', 'don’t miss', "don't miss", 'hurry', 'before it’s too late', 'urgent', 'breaking'];
const CLICKBAIT = ['you won’t believe', "you won't believe", 'shocking', 'mind-blowing', 'this one trick', 'everyone is talking', 'goes viral', 'insane'];
const HEDGES = ['says', 'said', 'claims', 'according to', 'reported', 'reports', 'reportedly', 'not yet', 'unverified', 'not been', 'hasn’t been', 'early', 'preprint', 'caveat', 'expects', 'citing', 'may', 'could', 'not convinced', 'no receipts', 'did not publish', 'hasn’t shown', 'without publishing'];
const ACRONYMS = new Set(['API', 'GPU', 'UTC', 'AGI', 'CEO', 'CFO', 'PDF', 'EU', 'AI', 'AT-7']);

const numbersIn = (s) =>
  (String(s).match(/\d+(?:[.,]\d+)*/g) || [])
    .map((n) => n.replace(/,(?=\d{3}\b)/g, ''))
    .map((n) => n.replace(/\.0+$/, ''));

function check(id, label, status, detail, items = []) {
  return { id, label, status, detail, items };
}

export function runQualityGate(edition) {
  const checks = [];
  const sourcesById = new Map(edition.sources.map((s) => [s.id, s]));
  const eventsById = new Map(edition.events.map((e) => [e.id, e]));
  const modes = ['business', 'social'];

  // 1. Provenance — every story traces Claim → Event → Source.
  {
    const bad = [];
    for (const st of edition.stories) {
      const ev = eventsById.get(st.eventId);
      if (!ev?.claims.length) bad.push(`${st.id}: no claims`);
      for (const c of ev?.claims || []) for (const sid of c.sources) if (!sourcesById.has(sid)) bad.push(`${st.id}/${c.id}: missing source ${sid}`);
    }
    checks.push(check('provenance', 'Source provenance', bad.length ? 'fail' : 'pass', bad.length ? 'Claims without traceable sources.' : 'Every claim traces to a source record.', bad));
  }

  // 2. Unsupported figures — every number in the copy appears in that event's evidence.
  {
    const bad = [];
    for (const st of edition.stories) {
      const ev = eventsById.get(st.eventId);
      const evidence = new Set(
        numbersIn(
          [...ev.claims.map((c) => c.text), ...ev.sourceIds.map((id) => sourcesById.get(id)?.excerpt || ''), ...ev.sourceIds.map((id) => sourcesById.get(id)?.title || '')].join(' '),
        ),
      );
      for (const mode of modes) {
        const copy = st.copy[mode];
        if (!copy) continue;
        const text = [copy.headline, copy.dek, ...(copy.body || []), copy.why, copy.changed, copy.next, copy.shortVersion, copy.didYouKnow, copy.summaryLine, copy.remember, copy.quiz?.q, copy.quiz?.options[copy.quiz.answer]] // quiz distractors are deliberately wrong; only the answer is a claim
          .filter(Boolean)
          .join(' ');
        for (const n of numbersIn(text)) if (!evidence.has(n)) bad.push(`${st.id} (${mode}): “${n}” not found in sources`);
      }
      if (st.figure) for (const d of st.figure.data) if (!evidence.has(String(d.value).replace(/\.0+$/, '')) && !evidence.has(d.value.toFixed(st.figure.decimals ?? 0))) bad.push(`${st.id} chart: ${d.value} not in sources`);
    }
    checks.push(check('figures', 'No unsupported figures', bad.length ? 'fail' : 'pass', bad.length ? 'Numbers in copy that no source supports.' : 'Every number in both voices appears in the evidence.', bad));
  }

  // 3. Quote integrity — quotes appear verbatim in the cited source.
  {
    const bad = [];
    const flat = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    // A quote ending a sentence in our copy may end mid-sentence in the source ("…battleground,' said").
    const core = (q) => flat(q).replace(/[.,!?;:]+$/, '');
    for (const st of edition.stories) {
      for (const q of st.depth?.saying || []) {
        const src = sourcesById.get(q.source);
        if (!src || !flat(src.excerpt).includes(core(q.quote))) bad.push(`${st.id}: quote from ${q.who} not found in ${q.source}`);
      }
    }
    checks.push(check('quotes', 'Quotes verified', bad.length ? 'fail' : 'pass', bad.length ? 'Quotes that do not match their source.' : 'Every quote matches its source verbatim.', bad));
  }

  // 4. Duplication — one event, one story.
  {
    const bad = [];
    const seenEvents = new Set();
    const seenSources = new Map();
    for (const st of edition.stories) {
      if (seenEvents.has(st.eventId)) bad.push(`event ${st.eventId} published twice`);
      seenEvents.add(st.eventId);
      for (const sid of eventsById.get(st.eventId).sourceIds) {
        if (seenSources.has(sid)) bad.push(`source ${sid} used by ${seenSources.get(sid)} and ${st.id}`);
        seenSources.set(sid, st.id);
      }
    }
    const heads = edition.stories.map((s) => new Set(s.copy.business.headline.toLowerCase().split(/\W+/).filter((w) => w.length > 3)));
    for (let i = 0; i < heads.length; i++)
      for (let j = i + 1; j < heads.length; j++) {
        const inter = [...heads[i]].filter((w) => heads[j].has(w)).length;
        if (inter / Math.max(1, Math.min(heads[i].size, heads[j].size)) > 0.6) bad.push(`similar headlines: ${edition.stories[i].id} / ${edition.stories[j].id}`);
      }
    checks.push(check('duplication', 'No duplicate stories', bad.length ? 'fail' : 'pass', bad.length ? 'Same event or evidence used twice.' : `${edition.stories.length} stories, ${edition.stories.length} distinct events.`, bad));
  }

  // 5. Freshness — published stories rest on current reporting.
  {
    const bad = [];
    const t0 = Date.parse(edition.editionTime);
    for (const st of edition.stories) {
      const ev = eventsById.get(st.eventId);
      const ageH = (t0 - Date.parse(ev.lastSeen)) / 36e5;
      if (ageH > 72) bad.push(`${st.id}: newest source is ${Math.round(ageH)}h old`);
    }
    checks.push(check('freshness', 'Freshness', bad.length ? 'warn' : 'pass', bad.length ? 'Stories resting on older reporting.' : 'Every story has reporting from the last 72 hours.', bad));
  }

  // 6. Reading time — within the reader's budget, in both voices.
  {
    const items = [];
    let status = 'pass';
    for (const mode of modes) {
      const words = edition.stats.words[mode];
      const minutes = words / WORDS_PER_MINUTE;
      items.push(`${mode}: ${words} words ≈ ${minutes.toFixed(1)} min of ${edition.config.budgetMinutes}`);
      if (minutes > edition.config.budgetMinutes * 1.05) status = 'fail';
    }
    checks.push(check('budget', 'Within reading budget', status, status === 'pass' ? 'Fits the reading budget without padding.' : 'Edition exceeds the reading budget.', items));
  }

  // 7. Language — no generic AI phrasing, clickbait or sensationalism.
  {
    const bad = [];
    for (const st of edition.stories) {
      for (const mode of modes) {
        const t = textOf(tierCopy(st.copy[mode], 'full'));
        const lower = t.toLowerCase();
        for (const p of GENERIC_AI) if (lower.includes(p)) bad.push(`${st.id} (${mode}): generic phrasing “${p}”`);
        for (const p of CLICKBAIT) if (lower.includes(p)) bad.push(`${st.id} (${mode}): clickbait “${p}”`);
        const bangs = (t.match(/!/g) || []).length;
        if (mode === 'business' && bangs) bad.push(`${st.id} (business): exclamation mark`);
        if (mode === 'social' && bangs > 3) bad.push(`${st.id} (social): ${bangs} exclamation marks`);
        for (const w of t.match(/\b[A-Z]{4,}\b/g) || []) if (!ACRONYMS.has(w)) bad.push(`${st.id} (${mode}): shouting “${w}”`);
      }
    }
    checks.push(check('language', 'Plain, calm language', bad.length ? 'fail' : 'pass', bad.length ? 'Language the desk does not publish.' : 'No clickbait, sensationalism or stock AI phrasing.', bad));
  }

  // 8. Uncertainty is disclosed, not hidden.
  {
    const bad = [];
    for (const st of edition.stories) {
      const ev = eventsById.get(st.eventId);
      const soft = ev.claims.filter((c) => ['reported', 'emerging', 'uncertain'].includes(c.status));
      if (!soft.length) continue;
      for (const mode of modes) {
        const t = textOf(tierCopy(st.copy[mode], st.tier)).toLowerCase();
        if (!HEDGES.some((h) => t.includes(h))) bad.push(`${st.id} (${mode}): ${soft.length} unconfirmed claim(s) but no attribution or caveat in the published text`);
      }
    }
    checks.push(check('uncertainty', 'Uncertainty disclosed', bad.length ? 'fail' : 'pass', bad.length ? 'Unconfirmed claims presented as settled.' : 'Unconfirmed claims are attributed or caveated.', bad));
  }

  // 9. Clarity — sentence length. Social must also stay simple: short sentences, plain words.
  {
    const bad = [];
    for (const st of edition.stories) {
      for (const [mode, max] of [['business', 30], ['social', 15]]) {
        const sentences = st.copy[mode].body.join(' ').split(/(?<=[.?!])\s+/);
        const avg = sentences.reduce((a, s) => a + countWords(s), 0) / sentences.length;
        if (avg > max) bad.push(`${st.id} (${mode}): average sentence ${avg.toFixed(0)} words`);
      }
    }
    checks.push(check('clarity', 'Clarity', bad.length ? 'warn' : 'pass', bad.length ? 'Long sentences.' : 'Sentences are readable.', bad));
  }

  // 10. Balance — contested stories carry more than one voice or source.
  {
    const bad = [];
    for (const st of edition.stories) {
      const ev = eventsById.get(st.eventId);
      if (ev.claims.some((c) => c.status === 'uncertain' || c.status === 'interpreted')) {
        const pubs = new Set(ev.sourceIds.map((id) => sourcesById.get(id)?.publisher));
        if (pubs.size < 2) bad.push(`${st.id}: contested or interpretive, single publisher`);
      }
    }
    checks.push(check('balance', 'Balance', bad.length ? 'warn' : 'pass', bad.length ? 'Interpretive stories with a single perspective.' : 'Interpretive and contested stories cite more than one publisher.', bad));
  }

  // 11. Silence is honest — quiet topics are said to be quiet.
  {
    const bad = edition.sections.filter((s) => !s.storyIds.length && !s.quiet && s.topicId !== edition.leadTopicId).map((s) => s.label);
    checks.push(check('silence', 'Quiet topics acknowledged', bad.length ? 'warn' : 'pass', bad.length ? 'Empty sections with no explanation.' : 'Topics with nothing significant say so.', bad));
  }

  // 12. Honest hooks — the morning ping must be a true teaser of a published story.
  if (edition.hooks) {
    const bad = [];
    const evidence = new Set(
      numbersIn(
        edition.stories
          .flatMap((st) => eventsById.get(st.eventId).claims.map((c) => c.text).concat(eventsById.get(st.eventId).sourceIds.flatMap((id) => [sourcesById.get(id)?.excerpt || '', sourcesById.get(id)?.title || ''])))
          .join(' '),
      ),
    );
    const n = edition.stories.length;
    for (const x of [n, n - 1, edition.stats.budgetMinutes, edition.stats.readingMinutes.business, edition.stats.readingMinutes.social, 0, 1]) evidence.add(String(x));
    const hasEmoji = (t) => /\p{Extended_Pictographic}/u.test(t);
    const emojiCount = (t) => (t.match(/\p{Extended_Pictographic}/gu) || []).length;
    for (const mode of modes) {
      const h = edition.hooks[mode];
      const texts = [['push title', h.push.title, LIMITS.pushTitle], ['push body', h.push.body, LIMITS.pushBody], ['email subject', h.email.subject, LIMITS.subject], ['email preheader', h.email.preheader, LIMITS.preheader], ['whatsapp', h.whatsapp.text, LIMITS.whatsapp]];
      for (const [label, text, max] of texts) {
        if (text.length > max) bad.push(`${mode} ${label}: ${text.length} chars (max ${max})`);
        for (const num of numbersIn(text.replace(/\{\{link\}\}/g, '').replace(/\b[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}\b/g, ''))) if (!evidence.has(num)) bad.push(`${mode} ${label}: “${num}” is not in the evidence`);
        const lower = text.toLowerCase();
        for (const p of [...CLICKBAIT, ...URGENCY, ...GENERIC_AI]) if (lower.includes(p)) bad.push(`${mode} ${label}: “${p}”`);
      }
      if (mode === 'business' && texts.some(([, t]) => hasEmoji(t))) bad.push('business hooks must not use emoji');
      if (mode === 'social' && emojiCount(h.push.title) > 1) bad.push('social push title: more than one emoji');
      if (n && !edition.stories.some((st) => h.push.title.includes(stripE(st.hooks?.[mode]?.title || st.hooks?.[mode]?.ticker || st.copy[mode].headline)) || h.push.body.includes(stripE(st.hooks?.[mode]?.title || st.hooks?.[mode]?.ticker || st.copy[mode].headline)) || (h.push.title && h.email.items.some((i) => h.push.title.includes(i.head) || h.push.body.includes(i.head)))))
        bad.push(`${mode}: push does not point at a published story`);
    }
    checks.push(check('hooks', 'Honest hooks', bad.length ? 'fail' : 'pass', bad.length ? 'Notification text that over-promises or is unsupported.' : 'Push, email and WhatsApp teasers match published stories, with no false urgency.', bad));
  }

  const status = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn') ? 'warn' : 'pass';
  return { status, checkedAt: new Date().toISOString(), checks };
}
