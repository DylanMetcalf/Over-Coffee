// THE DEPTH LAYER
//
// Newspaper → Story → Sources → Original source.
// The story view is a fuller page for one development. It is never needed to
// understand the edition; it exists for the reader who is curious.

import { esc, longDate, stamp, plural, toneFor } from './util.js';
import { STATUS_LABEL, STATUS_EXPLAINER } from '../shared/format.js';
import { illustrationSvg } from './illustration.js';
import { chartSvg } from './chart.js';
import { markSvg } from './mark.js';
import { ARROW } from './newspaper.js';
const BACK = ARROW.replace('class="more__arrow"', 'class="more__arrow more__arrow--back"');

const HEADS = {
  business: {
    story: 'The story',
    happened: 'What happened',
    why: 'Why it matters',
    changed: 'What changed',
    saying: 'What people are saying',
    next: 'What happens next',
    know: 'How we know',
    related: 'Related developments',
    sources: 'Sources & further reading',
    back: 'Back to today’s edition',
  },
  social: {
    story: 'Okay, so here’s the story',
    happened: 'How it played out',
    why: 'Why people are paying attention',
    changed: 'So what’s actually different?',
    saying: 'Who’s saying what',
    next: 'What to watch for',
    know: 'How sure are we?',
    related: 'Also connected',
    sources: 'Where this came from',
    back: 'Back to today’s paper',
  },
};

