// THE NEWSPAPER RENDERER
//
// Pure functions: edition object + presentation mode → HTML string.
// Used by the browser (web edition) and by the server (print/PDF), so both
// outputs are always the same edition, never a re-generation.

import { esc, longDate, shortDate, hm, plural, numberWord, toneFor } from './util.js';
import { tierCopy, STATUS_LABEL } from '../shared/format.js';
import { markSvg } from './mark.js';
import { illustrationSvg } from './illustration.js';
import { chartSvg } from './chart.js';

export const ARROW = '<svg class="more__arrow" width="15" height="10" viewBox="0 0 15 10" aria-hidden="true"><path d="M0 5h13M9 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

export function renderNewspaper(ed, mode = 'business', opts = {}) {
  const ctx = context(ed, mode, opts);
  return mode === 'social' ? social(ctx) : business(ctx);
}

function context(ed, mode, opts) {
  const stories = new Map(ed.stories.map((s) => [s.id, s]));
  const events = new Map(ed.events.map((e) => [e.id, e]));
  const sources = new Map(ed.sources.map((s) => [s.id, s]));
  const lead = ed.stories.find((s) => s.eventId === ed.leadEventId) || null;
  const order = [lead, ...ed.sections.flatMap((sec) => sec.storyIds.map((id) => stories.get(id)))].filter(Boolean);
  return { ed, mode, opts, stories, events, sources, lead, order, print: !!opts.print };
}

// ── shared pieces ──────────────────────────────────────────────────────────

function sampleBanner(ctx) {
  if (!ctx.ed.sample) return '';
  return `<div class="sample-banner" role="note"><strong>Design prototype — sample edition.</strong> The organisations, people, quotes and figures in this edition are fictional and are not current news.</div>`;
}

/** Status shown next to the kicker: always for anything short of confirmed. */
function statusTag(ctx, story) {
  const ev = ctx.events.get(story.eventId);
  const soft = ev.claims.find((c) => ['emerging', 'uncertain'].includes(c.status));
  const st = soft?.status || ev.status;
  const label = st === 'emerging' ? 'Emerging · not yet peer reviewed' : st === 'uncertain' ? 'Unverified claim' : STATUS_LABEL[st];
  return `<span class="status status--${st}" title="${esc(soft?.note || ev.claims[0]?.note || '')}">${esc(label)}</span>`;
}

function moreLink(ctx, story, label) {
  const { ed, mode, opts } = ctx;
  if (ctx.print) {
    const url = `${opts.baseUrl || ''}/s/${ed.id}/${story.id}${mode === 'social' ? '?m=s' : ''}`;
    return `<a class="more more--print" href="${esc(url)}">${esc(label)} <span class="more__url">${esc(url.replace(/^https?:\/\//, ''))}</span></a>`;
  }
  return `<a class="more" href="#/story/${esc(ed.id)}/${esc(story.id)}?mode=${mode}">${esc(label)}${ARROW}</a>`;
}

function readMinutes(ctx) {
  return ctx.ed.stats.readingMinutes[ctx.mode];
}

// ── BUSINESS ───────────────────────────────────────────────────────────────

function business(ctx) {
  const { ed, lead } = ctx;
  return `<div class="paper paper--business${ctx.print ? ' paper--print' : ''}">
${sampleBanner(ctx)}
${businessMasthead(ctx)}
${lead ? businessFront(ctx) : quietDay(ctx)}
${ed.sections.map((sec) => businessSection(ctx, sec)).join('')}
${colophon(ctx)}
</div>`;
}

