// THE NEWSPAPER RENDERER (v2)
//
// Pure functions: edition object + presentation mode → HTML string.
// Used by the browser (web edition) and by the server (print/PDF), so both
// outputs are always the same edition, never a re-generation.
//
// Layout principle: every block is finished. Rows of cards share a height,
// features carry their own visual, and print flows into columns, so there are
// no half-empty regions on screen or on paper.

import { esc, longDate, shortDate, hm, plural, numberWord, toneFor } from './util.js';
import { tierCopy, STATUS_LABEL } from '../shared/format.js';
import { markSvg, wordmarkSvg } from './mark.js';
import { illustrationSvg } from './illustration.js';
import { chartSvg, fmtFigure } from './chart.js';

export const ARROW =
  '<svg class="more__arrow" width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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
  return `<div class="sample-banner" role="note"><strong>Design prototype — sample edition</strong><span>The organisations, people, quotes and figures in this edition are fictional and are not current news.</span></div>`;
}

function statusTag(ctx, story) {
  const ev = ctx.events.get(story.eventId);
  const soft = ev.claims.find((c) => ['emerging', 'uncertain'].includes(c.status));
  const st = soft?.status || ev.status;
  const label = st === 'emerging' ? 'Emerging · not peer reviewed' : st === 'uncertain' ? 'Unverified claim' : STATUS_LABEL[st];
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

function chartFor(ctx, story) {
  return story.figure ? chartSvg(story.figure, ctx.sources.get(story.figure.source)?.publisher || '') : '';
}

function readMinutes(ctx) {
  return ctx.ed.stats.readingMinutes[ctx.mode];
}

function lockup(size = 40, { cls = '' } = {}) {
  return `<span class="lockup ${cls}">${wordmarkSvg({ height: size, ink: 'var(--ink)' })}</span>`;
}

/** Row sizes for a run of cards so every row is full (no orphans). */
export function rowsFor(n, max = 3) {
  const rows = [];
  let left = n;
  if (max === 2) {
    while (left > 0) {
      const t = left === 1 ? 1 : 2;
      rows.push(t);
      left -= t;
    }
    return rows;
  }
  while (left > 0) {
    if (left <= 3) {
      rows.push(left);
      break;
    }
    if (left === 4) {
      rows.push(2, 2);
      break;
    }
    rows.push(3);
    left -= 3;
  }
  return rows;
}

function inRows(items, max, render) {
  let i = 0;
  return rowsFor(items.length, max)
    .map((n) => {
      const slice = items.slice(i, i + n);
      i += n;
      return `<div class="row row--${n}">${slice.map((s) => render(s, n)).join('')}</div>`;
    })
    .join('');
}

function colophon(ctx) {
  const { ed, mode } = ctx;
  const s = ed.stats;
  const passed = ed.quality.checks.filter((c) => c.status === 'pass').length;
  const done = mode === 'social' ? 'That’s it. You’re all caught up.' : 'That’s today’s edition.';
  const sub = mode === 'social' ? 'Go enjoy your coffee.' : 'You’re up to date.';
  return `<footer class="colophon">
  ${markSvg({ size: 52, cls: 'colophon__mark' })}
  <p class="colophon__done">${done} <em>${sub}</em></p>
  <p class="colophon__meta">Prepared ${hm(ed.generatedAt)} UTC · ${s.sourcesReviewed} sources from ${s.publishers} publishers reviewed · ${plural(s.considered, 'development')} considered · ${s.published} published · ${passed} of ${ed.quality.checks.length} quality checks passed</p>
  ${ctx.print ? '' : `<p class="colophon__links"><a href="#/edition/${esc(ed.id)}?mode=${mode}">How this edition was made</a></p>`}
</footer>`;
}

// ── BUSINESS ───────────────────────────────────────────────────────────────

function business(ctx) {
  const { ed, lead } = ctx;
  return `<div class="paper paper--business${ctx.print ? ' paper--print' : ''}">
${sampleBanner(ctx)}
${businessMasthead(ctx)}
${lead ? businessHero(ctx) + keyFigures(ctx) + leadBody(ctx) + briefBand(ctx) : quietDay(ctx)}
${ctx.print ? '' : jumpNav(ctx)}
${ctx.print ? printFlow(ctx) : ed.sections.map((sec) => businessSection(ctx, sec)).join('')}
${colophon(ctx)}
</div>`;
}

function businessMasthead(ctx) {
  const { ed } = ctx;
  const n = ed.stories.length;
  return `<header class="mast">
  <div class="mast__row">
    ${lockup(50, { cls: 'lockup--xl' })}
    <div class="mast__right"><span class="pill">${esc(longDate(ed.editorialDate))}</span><span class="pill pill--solid">${readMinutes(ctx)}-minute edition</span></div>
  </div>
  <div class="mast__sub">
    <p class="mast__tag">Good morning. <em>Here’s what matters.</em></p>
    <div class="mast__topics">${ed.topics.map((t) => `<span class="chip-s tone-${toneFor(t.id)}"><i></i>${esc(t.label)}</span>`).join('')}<span class="mast__count">${n ? `${numberWord(n)} ${n === 1 ? 'thing' : 'things'} worth knowing today` : 'A quiet morning'}</span></div>
  </div>
</header>`;
}

function businessHero(ctx) {
  const { lead } = ctx;
  const c = tierCopy(lead.copy.business, 'full');
  const f = lead.figure;
  const stat = f
    ? `<div class="hero__stat"><span class="hero__stat-label">${esc(f.short || f.title)}</span><span class="hero__stat-value">${esc(fmtFigure(f, f.data.at(-1).value))}${f.suffix ? `<small>${esc(f.suffix)}</small>` : ''}</span><span class="hero__stat-delta">from ${esc(fmtFigure(f, f.data.at(-2).value))} · ${esc(f.data.at(-2).label.toLowerCase())}</span></div>`
    : '';
  return `<section class="hero tone-${toneFor(lead.topicId)}" aria-label="Lead story">
  <article class="hero__text story" id="${esc(lead.id)}" data-topic="${esc(lead.topicId)}">
    <div class="kicker-row"><span class="kicker"><i class="dot"></i>${esc(lead.topicLabel)} · ${esc(c.kicker)}</span>${statusTag(ctx, lead)}</div>
    <h2 class="hero__headline">${esc(c.headline)}</h2>
    <p class="hero__dek">${esc(c.dek)}</p>
    <div class="hero__meta"><span>Lead story</span><span>${ctx.ed.events.find((e) => e.id === lead.eventId)?.sourceIds.length || 0} sources</span><span>${ctx.print ? 'Full story below' : `<a href="#${esc(lead.id)}-body" data-jump="${esc(lead.id)}-body">Read the full story ↓</a>`}</span></div>
  </article>
  <div class="hero__visual"><div class="art art--hero">${illustrationSvg(lead, { cls: 'ill--hero' })}</div>${stat}</div>
</section>`;
}

/** The day's headline numbers at a glance. Values come from sourced chart data only. */
function keyFigures(ctx) {
  const items = ctx.order.filter((s) => s.figure?.data?.length >= 2 && s.id !== ctx.lead.id).slice(0, 4);
  if (items.length < 2) return '';
  return `<section class="figures" aria-label="Key figures">${items
    .map((s) => {
      const f = s.figure;
      const now = f.data.at(-1).value;
      const before = f.data.at(-2);
      const dir = now > before.value ? 'up' : now < before.value ? 'down' : 'flat';
      const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
      const max = Math.max(now, before.value) || 1;
      const href = ctx.print ? '' : ` href="#${esc(s.id)}" data-jump="${esc(s.id)}"`;
      return `<a class="figure"${href}>
      <span class="figure__label">${esc(f.short || f.title)}</span>
      <span class="figure__value">${esc(fmtFigure(f, now))}${f.suffix ? `<small>${esc(f.suffix)}</small>` : ''}</span>
      <span class="figure__bars" aria-hidden="true"><i style="width:${Math.round((before.value / max) * 100)}%"></i><i class="now" style="width:${Math.round((now / max) * 100)}%"></i></span>
      <span class="figure__delta"><b class="figure__arrow figure__arrow--${dir}">${arrow}</b> from ${esc(fmtFigure(f, before.value))} · ${esc(before.label.toLowerCase())}</span>
    </a>`;
    })
    .join('')}</section>`;
}

function leadBody(ctx) {
  const { lead } = ctx;
  const c = tierCopy(lead.copy.business, 'full');
  return `<section class="lead-body" id="${esc(lead.id)}-body" aria-label="The lead story in full">
  <div class="lead-body__main">
    <div class="prose prose--lead">${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="card__foot">${lead.alsoIn?.length ? `<span class="also">Also matters for ${lead.alsoIn.map(esc).join(' and ')}</span>` : ''}${moreLink(ctx, lead, 'Learn more')}</div>
  </div>
  <aside class="lead-body__aside">
    ${chartFor(ctx, lead)}
    ${c.why ? `<div class="why why--brand"><b class="label">Why it matters</b><p>${esc(c.why)}</p></div>` : ''}
    ${c.changed ? `<div class="why"><b class="label">What changed</b><p>${esc(c.changed)}</p></div>` : ''}
    ${c.next ? `<div class="why"><b class="label">What happens next</b><p>${esc(c.next)}</p></div>` : ''}
  </aside>
</section>`;
}

function briefBand(ctx) {
  const { ed } = ctx;
  const r = ed.remember?.business;
  return `<section class="brief" aria-label="Today in brief">
  <div class="brief__list">
    <h3 class="h-label">Today in brief</h3>
    <ol>${ctx.order
      .map(
        (s, i) => `<li class="tone-${toneFor(s.topicId)}"><a${ctx.print ? '' : ` href="#${esc(s.id)}" data-jump="${esc(s.id)}"`}><span class="brief__n">${String(i + 1).padStart(2, '0')}</span><span class="brief__t">${esc(s.copy.business.summaryLine || s.copy.business.headline)}</span></a></li>`,
      )
      .join('')}</ol>
  </div>
  ${r ? `<div class="remember"><span class="label">One thing to remember</span><p>${esc(r.text)}</p></div>` : ''}
</section>`;
}

function jumpNav(ctx) {
  const secs = ctx.ed.sections.filter((s) => s.storyIds.length || ctx.ed.leadTopicId === s.topicId);
  if (secs.length < 2) return '';
  return `<nav class="jump" aria-label="Sections"><span class="h-label">Jump to</span>${secs
    .map((s) => {
      const n = s.storyIds.length;
      return `<a href="#sec-${esc(s.topicId)}" data-jump="sec-${esc(s.topicId)}" class="chip-s tone-${toneFor(s.topicId)}"><i></i>${esc(s.label)}<b>${n || 'lead'}</b></a>`;
    })
    .join('')}</nav>`;
}

function businessSection(ctx, sec) {
  const items = sec.storyIds.map((id) => ctx.stories.get(id));
  const tone = toneFor(sec.topicId);
  if (!items.length && ctx.ed.leadTopicId === sec.topicId) return '';
  if (!items.length) {
    return `<section class="sec sec--quiet tone-${tone}" id="sec-${esc(sec.topicId)}">
  <header class="sec__head"><i class="sec__dot"></i><h2 class="sec__title">${esc(sec.label)}</h2><span class="count">Quiet today</span><span class="sec__line"></span></header>
  <div class="quiet-card"><span class="quiet-card__icon">${markSvg({ size: 28 })}</span><p>${esc(sec.quiet || '')}</p></div>
</section>`;
  }
  const note = ctx.ed.leadTopicId === sec.topicId ? `Lead story above · ${plural(items.length, 'more story', 'more stories')}` : plural(items.length, 'story', 'stories');
  const [first, ...rest] = items;
  const featured = first.tier !== 'brief';
  return `<section class="sec tone-${tone}" id="sec-${esc(sec.topicId)}">
  <header class="sec__head"><i class="sec__dot"></i><h2 class="sec__title">${esc(sec.label)}</h2><span class="count">${note}</span><span class="sec__line"></span></header>
  ${businessCard(ctx, first, featured ? 'feature' : 'std')}
  ${rest.length ? inRows(rest, 3, (s, n) => businessCard(ctx, s, n === 1 ? 'wide' : 'std')) : ''}
</section>`;
}

function businessCard(ctx, story, variant) {
  const c = tierCopy(story.copy.business, story.tier);
  const brief = story.tier === 'brief';
  const visual = (variant === 'feature' || variant === 'wide') && !brief;
  const chart = chartFor(ctx, story);
  const callouts = [
    c.why ? `<div class="why"><b class="label">Why it matters</b><p>${esc(c.why)}</p></div>` : '',
    c.changed ? `<div class="why"><b class="label">What changed</b><p>${esc(c.changed)}</p></div>` : '',
    c.next ? `<div class="why"><b class="label">What happens next</b><p>${esc(c.next)}</p></div>` : '',
  ].join('');
  const text = `<div class="card__text">
    <div class="kicker-row"><span class="kicker"><i class="dot"></i>${esc(c.kicker)}</span>${statusTag(ctx, story)}</div>
    <h3 class="card__headline">${esc(c.headline)}</h3>
    ${c.dek ? `<p class="dek">${esc(c.dek)}</p>` : ''}
    <div class="prose">${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${!visual && !brief && chart ? chart : ''}
    ${visual ? '' : callouts}
    ${variant === 'std' && !ctx.print ? `<div class="card__fill" aria-hidden="true"><div class="art">${illustrationSvg(story)}</div></div>` : ''}
    <div class="card__foot">${story.alsoIn?.length ? `<span class="also">Also matters for ${story.alsoIn.map(esc).join(' and ')}</span>` : ''}${moreLink(ctx, story, 'Learn more')}</div>
  </div>`;
  const art = visual ? `<div class="card__visual"><div class="art">${illustrationSvg(story)}</div>${chart}${callouts}</div>` : '';
  return `<article class="card card--${variant} story story--${story.tier} tone-${toneFor(story.topicId)}" id="${esc(story.id)}" data-topic="${esc(story.topicId)}">${text}${art}</article>`;
}

/** Print: one continuous two-column flow, so pages fill and never end half-empty. */
function printFlow(ctx) {
  return `<div class="flow">${ctx.ed.sections
    .map((sec) => {
      const items = sec.storyIds.map((id) => ctx.stories.get(id));
      if (!items.length && ctx.ed.leadTopicId === sec.topicId) return '';
      const head = `<h2 class="flow__head tone-${toneFor(sec.topicId)}"><i class="sec__dot"></i>${esc(sec.label)}<span>${items.length ? plural(items.length, 'story', 'stories') : 'Quiet today'}</span></h2>`;
      if (!items.length) return head + `<p class="flow__quiet">${esc(sec.quiet || '')}</p>`;
      return head + items.map((s) => businessCard(ctx, s, 'std')).join('');
    })
    .join('')}</div>`;
}

function quietDay(ctx) {
  return `<section class="quiet-day"><div class="quiet-day__inner">
  ${markSvg({ size: 64 })}
  <h2>A quiet morning.</h2>
  <p>Nothing in ${ctx.ed.topics.map((t) => esc(t.label)).join(', ')} cleared today’s bar. We would rather tell you that than fill the page.</p>
</div></section>`;
}

// ── SOCIAL ─────────────────────────────────────────────────────────────────

const SOCIAL_WHY = ['Why you should care', 'The bit that matters', 'Here’s the thing', 'So what?', 'Why it’s a big deal'];

function social(ctx) {
  const { ed, order } = ctx;
  const [lead, ...rest] = order;
  return `<div class="paper paper--social${ctx.print ? ' paper--print' : ''}">
${sampleBanner(ctx)}
${socialMasthead(ctx)}
${order.length ? socialTldr(ctx) : ''}
${lead ? socialCard(ctx, lead, 0, 'lead') : `<section class="s-quietday"><h2>Honestly? <em>Nothing happened.</em></h2><p>Nothing in ${ed.topics.map((t) => esc(t.label)).join(', ')} was worth your time today. Enjoy the quiet.</p></section>`}
${ctx.print ? `<div class="flow">${rest.map((s, i) => socialCard(ctx, s, i + 1, 'std')).join('')}</div>` : inRows(rest, 2, (s) => socialCard(ctx, s, order.indexOf(s), 'std'))}
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
  <div class="s-mast__top">${lockup(44, { cls: 'lockup--social' })}<span class="pill">${esc(shortDate(ed.editorialDate))}</span></div>
  <h1 class="s-greet">Morning.<br><em>Here’s the tea.</em></h1>
  <p class="s-sub">${n ? `${numberWord(n)} ${n === 1 ? 'thing' : 'things'} happened. About ${readMinutes(ctx)} minute${readMinutes(ctx) === 1 ? '' : 's'} to catch up.` : 'A quiet one today.'}</p>
  <div class="s-chips">${ed.topics.map((t) => `<span class="chip-s tone-${toneFor(t.id)}"><i></i>${esc(t.label)}</span>`).join('')}</div>
</header>`;
}

function socialTldr(ctx) {
  return `<section class="s-tldr">
  <h2 class="s-tldr__h">The quick version</h2>
  <ol class="s-tldr__list">${ctx.order
    .map((s, i) => `<li class="tone-${toneFor(s.topicId)}"><a${ctx.print ? '' : ` href="#${esc(s.id)}" data-jump="${esc(s.id)}"`}><span class="s-num">${i + 1}</span><span>${esc(s.copy.social.summaryLine || s.copy.social.headline)}</span></a></li>`)
    .join('')}</ol>
</section>`;
}

function socialCard(ctx, story, i, variant) {
  const c = tierCopy(story.copy.social, story.tier);
  const lead = variant === 'lead';
  const tone = toneFor(story.topicId);
  const quote = story.tier !== 'brief' ? story.depth?.saying?.[0] : null;
  const quoteSrc = quote && ctx.sources.get(quote.source);
  const chart = story.tier !== 'brief' ? chartFor(ctx, story) : '';
  return `<article class="s-card tone-${tone} s-card--${lead ? 'lead' : story.tier}" id="${esc(story.id)}" data-topic="${esc(story.topicId)}">
  ${lead ? `<div class="s-card__art"><div class="art">${illustrationSvg(story, { cls: 'ill--social' })}</div></div>` : ''}
  <div class="s-card__body">
    <div class="s-meta"><span class="s-n">${String(i + 1).padStart(2, '0')}</span><span class="s-topic">${esc(story.topicLabel)}</span>${statusTag(ctx, story)}</div>
    <p class="s-pill">${esc(c.kicker)}</p>
    <h2 class="s-headline">${esc(c.headline)}</h2>
    ${c.dek ? `<p class="s-dek">${esc(c.dek)}</p>` : ''}
    ${c.shortVersion ? `<p class="s-short"><b>Short version:</b> ${esc(c.shortVersion)}</p>` : ''}
    <div class="prose">${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${chart}
    ${c.why ? `<div class="s-why"><b>${esc(SOCIAL_WHY[i % SOCIAL_WHY.length])}</b><p>${esc(c.why)}</p></div>` : ''}
    ${quote ? `<blockquote class="s-quote"><p>“${esc(quote.quote)}”</p><footer>${esc(quote.who)}, ${esc(quote.role)}${quoteSrc ? ` · via ${esc(quoteSrc.publisher)}` : ''}</footer></blockquote>` : ''}
    ${c.didYouKnow ? `<aside class="s-dyk"><b>Did you know?</b><p>${esc(c.didYouKnow)}</p></aside>` : ''}
    ${!lead && !ctx.print ? `<div class="s-fill" aria-hidden="true"><div class="art">${illustrationSvg(story, { cls: 'ill--social' })}</div></div>` : ''}
    <div class="card__foot">${moreLink(ctx, story, 'Tell me more')}</div>
  </div>
</article>`;
}

function socialQuiet(ctx) {
  const quiet = ctx.ed.sections.filter((s) => !s.storyIds.length && s.quiet && ctx.ed.leadTopicId !== s.topicId);
  if (!quiet.length) return '';
  return `<section class="s-quietnote">${quiet
    .map((s) => `<p><span class="chip-s tone-${toneFor(s.topicId)}"><i></i>${esc(s.label)}</span> Quiet today. ${esc(s.quiet.replace(/^Nothing in [^.]+ cleared today’s bar\. /, 'Nothing was worth your time. '))}</p>`)
    .join('')}</section>`;
}

function socialQuiz(ctx) {
  const quiz = ctx.ed.quiz || [];
  if (!quiz.length) return '';
  const letters = ['A', 'B', 'C', 'D'];
  const answers = quiz.map((q, i) => `${i + 1}${letters[q.answer]}`).join(' · ');
  return `<section class="s-quiz" data-quiz>
  <h2 class="s-quiz__h">${numberWord(quiz.length)} questions <em>over coffee</em></h2>
  <p class="s-quiz__sub">Were you paying attention? It’s all in today’s edition.</p>
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
  return `<section class="s-remember"><h2>If you remember <em>one thing</em>…</h2><p>${esc(r.text)}</p></section>`;
}