export function renderStory(ed, storyId, mode = 'business') {
  const story = ed.stories.find((s) => s.id === storyId);
  if (!story) return null;
  const ev = ed.events.find((e) => e.id === story.eventId);
  const sources = ev.sourceIds.map((id) => ed.sources.find((s) => s.id === id));
  const byId = new Map(sources.map((s) => [s.id, s]));
  const c = story.copy[mode] || story.copy.business;
  const h = HEADS[mode];
  const back = ed.kind === 'daily' ? h.back : mode === 'social' ? 'Back to the paper' : 'Back to the edition';
  const counts = ev.claims.reduce((m, cl) => ((m[cl.status] = (m[cl.status] || 0) + 1), m), {});
  const publishers = new Set(sources.map((s) => s.publisher));
  const factSources = sources.filter((s) => s.usedForFacts);
  const otherSources = sources.filter((s) => !s.usedForFacts);

  const section = (title, inner, cls = '') => (inner ? `<section class="depth__sec ${cls}"><h2 class="depth__h">${esc(title)}</h2>${inner}</section>` : '');

  return `<div class="depth depth--${mode} tone-${toneFor(story.topicId)}">
  ${ed.sample ? `<div class="sample-banner" role="note"><strong>Design prototype — sample edition.</strong> Fictional organisations, people and figures.</div>` : ''}
  <nav class="depth__nav"><a class="depth__back" href="#/read/${esc(ed.id)}?mode=${mode}&at=${esc(story.id)}">${BACK} ${esc(back)}</a><span class="depth__from">${markSvg({ size: 18 })} ${esc(longDate(ed.editorialDate))}</span></nav>

  <header class="depth__head">
    <div class="kicker-row"><span class="kicker">${esc(story.topicLabel)} · ${esc(c.kicker)}</span><span class="status status--${ev.status}">${esc(STATUS_LABEL[ev.status])}</span></div>
    <h1 class="depth__headline">${esc(c.headline)}</h1>
    ${c.dek ? `<p class="depth__dek">${esc(c.dek)}</p>` : ''}
    <p class="depth__meta">${plural(sources.length, 'source')} from ${plural(publishers.size, 'publisher')} · ${Object.entries(counts)
      .map(([k, n]) => `${n} ${STATUS_LABEL[k].toLowerCase()}`)
      .join(' · ')}</p>
    ${ed.kind === 'daily' ? `<div class="depth__actions" data-actions data-ed="${esc(ed.id)}" data-story="${esc(story.id)}"><button type="button" class="btn btn--small btn--ghost" data-act="save" aria-pressed="false">Save</button><button type="button" class="btn btn--small btn--ghost" data-act="share">Share</button><span class="depth__fb" role="group" aria-label="Was this relevant?"><span>Relevant to you?</span><button type="button" class="chip" data-act="more" aria-pressed="false">More like this</button><button type="button" class="chip" data-act="less" aria-pressed="false">Less like this</button></span></div>` : ''}
  </header>

  <div class="depth__art">${illustrationSvg(story, { cls: 'ill--depth' })}</div>

  <div class="depth__grid">
    <div class="depth__main">
      ${section(h.story, `${(c.shortVersion && mode === 'social') ? `<p class="s-short"><b>The short version:</b> ${esc(c.shortVersion)}</p>` : ''}${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}${story.figure ? chartSvg(story.figure, byId.get(story.figure.source)?.publisher || '') : ''}`)}
      ${section(h.happened, story.depth.timeline?.length ? `<ol class="timeline">${story.depth.timeline.map((t) => `<li><span class="timeline__when">${esc(t.when)}</span><span class="timeline__what">${esc(t.what)}</span></li>`).join('')}</ol>` : '')}
      ${section(h.why, c.why ? `<p class="depth__lede">${esc(c.why)}</p>` : '')}
      ${section(h.changed, (story.copy.business.changed && `<p>${esc(mode === 'social' ? story.copy.business.changed : c.changed || story.copy.business.changed)}</p>`) || '')}
      ${section(
        h.saying,
        story.depth.saying?.length
          ? story.depth.saying
              .map((q) => {
                const s = byId.get(q.source);
                return `<blockquote class="pull"><p>“${esc(q.quote)}”</p><footer><b>${esc(q.who)}</b>, ${esc(q.role)}${s ? ` · <a href="#/source/${esc(ed.id)}/${esc(s.id)}?mode=${mode}&from=${esc(story.id)}">via ${esc(s.publisher)}</a>` : ''}</footer></blockquote>`;
              })
              .join('')
          : '',
      )}
      ${section(h.next, story.copy.business.next ? `<p>${esc(c.next || story.copy.business.next)}</p>` : '')}
      ${section(
        h.know,
        `<ul class="claims">${ev.claims
          .map(
            (cl) => `<li class="claim"><span class="status status--${cl.status}">${esc(STATUS_LABEL[cl.status])}</span><p class="claim__text">${esc(cl.text)}</p><p class="claim__src">${cl.sources
              .map((sid) => byId.get(sid))
              .filter(Boolean)
              .map((s) => `<a href="#/source/${esc(ed.id)}/${esc(s.id)}?mode=${mode}&from=${esc(story.id)}">${esc(s.publisher)}</a>`)
              .join(', ')}${cl.note ? ` <span class="claim__note">— ${esc(cl.note)}</span>` : ''}</p></li>`,
          )
          .join('')}</ul>`,
        'depth__sec--know',
      )}
    </div>

    <aside class="depth__aside">
      <section class="legend">
        <h3 class="rail__h">Reading the labels</h3>
        <dl>${['confirmed', 'reported', 'interpreted', 'emerging', 'uncertain']
          .map((k) => `<div><dt><span class="status status--${k}">${STATUS_LABEL[k]}</span></dt><dd>${esc(STATUS_EXPLAINER[k])}</dd></div>`)
          .join('')}</dl>
      </section>
      ${story.depth.related?.length ? `<section class="related"><h3 class="rail__h">${esc(h.related)}</h3><ul>${story.depth.related
        .map((r) => (r.storyId ? `<li><a href="#/story/${esc(ed.id)}/${esc(r.storyId)}?mode=${mode}">${esc(mode === 'social' && r.socialTitle ? r.socialTitle : r.title)}</a></li>` : `<li><span>${esc(r.title)}</span> <span class="related__note">— considered, not in today’s edition</span></li>`))
        .join('')}</ul></section>` : ''}
    </aside>
  </div>

  <section class="sources" id="sources">
    <h2 class="sources__h">${esc(h.sources)}</h2>
    <p class="sources__intro">${mode === 'social' ? 'Everything above comes from these. Tap through for the original.' : 'The evidence behind this story, in the order it is most useful to read.'}</p>
    <ol class="source-list">${[...factSources.sort(sourceRank), ...otherSources].map((s) => sourceItem(ed, s, story, mode)).join('')}</ol>
  </section>

  <nav class="depth__end"><a class="more" href="#/read/${esc(ed.id)}?mode=${mode}&at=${esc(story.id)}">${BACK}${esc(back)}</a></nav>
</div>`;
}