function businessMasthead(ctx) {
  const { ed } = ctx;
  const n = ed.stories.length;
  return `<header class="mast">
  <div class="mast__bar">
    <span class="mast__date">${esc(longDate(ed.editorialDate))}</span>
    ${markSvg({ size: 22, cls: 'mast__mark' })}
    <span class="mast__edition">Your ${readMinutes(ctx)}-minute edition</span>
  </div>
  <div class="mast__title-row">
    <h1 class="mast__title">Over Coffee</h1>
  </div>
  <div class="mast__rule" aria-hidden="true"></div>
  <div class="mast__meta">
    <span class="mast__topics">${ed.topics.map((t) => esc(t.label)).join('<span class="dot">·</span>')}</span>
    <span class="mast__tag">Good morning. Here’s what matters.</span>
    <span class="mast__count">${n ? `${numberWord(n)} ${n === 1 ? 'thing' : 'things'} worth knowing today` : 'A quiet morning'}</span>
  </div>
  ${keyFigures(ctx)}
</header>`;
}

/**
 * The day's headline numbers at a glance. Every value comes from a story's
 * sourced chart data (which the quality gate verifies); no arithmetic is
 * added — the previous value is shown, not a computed change.
 */
function keyFigures(ctx) {
  const items = ctx.order.filter((s) => s.figure?.data?.length >= 2).slice(0, 4);
  if (items.length < 2) return '';
  const fmt = (f, v) => `${f.unit === '$' ? '$' : ''}${v.toFixed(f.decimals ?? 0)}${f.unit === '%' ? '%' : ''}`;
  return `<div class="figures" aria-label="Key figures">${items
    .map((s) => {
      const f = s.figure;
      const now = f.data.at(-1).value;
      const before = f.data.at(-2);
      const dir = now > before.value ? 'up' : now < before.value ? 'down' : 'flat';
      const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
      const href = ctx.print ? '' : ` href="#/read/${esc(ctx.ed.id)}?mode=business&at=${esc(s.id)}" data-jump="${esc(s.id)}"`;
      return `<a class="figure"${href}>
      <span class="figure__label">${esc(f.short || f.title)}</span>
      <span class="figure__value">${fmt(f, now)}${f.suffix ? `<small>${esc(f.suffix)}</small>` : ''}</span>
      <span class="figure__delta figure__delta--${dir}"><i aria-hidden="true">${arrow}</i> from ${fmt(f, before.value)} · ${esc(before.label)}</span>
    </a>`;
    })
    .join('')}</div>`;
}

function businessFront(ctx) {
  const { ed, lead } = ctx;
  const c = tierCopy(lead.copy.business, 'full');
  const why = ed.remember?.business;
  const paras = c.body.map((p) => `<p>${esc(p)}</p>`).join('');
  return `<section class="front" aria-label="Front page">
  <article class="lead story" id="${esc(lead.id)}" data-topic="${esc(lead.topicId)}">
    <div class="kicker-row"><span class="kicker">${esc(lead.topicLabel)} · ${esc(c.kicker)}</span>${statusTag(ctx, lead)}</div>
    <h2 class="lead__headline">${esc(c.headline)}</h2>
    <p class="dek dek--lead">${esc(c.dek)}</p>
    <div class="lead__art">${illustrationSvg(lead, { cls: 'ill--lead' })}</div>
    <div class="lead__cols">
      ${paras}
      ${lead.figure ? chartSvg(lead.figure, ctx.sources.get(lead.figure.source)?.publisher || '') : ''}
      ${c.why ? `<p class="callout callout--why"><b class="label">Why it matters</b> ${esc(c.why)}</p>` : ''}
      ${c.changed ? `<p class="callout"><b class="label">What changed</b> ${esc(c.changed)}</p>` : ''}
      ${c.next ? `<p class="callout"><b class="label">What happens next</b> ${esc(c.next)}</p>` : ''}
      ${lead.alsoIn?.length ? `<p class="also">Also matters for ${lead.alsoIn.map(esc).join(' and ')}</p>` : ''}
      ${moreLink(ctx, lead, 'Learn more')}
    </div>
  </article>
  <aside class="rail" aria-label="Today in brief">
    <section class="rail__block">
      <h3 class="rail__h">Today in brief</h3>
      <ol class="brief-list">${ctx.order
        .map((s, i) => `<li><a href="${ctx.print ? '#' : '#/read/' + esc(ed.id) + '?mode=business&at=' + esc(s.id)}" data-jump="${esc(s.id)}"><span class="brief-list__n">${i + 1}</span><span>${esc(s.copy.business.summaryLine || s.copy.business.headline)}</span></a></li>`)
        .join('')}</ol>
    </section>
    ${why ? `<section class="rail__block rail__block--remember"><h3 class="rail__h">One thing to remember</h3><p class="remember">${esc(why.text)}</p></section>` : ''}
    <section class="rail__block">
      <h3 class="rail__h">In this edition</h3>
      <ul class="index-list">${ed.sections
        .map((sec) => {
          const n = sec.storyIds.length + (ed.leadTopicId === sec.topicId ? 1 : 0);
          return `<li><span>${esc(sec.label)}</span><span class="index-list__n">${n ? plural(n, 'story', 'stories') : 'Quiet today'}</span></li>`;
        })
        .join('')}</ul>
    </section>
  </aside>
</section>`;
}

