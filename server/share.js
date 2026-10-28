// Public pages for a deliberately shared story. Nothing personal: no reader name,
// no other stories, no edition list. Only the story, its sources and a way in.

import { markSvg, wordmarkSvg } from '../web/js/render/mark.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const STATUS = { confirmed: 'Confirmed', reported: 'Reported', interpreted: 'Analysis', emerging: 'Early · not peer reviewed', uncertain: 'Unverified' };

export function shareData(edition, story) {
  const c = story.copy.business;
  const ev = edition.events.find((e) => e.id === story.eventId);
  const sources = (edition.sources || []).filter((s) => s.eventId === story.eventId);
  return { headline: c.headline, dek: c.dek || '', summary: c.summaryLine || '', status: STATUS[story.status] || '', topic: story.topicLabel, sources, sample: !!edition.sample, date: edition.editorialDate, eventTitle: ev?.title };
}

const BASE_CSS = `<link rel="stylesheet" href="/css/fonts.css"><link rel="stylesheet" href="/css/tokens.css">`;

export function renderSharePage({ edition, story, baseUrl, token }) {
  const d = shareData(edition, story);
  const url = `${baseUrl}/share/${token}`;
  const desc = d.dek || d.summary;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.headline)} — Over Coffee</title><meta name="robots" content="noindex">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Over Coffee"><meta property="og:title" content="${esc(d.headline)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(url)}/card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(d.headline)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(url)}/card.png">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">${BASE_CSS}
<style>body{margin:0;background:#fbf8f3;color:var(--ink);font:17px/1.55 var(--sans)}main{max-width:680px;margin:0 auto;padding:28px 22px 64px}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}
.k{font:600 11.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}h1{margin:10px 0 14px;font:800 clamp(30px,6vw,46px)/1.04 var(--display);letter-spacing:-.04em}.dek{font-size:20px;color:var(--ink-2);margin:0 0 20px}
.st{display:inline-block;margin-top:6px;padding:5px 10px;border-radius:999px;background:#fff;border:1px solid var(--line-2);font:600 12px/1 var(--mono)}
h2{margin:36px 0 10px;font:800 20px/1.1 var(--display);letter-spacing:-.03em}ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px}li b{display:block}li small{color:var(--muted)}li a{color:var(--ink);font-weight:600}
.cta{margin-top:40px;padding:24px;border-radius:22px;background:#fff;border:1px solid var(--line)}.cta p{margin:0 0 14px}.btn{display:inline-block;padding:14px 24px;border-radius:999px;background:var(--accent);color:#fff;font:650 15px/1 var(--sans);text-decoration:none}.note{margin-top:24px;font-size:13px;color:var(--muted)}</style></head>
<body><main><header><a href="/" aria-label="Over Coffee">${wordmarkSvg({ height: 30, ink: '#0a0b10' })}</a><span class="k">${esc(date(d.date))}</span></header>
<article><div class="k">${esc(d.topic)}${d.sample ? ' · Sample content' : ''}</div><h1>${esc(d.headline)}</h1><p class="dek">${esc(d.dek)}</p>${d.status ? `<span class="st">${esc(d.status)}</span>` : ''}
<h2>Where this comes from</h2><ul>${d.sources.map((s) => `<li><b>${esc(s.publisher)}</b>${esc(s.title)}<br><small>${esc(date(s.publishedAt))}${s.publishedAt ? ' · ' : ''}${esc(s.typeLabel || '')}</small> ${/^https?:\/\//.test(s.url) ? `· <a href="${esc(s.url)}" rel="noopener nofollow" target="_blank">Read the original</a>` : '· sample source (fictional)'}</li>`).join('') || '<li>No sources recorded.</li>'}</ul></article>
<div class="cta"><p><b>Over Coffee</b> is a personal daily newspaper. Tell it what you care about and it prepares one finished edition each morning, with the sources checked.</p><a class="btn" href="/">Get your own edition</a></div>
<p class="note">Shared by a reader. This page shows one story and its sources only. ${d.sample ? 'This is sample content, not current news.' : ''}</p></main></body></html>`;
}

/** 1200×630 card, rendered to PNG for social previews. */
export function renderShareCard({ edition, story }) {
  const d = shareData(edition, story);
  return `<!doctype html><html><head><meta charset="utf-8">${BASE_CSS}<style>html,body{margin:0;width:1200px;height:630px;background:#fbf8f3;overflow:hidden}.c{box-sizing:border-box;width:1200px;height:630px;padding:56px 72px;display:flex;flex-direction:column;justify-content:space-between;font-family:var(--display)}
.k{font:600 20px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#6a7082}h1{margin:18px 0 0;font:800 66px/1.03 var(--display);letter-spacing:-.045em;color:#0a0b10;max-width:1000px}.f{display:flex;align-items:center;justify-content:space-between}.f span{font:500 22px var(--sans);color:#6a7082}</style></head>
<body><div class="c"><div><div class="k">${esc(d.topic)} · ${esc(date(d.date))}${d.sample ? ' · sample' : ''}</div><h1>${esc(d.headline.length > 110 ? d.headline.slice(0, 107) + '…' : d.headline)}</h1></div><div class="f">${wordmarkSvg({ height: 44, ink: '#0a0b10' })}<span>${d.sources.length} source${d.sources.length === 1 ? '' : 's'} · overcoffee.app</span></div></div></body></html>`;
}