const TYPE_RANK = { official: 0, regulatory: 0, filing: 0, research: 1, documentation: 1, wire: 2, journalism: 2, analysis: 3, expert: 3, trade: 4, blog: 5, aggregator: 6 };
const sourceRank = (a, b) => (TYPE_RANK[a.sourceType] ?? 9) - (TYPE_RANK[b.sourceType] ?? 9) || a.publishedAt.localeCompare(b.publishedAt);

function sourceItem(ed, s, story, mode) {
  return `<li class="source${s.usedForFacts ? '' : ' source--context'}">
  <h3 class="source__heading">${esc(s.heading)}</h3>
  <p class="source__role">${esc(s.role)} · ${esc(s.publisher)} · ${esc(stamp(s.publishedAt))}</p>
  <a class="source__link" href="#/source/${esc(ed.id)}/${esc(s.id)}?mode=${mode}&from=${esc(story.id)}">Read source ${ARROW}</a>
</li>`;
}

/** Original-source page: what the source is, why it is here, and the way out to the publisher. */
export function renderSource(ed, sourceId, { mode = 'business', from } = {}) {
  const s = ed.sources.find((x) => x.id === sourceId);
  if (!s) return null;
  const ev = ed.events.find((e) => e.id === s.eventId);
  const story = ed.stories.find((x) => x.eventId === s.eventId);
  const supports = ev.claims.filter((c) => c.sources.includes(s.id));
  const isSample = String(s.url).startsWith('sample://');
  const back = from || story?.id;
  return `<div class="depth depth--source depth--${mode}">
  ${ed.sample ? `<div class="sample-banner" role="note"><strong>Design prototype — sample source.</strong> This publisher and article are fictional.</div>` : ''}
  <nav class="depth__nav">${back ? `<a class="depth__back" href="#/story/${esc(ed.id)}/${esc(back)}?mode=${mode}#sources">${BACK} Back to the story</a>` : `<a class="depth__back" href="#/read/${esc(ed.id)}?mode=${mode}">${BACK} Back to the edition</a>`}</nav>
  <header class="depth__head">
    <div class="kicker-row"><span class="kicker">Original source · ${esc(s.typeLabel)}</span></div>
    <h1 class="depth__headline depth__headline--source">${esc(s.title)}</h1>
    <p class="depth__meta">${esc(s.publisher)} · Published ${esc(stamp(s.publishedAt))} · Retrieved ${esc(stamp(s.retrievedAt))}</p>
  </header>
  <div class="source-page">
    <blockquote class="source-page__excerpt"><p>${esc(s.excerpt)}</p></blockquote>
    <dl class="facts">
      <div><dt>Why it is in the story</dt><dd>${esc(s.role)}${story ? ` — ${esc(story.copy.business.headline)}` : ''}</dd></div>
      <div><dt>Supports</dt><dd>${supports.length ? `<ul>${supports.map((c) => `<li><span class="status status--${c.status}">${esc(STATUS_LABEL[c.status])}</span> ${esc(c.text)}</li>`).join('')}</ul>` : 'Context only — not relied on for any fact in the edition.'}</dd></div>
      <div><dt>Source assessment</dt><dd>${esc(s.credibility.basis)} · ${s.credibility.primary ? 'Primary source' : 'Secondary source'}${s.usedForFacts ? '' : ' · Below our threshold for facts'}</dd></div>
    </dl>
    ${isSample ? `<p class="source-page__out source-page__out--sample">In a live edition, this opens the original at the publisher. <span>Sample sources have no original.</span></p>` : `<p class="source-page__out"><a class="more" href="${esc(s.url)}" target="_blank" rel="noopener">Open the original at ${esc(s.publisher)}${ARROW}</a></p>`}
  </div>
</div>`;
}