function businessSection(ctx, sec) {
  const items = sec.storyIds.map((id) => ctx.stories.get(id));
  if (!items.length && ctx.ed.leadTopicId === sec.topicId) return '';
  if (!items.length) {
    return `<section class="sec sec--quiet" id="sec-${esc(sec.topicId)}">
  <header class="sec__head"><h2 class="sec__title">${esc(sec.label)}</h2><span class="sec__count">Quiet today</span></header>
  <p class="quiet">${esc(sec.quiet || '')}</p>
</section>`;
  }
  const leadNote = ctx.ed.leadTopicId === sec.topicId ? `<span class="sec__count">Lead story on the front page · ${plural(items.length, 'more story', 'more stories')}</span>` : `<span class="sec__count">${plural(items.length, 'story', 'stories')}</span>`;
  const [first, ...rest] = items;
  const full = rest.filter((s) => s.tier !== 'brief');
  const briefs = rest.filter((s) => s.tier === 'brief');
  return `<section class="sec" id="sec-${esc(sec.topicId)}">
  <header class="sec__head"><h2 class="sec__title">${esc(sec.label)}</h2>${leadNote}</header>
  <div class="sec__grid">
    ${businessStory(ctx, first, { feature: true })}
    ${full.map((s) => businessStory(ctx, s)).join('')}
    ${briefs.length ? `<div class="briefs"><h3 class="briefs__h">In brief</h3>${briefs.map((s) => businessStory(ctx, s)).join('')}</div>` : ''}
  </div>
</section>`;
}

function businessStory(ctx, story, { feature = false } = {}) {
  const c = tierCopy(story.copy.business, story.tier);
  const art = feature && story.tier !== 'brief';
  return `<article class="story story--${story.tier}${feature ? ' story--feature' : ''}" id="${esc(story.id)}" data-topic="${esc(story.topicId)}">
  ${art ? `<div class="story__art"><div class="art">${illustrationSvg(story)}</div>${story.figure ? chartSvg(story.figure, ctx.sources.get(story.figure.source)?.publisher || '') : ''}</div>` : ''}
  <div class="story__text">
    <div class="kicker-row"><span class="kicker">${esc(c.kicker)}</span>${statusTag(ctx, story)}</div>
    <h3 class="story__headline">${esc(c.headline)}</h3>
    ${c.dek ? `<p class="dek">${esc(c.dek)}</p>` : ''}
    <div class="story__body">
      ${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      ${!art && story.figure && story.tier !== 'brief' ? chartSvg(story.figure, ctx.sources.get(story.figure.source)?.publisher || '') : ''}
      ${c.why ? `<p class="callout callout--why"><b class="label">Why it matters</b> ${esc(c.why)}</p>` : ''}
      ${c.changed ? `<p class="callout"><b class="label">What changed</b> ${esc(c.changed)}</p>` : ''}
      ${c.next ? `<p class="callout"><b class="label">What happens next</b> ${esc(c.next)}</p>` : ''}
    </div>
    ${story.alsoIn?.length ? `<p class="also">Also matters for ${story.alsoIn.map(esc).join(' and ')}</p>` : ''}
    ${moreLink(ctx, story, 'Learn more')}
  </div>
</article>`;
}

function quietDay(ctx) {
  return `<section class="front front--quiet"><div class="quiet-day">
  ${markSvg({ size: 40 })}
  <h2>A quiet morning.</h2>
  <p>Nothing in ${ctx.ed.topics.map((t) => esc(t.label)).join(', ')} cleared today’s bar. We would rather tell you that than fill the page.</p>
</div></section>`;
}

function colophon(ctx) {
  const { ed, mode } = ctx;
  const s = ed.stats;
  const passed = ed.quality.checks.filter((c) => c.status === 'pass').length;
  const done = mode === 'social' ? 'That’s it. You’re all caught up — go enjoy your coffee.' : 'That’s today’s edition. You’re done.';
  return `<footer class="colophon">
  ${markSvg({ size: 30, cls: 'colophon__mark' })}
  <p class="colophon__done">${done}</p>
  <p class="colophon__meta">Prepared ${hm(ed.generatedAt)} UTC · ${s.sourcesReviewed} sources from ${s.publishers} publishers reviewed · ${plural(s.considered, 'development')} considered · ${s.published} published · Quality-checked, ${passed} of ${ed.quality.checks.length} checks passed</p>
  ${ctx.print ? '' : `<p class="colophon__links"><a href="#/edition/${esc(ed.id)}?mode=${mode}">How this edition was made</a></p>`}
</footer>`;
}

// ── SOCIAL ─────────────────────────────────────────────────────────────────

const SOCIAL_HEADS = {
  why: ['Why people care', 'Why it’s a big deal', 'Why it matters to you', 'Here’s the thing'],
};

function social(ctx) {
  const { ed, order } = ctx;
  return `<div class="paper paper--social${ctx.print ? ' paper--print' : ''}">
${sampleBanner(ctx)}
${socialMasthead(ctx)}
${order.length ? socialTldr(ctx) : ''}
${order.length ? order.map((s, i) => socialStory(ctx, s, i)).join('') : `<section class="s-quietday"><h2>Honestly? Not much happened.</h2><p>Nothing in ${ed.topics.map((t) => esc(t.label)).join(', ')} was worth your time today. Enjoy the quiet.</p></section>`}
${socialQuiet(ctx)}
${socialQuiz(ctx)}
${socialRemember(ctx)}
${colophon(ctx)}
</div>`;
}

function socialMasthead(ctx) {
  const { ed } = ctx;
  const n = ed.stories.length;
  return `<header class="s-mast">
  <div class="s-mast__top">
    <span class="s-logo">${markSvg({ size: 26 })}<span>over coffee</span></span>
    <span class="s-mast__date">${esc(shortDate(ed.editorialDate))}</span>
  </div>
  <h1 class="s-greet">Morning. <span class="s-greet__em">Here’s what happened.</span></h1>
  <p class="s-sub">${n ? `${numberWord(n)} ${n === 1 ? 'thing' : 'things'} worth knowing` : 'A quiet one'} · about ${readMinutes(ctx)} minute${readMinutes(ctx) === 1 ? '' : 's'}</p>
  <div class="s-chips">${ed.topics.map((t) => `<span class="s-chip tone-${toneFor(t.id)}">${esc(t.label)}</span>`).join('')}</div>
</header>`;
}

function socialTldr(ctx) {
  return `<section class="s-tldr">
  <h2 class="s-tldr__h">The 30-second version</h2>
  <ol class="s-tldr__list">${ctx.order
    .map((s, i) => `<li class="tone-${toneFor(s.topicId)}"><span class="s-num">${i + 1}</span><span>${esc(s.copy.social.summaryLine || s.copy.social.headline)}</span></li>`)
    .join('')}</ol>
</section>`;
}

function socialStory(ctx, story, i) {
  const c = tierCopy(story.copy.social, story.tier);
  const isLead = i === 0;
  const tone = toneFor(story.topicId);
  const quote = story.tier !== 'brief' ? story.depth?.saying?.[0] : null;
  const quoteSrc = quote && ctx.sources.get(quote.source);
  const whyHead = SOCIAL_HEADS.why[i % SOCIAL_HEADS.why.length];
  return `<article class="s-story tone-${tone}${isLead ? ' s-story--lead' : ''} s-story--${story.tier}" id="${esc(story.id)}" data-topic="${esc(story.topicId)}" data-n="${String(i + 1).padStart(2, '0')}">
  ${isLead || story.tier === 'full' ? `<div class="s-art">${illustrationSvg(story, { cls: 'ill--social' })}</div>` : ''}
  <div class="s-copy">
    <div class="s-meta"><span class="s-n">${String(i + 1).padStart(2, '0')}</span><span class="s-topic">${esc(story.topicLabel)}</span>${statusTag(ctx, story)}</div>
    <p class="s-pill">${esc(c.kicker)}</p>
    <h2 class="s-headline">${esc(c.headline)}</h2>
    ${c.dek ? `<p class="s-dek">${esc(c.dek)}</p>` : ''}
    ${c.shortVersion ? `<p class="s-short"><b>The short version:</b> ${esc(c.shortVersion)}</p>` : ''}
    <div class="s-body">${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${story.figure && story.tier !== 'brief' ? chartSvg(story.figure, ctx.sources.get(story.figure.source)?.publisher || '') : ''}
    ${c.why ? `<div class="s-why"><b>${esc(whyHead)}</b><p>${esc(c.why)}</p></div>` : ''}
    ${quote ? `<blockquote class="s-quote"><p>“${esc(quote.quote)}”</p><footer>— ${esc(quote.who)}, ${esc(quote.role)}${quoteSrc ? `, via ${esc(quoteSrc.publisher)}` : ''}</footer></blockquote>` : ''}
    ${c.didYouKnow ? `<aside class="s-dyk"><b>Did you know?</b><p>${esc(c.didYouKnow)}</p></aside>` : ''}
    ${moreLink(ctx, story, 'Tell me more')}
  </div>
</article>`;
}

function socialQuiet(ctx) {
  const quiet = ctx.ed.sections.filter((s) => !s.storyIds.length && s.quiet && ctx.ed.leadTopicId !== s.topicId);
  if (!quiet.length) return '';
  return `<section class="s-quietnote">${quiet
    .map((s) => `<p><span class="s-chip tone-${toneFor(s.topicId)}">${esc(s.label)}</span> Quiet today. ${esc(s.quiet.replace(/^Nothing in [^.]+ cleared today’s bar\. /, 'Nothing was worth your time. '))}</p>`)
    .join('')}</section>`;
}

function socialQuiz(ctx) {
  const quiz = ctx.ed.quiz || [];
  if (!quiz.length) return '';
  const letters = ['A', 'B', 'C', 'D'];
  const answers = quiz.map((q, i) => `${i + 1}${letters[q.answer]}`).join(' · ');
  return `<section class="s-quiz" data-quiz>
  <h2 class="s-quiz__h">${numberWord(quiz.length)} questions over coffee</h2>
  <p class="s-quiz__sub">Were you paying attention? Everything’s in today’s edition.</p>
  <ol class="s-quiz__list">${quiz
    .map(
      (q, qi) => `<li class="s-q" data-answer="${q.answer}"><p class="s-q__text">${esc(q.q)}</p><div class="s-q__opts">${q.options
        .map((o, oi) => `<button type="button" class="s-q__opt" data-q="${qi}" data-opt="${oi}"><span>${letters[oi]}</span>${esc(o)}</button>`)
        .join('')}</div><p class="s-q__result" aria-live="polite"></p></li>`,
    )
    .join('')}</ol>
  <p class="s-quiz__answers">Answers: ${answers}</p>
</section>`;
}

function socialRemember(ctx) {
  const r = ctx.ed.remember?.social;
  if (!r) return '';
  return `<section class="s-remember"><h2>If you remember one thing…</h2><p>${esc(r.text)}</p></section>`;
}
