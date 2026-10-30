// Over Coffee — the reader app.
// Hash routes, plain DOM, no framework. Every screen answers one question:
// does this help the reader get to their newspaper?

import { api, nav } from './api.js';
import { renderNewspaper } from './render/newspaper.js';
import { renderStory, renderSource } from './render/story.js';
import { markSvg, wordmarkSvg } from './render/mark.js';
import { pageify, isPhone } from './pager.js';
import { esc, longDate, shortDate, hm, plural, numberWord, toneFor } from './render/util.js';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
let me = null;
let catalog = null;

// ── utilities ─────────────────────────────────────────────────────────────

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs || '') };
}

function go(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

function setNav(active) {
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
}

function setTone(mode) {
  document.body.classList.toggle('is-social', mode === 'social');
}

function render(html, { title } = {}) {
  document.body.classList.remove('has-pager');
  $app.innerHTML = html;
  document.title = title ? `${title} — Over Coffee` : 'Over Coffee';
}

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('is-on'), 2600);
}

function loading(text = 'Setting today’s edition…') {
  render(`<div class="loading"><div>${markSvg({ size: 44, cls: 'oc-mark--loop' })}${esc(text)}</div></div>`);
}

function failure(err) {
  render(`<div class="error">${markSvg({ size: 36 })}<h1>We couldn’t open this page.</h1><p>${esc(err.message || 'Something went wrong.')}</p><p><a class="textlink" href="#/">Back to today</a></p></div>`);
}

async function refreshMe() {
  me = await api.me();
  return me;
}

async function getCatalog() {
  if (!catalog) catalog = (await api.catalog()).topics;
  return catalog;
}

const topicLine = (topics) => topics.map((t) => esc(t.label)).join('<span class="dot">·</span>');

document.querySelector('.brand').innerHTML = `${markSvg({ size: 36 })}${wordmarkSvg({ height: 22, ink: 'var(--ink)' })}`;

// ── the morning ping: push · WhatsApp · email previews ───────────────────────

const waHtml = (t) => esc(t).replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/https?:\/\/\S+/g, '<a>overcoffee.app/today</a>');

function pingPreview(data, { channels = ['push', 'whatsapp', 'email'], time = '06:00' } = {}) {
  const h = data.hooks;
  const dateLine = new Date(data.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const col = {
    push: `<div class="ping__col"><h4>Push notification</h4><div class="phone"><div class="phone__time">${esc(time)}</div><div class="phone__date">${esc(dateLine)}</div><div class="notif"><div class="notif__top">${markSvg({ size: 18 })}<span>Over Coffee</span><span>now</span></div><div class="notif__title">${esc(h.push.title)}</div><div class="notif__body">${esc(h.push.body)}</div></div></div></div>`,
    whatsapp: `<div class="ping__col"><h4>WhatsApp</h4><div class="wa"><div class="wa__head">${markSvg({ size: 34 })}<div>Over Coffee<small>Business account</small></div></div><div class="wa__bubble">${waHtml(h.whatsapp.text)}<span class="wa__time">${esc(time)} ✓✓</span></div></div></div>`,
    email: `<div class="ping__col"><h4>Email</h4><div class="mail"><div class="mail__row">${markSvg({ size: 38 })}<div><div class="mail__from">Over Coffee</div><div class="mail__subject">${esc(h.email.subject)}</div><div class="mail__pre">${esc(h.email.preheader)}</div></div><span class="mail__time">${esc(time)}</span></div>${data.editionId ? `<div class="mail__foot"><a href="/email/${esc(data.editionId)}?mode=${data.mode}" target="_blank" rel="noopener">Open the full email →</a></div>` : ''}</div></div>`,
  };
  return `<div class="ping">${channels.map((c) => col[c]).join('')}</div>`;
}

async function testPush(h) {
  if (!('Notification' in window)) return toast('This browser can’t show notifications.');
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Notifications are blocked. Allow them in your browser to see a test.');
  new Notification(h.push.title, { body: h.push.body, icon: '/assets/app-icon.svg', tag: 'oc-test' });
  toast('Test notification sent.');
}

// Push and WhatsApp delivery are not wired up yet (see docs/LAUNCH.md), so only email is offered.
const CHANNELS = [['email', 'Email', 'A short briefing with a link, ready when you wake up']];

// ── sheet (bottom panel) ─────────────────────────────────────────────────

function openSheet(html, onMount) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('section');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = html;
  document.body.append(backdrop, sheet);
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    sheet.classList.add('is-open');
  });
  const close = () => {
    sheet.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 280);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    sheet.dispatchEvent(new Event('close'));
  };
  const onKey = (e) => e.key === 'Escape' && close();
  backdrop.addEventListener('click', close);
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  onMount?.(sheet, close);
  sheet.querySelector('button, input, a')?.focus({ preventScroll: true });
  return close;
}

// ── router ────────────────────────────────────────────────────────────────

const routes = {
  '': viewHome,
  welcome: viewWelcome,
  read: viewRead,
  story: viewStory,
  source: viewSource,
  topics: viewTopics,
  settings: viewSettings,
  download: viewDownload,
  compare: viewCompare,
  lab: viewCompare,
  library: viewLibrary,
  edition: viewEdition,
  embed: viewEmbed,
};

let authed = null; // null = unknown, false = logged out, object = user

const PUBLIC_ROOTS = ['compare', 'embed', 'lab'];
const isPreviewRoute = (parts) => ['read', 'story', 'source'].includes(parts[0]) && String(parts[1] || '').startsWith('preview-');

async function router() {
  nav.id++;
  const { parts, query } = parseHash();
  const view = routes[parts[0] || ''] || viewHome;
  if (authed === null) authed = (await api.authMe().catch(() => ({ user: null }))).user || false;
  if (!authed && !PUBLIC_ROOTS.includes(parts[0]) && !isPreviewRoute(parts)) {
    document.getElementById('topbar').hidden = true;
    return viewAuth(parts[0] === 'signup' ? 'signup' : 'login');
  }
  document.getElementById('topbar').hidden = parts[0] === 'embed';
  document.body.classList.toggle('is-embed', parts[0] === 'embed');
  try {
    if (authed && !me) await refreshMe();
    if (!me) me = { today: new Date().toISOString().slice(0, 10), profile: { onboarded: true, mode: 'business', delivery: {} }, stages: [] };
    const $pill = document.getElementById('datepill');
    if ($pill) $pill.textContent = shortDate(me.today);
    if (!me.profile.onboarded && !['welcome', 'compare', 'embed', 'story', 'source', 'read', 'edition'].includes(parts[0] || '')) return go('#/welcome');
    await view(parts.slice(1), query);
    if (!query.get('at')) window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    if (err.auth) {
      authed = false;
      me = null;
      return router();
    }
    console.error(err);
    failure(err);
  }
}

// ── ACCOUNT: landing, sign up, log in ──────────────────────────────────────

function viewAuth(mode = 'login') {
  setTone('business');
  const signup = mode === 'signup';
  render(
    `<section class="auth"><div class="auth__bg" aria-hidden="true"></div>
      <div class="auth__brand">${wordmarkSvg({ height: 34, ink: 'var(--ink)' })}</div>
      <div class="auth__grid">
        <div class="auth__pitch">
          <h1>Your own daily newspaper.<br><em>Finished in minutes.</em></h1>
          <p>Your own daily publication, thoughtfully prepared to help you understand what matters. Tell it what you care about. Each morning it reads the news, checks the sources, and gives you one short edition. When you reach the end, you are done.</p>
          <p class="auth__tag">A little perspective for your day.</p>
          <p class="auth__links"><a class="textlink" href="#/read/preview-multi-10?mode=business">See a sample newspaper</a><span>·</span><a class="textlink" href="#/lab">Newspaper lab</a></p>
        </div>
        <form class="auth__card" novalidate>
          <h2>${signup ? 'Create your account' : 'Welcome back'}</h2>
          <label>Email<input type="email" name="email" autocomplete="email" inputmode="email" required></label>
          <label>Password<input type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required><small>${signup ? 'At least 8 characters.' : ''}</small></label>
          <p class="auth__error" role="alert" hidden></p>
          <button class="btn btn--brand" type="submit">${signup ? 'Create account' : 'Log in'}</button>
          <p class="auth__switch">${signup ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/signup">Create an account</a>'}</p>
        </form></div>
      <div class="auth__how">
        <h2>How it works</h2>
        <ol><li><b>Say what you care about.</b> In your own words, from AI to farming to football. No questionnaire.</li><li><b>We prepare one edition.</b> Duplicate reports become one story, claims are checked against sources, and you get only what clears the bar.</li><li><b>You read it, and you’re done.</b> Swipe the pages, tap Learn more for the sources, and get on with your day.</li></ol>
        <div class="auth__eds"><div><b>Business</b><span>Concise, precise and calm. For people who need the facts fast.</span></div><div><b>Conversational</b><span>The same facts in simple, friendly words. A smart friend explaining it over coffee.</span></div></div>
        <p class="auth__small">Free while we’re in early access. Every story shows where it came from.</p>
      </div></section>`,
    { title: signup ? 'Create account' : 'Log in' },
  );
  const form = $app.querySelector('form');
  const $err = form.querySelector('.auth__error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    $err.hidden = true;
    try {
      const f = new FormData(form);
      const r = await (signup ? api.signup(f.get('email'), f.get('password')) : api.login(f.get('email'), f.get('password')));
      authed = r.user;
      me = null;
      api.forget();
      go('#/');
    } catch (err) {
      $err.textContent = err.message;
      $err.hidden = false;
      btn.disabled = false;
    }
  });
}

async function logout() {
  await api.logout().catch(() => {});
  navigator.serviceWorker?.controller?.postMessage('clear');
  authed = false;
  me = null;
  catalog = null;
  api.forget();
  go('#/login');
}

window.addEventListener('hashchange', router);
router();

// ── HOME: the entrance to the publication ──────────────────────────────────

const staleBanner = (ed) => (ed.stale ? `<div class="stale-banner" role="status"><b>Today’s edition couldn’t be prepared.</b> You’re reading your latest edition, from ${esc(longDate(ed.editorialDate))}. We’ll keep trying.</div>` : '');

async function viewHome() {
  setNav('today');
  setTone('business');
  loading();
  const ed = await api.today();
  const m = me.profile.mode;
  const n = ed.stories.length;
  const minutes = ed.stats.readingMinutes[m];
  const override = me.override;
  const peek = [...ed.stories].sort((a, b) => a.rank - b.rank).slice(0, 4);
  render(
    `<section class="home"><div class="home__bg" aria-hidden="true"></div><div class="home__grid">
      <div class="home__main">
        ${ed.sample ? `<div class="sample-banner"><strong>Design prototype — sample edition</strong><span>Fictional organisations, people and figures. Not current news.</span></div>` : ''}
        ${staleBanner(ed)}
        <span class="eyebrow-pill"><i class="live"></i>${esc(longDate(ed.editorialDate))} · your ${minutes}-minute edition</span>
        <h1>Good morning.<br><em>Here’s what matters.</em></h1>
        ${override ? `<p class="home__override">${override.reason === 'adventurous' ? 'Feeling adventurous today' : override.reason === 'random' ? 'A random topic, just for today' : 'Changed for today only'}${override.path ? ` — ${esc(override.path.join(' → '))}` : ''}</p>` : ''}
        <p class="home__sub">${n ? `<b>${numberWord(n)} ${n === 1 ? 'thing' : 'things'}</b> worth knowing today across ${ed.topics.map((t) => esc(t.label)).join(', ')}.` : 'A quiet morning. Nothing cleared the bar.'}</p>
        <div class="home__actions">
          <a class="btn btn--brand" href="#/read/${esc(ed.id)}?mode=${m}">Read today’s newspaper →</a>
          <button class="btn btn--ghost" type="button" data-listen>▶ Listen · ${Math.max(1, Math.round(ed.audio[m].seconds / 60))} min</button>
        </div>
        <p class="home__meta">Prepared ${hm(ed.generatedAt)} · ${ed.stats.sourcesReviewed} sources reviewed · quality-checked</p>
        <div class="home__more">
          <button class="textlink" type="button" data-change>Change today’s paper</button>
          ${override ? `<button class="textlink" type="button" data-reset-today>Back to my usual topics</button>` : ''}
          <a class="textlink" href="#/library">Library: saved stories and past editions</a>
        </div>
      </div>
      ${n ? `<aside class="peek" aria-label="Today at a glance">
        <div class="peek__head"><span>Today at a glance</span><span class="pill">${minutes} min</span></div>
        <ol class="peek__list">${peek.map((s, i) => `<li class="tone-${toneFor(s.topicId)}"><span class="peek__n">${i + 1}</span><span>${esc(s.copy[m].summaryLine || s.copy[m].headline)}</span></li>`).join('')}</ol>
        <div class="peek__foot"><div><b>${ed.stats.sourcesReviewed}</b><span>sources</span></div><div><b>${ed.stats.considered}</b><span>developments</span></div><div><b>${n}</b><span>stories</span></div><div><b>${minutes}</b><span>minutes</span></div></div>
      </aside>` : ''}
    </div></section>`,
    { title: 'Today' },
  );
  $app.querySelector('[data-listen]').addEventListener('click', () => openListen(ed, m));
  $app.querySelector('[data-change]').addEventListener('click', () => openChangeToday());
  $app.querySelector('[data-reset-today]')?.addEventListener('click', async () => {
    await api.changeToday({ topicIds: [] });
    await refreshMe();
    toast('Back to your usual topics.');
    router();
  });
}

// ── CHANGE TODAY'S PAPER (daily topics, random, adventurous) ────────────────

async function openChangeToday() {
  const cat = await getCatalog();
  const selected = new Set(me.todayTopics.map((t) => t.id));
  let reason = 'changed';
  let path = null;
  const extra = me.todayTopics.filter((t) => !cat.some((c) => c.id === t.id));
  const chips = () =>
    [...cat, ...extra]
      .map((t) => `<button class="chip" type="button" data-topic="${esc(t.id)}" aria-pressed="${selected.has(t.id)}">${esc(t.label)}</button>`)
      .join('');
  openSheet(
    `<div class="sheet__head"><h2 class="sheet__title">Change today’s paper</h2><button class="sheet__close" data-close>Close</button></div>
    <p class="sheet__note">Just for today. Your usual topics stay as they are unless you say otherwise.</p>
    <div class="chips" data-chips>${chips()}</div>
    <div class="discover">
      <button type="button" data-random><h3>Random topic</h3><p>Something you don’t usually follow, picked from today’s research.</p></button>
      <button type="button" data-adventure><h3>Feeling adventurous</h3><p>One step beyond your interests — close enough to matter.</p></button>
    </div>
    <p class="discover__result" data-result></p>
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-top:18px">
      <label style="font:500 14px var(--sans);display:flex;gap:8px;align-items:center"><input type="checkbox" data-keep> Keep these as my topics</label>
      <button class="btn" type="button" data-make>Make today’s paper</button>
    </div>`,
    (sheet, close) => {
      const $chips = sheet.querySelector('[data-chips]');
      const $result = sheet.querySelector('[data-result]');
      const bind = () =>
        $chips.querySelectorAll('[data-topic]').forEach((b) =>
          b.addEventListener('click', () => {
            const id = b.dataset.topic;
            selected.has(id) ? selected.delete(id) : selected.add(id);
            b.setAttribute('aria-pressed', selected.has(id));
            reason = 'changed';
            path = null;
          }),
        );
      bind();
      const pick = (topic) => {
        selected.add(topic.id);
        const b = $chips.querySelector(`[data-topic="${CSS.escape(topic.id)}"]`);
        b?.setAttribute('aria-pressed', 'true');
        b?.scrollIntoView({ block: 'nearest' });
      };
      sheet.querySelector('[data-random]').addEventListener('click', async () => {
        const { topic } = await api.random();
        if (!topic) return ($result.textContent = 'Nothing new to suggest today.');
        pick(topic);
        reason = 'random';
        path = null;
        $result.innerHTML = `Today, try <b>${esc(topic.label)}</b> — ${esc(topic.expansion.slice(0, 3).join(', ').toLowerCase())}.`;
      });
      sheet.querySelector('[data-adventure]').addEventListener('click', async () => {
        const r = await api.adventurous();
        if (!r.topic) return ($result.textContent = 'Nothing adjacent to explore today.');
        pick(r.topic);
        reason = 'adventurous';
        path = r.path;
        $result.innerHTML = `<span class="path">${r.path.map(esc).join(' → ')}</span><br>From what you already follow to <b>${esc(r.topic.label)}</b>.`;
      });
      sheet.querySelector('[data-make]').addEventListener('click', async (e) => {
        if (!selected.size) return toast('Pick at least one topic.');
        e.currentTarget.disabled = true;
        const keep = sheet.querySelector('[data-keep]').checked;
        const { editionId } = await api.changeToday({ topicIds: [...selected], reason, path, keep });
        api.forget();
        await refreshMe();
        close();
        toast(keep ? 'Saved as your topics.' : 'Changed for today only.');
        go(`#/read/${editionId}?mode=${me.profile.mode}`);
      });
    },
  );
}

// ── LISTEN ────────────────────────────────────────────────────────────────

async function openListen(ed, mode) {
  const audio = await api.audio(ed.id, mode);
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let index = 0;
  let playing = false;
  const playIcon = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3l11 7-11 7z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="3" width="4" height="14" fill="currentColor"/><rect x="12" y="3" width="4" height="14" fill="currentColor"/></svg>';
  openSheet(
    `<div class="sheet__head"><h2 class="sheet__title">Listen</h2><button class="sheet__close" data-close>Close</button></div>
    <p class="sheet__note">The short version, read aloud — for the drive, the walk or the kitchen.</p>
    <div class="player">
      <div class="player__controls">
        <button class="player__play" type="button" data-play aria-label="Play">${playIcon}</button>
        <div class="player__meta"><b>${esc(longDate(ed.editorialDate))}</b>About ${Math.max(1, Math.round(audio.seconds / 60))} minute${audio.seconds > 90 ? 's' : ''} · ${mode === 'social' ? 'Conversational' : 'Business'} voice${synth ? '' : ' · Your browser can’t speak; here’s the transcript'}</div>
      </div>
      <ol class="transcript">${audio.segments.map((s, i) => `<li data-seg="${i}">${esc(s.text)}</li>`).join('')}</ol>
    </div>`,
    (sheet) => {
      const $play = sheet.querySelector('[data-play]');
      const mark = () => sheet.querySelectorAll('[data-seg]').forEach((li) => li.classList.toggle('is-now', Number(li.dataset.seg) === index && playing));
      const speakFrom = (i) => {
        if (!synth) return;
        index = i;
        if (i >= audio.segments.length) {
          playing = false;
          index = 0;
          $play.innerHTML = playIcon;
          return mark();
        }
        const u = new SpeechSynthesisUtterance(audio.segments[i].text);
        u.lang = 'en-GB';
        u.rate = 1.02;
        u.onend = () => playing && speakFrom(i + 1);
        synth.speak(u);
        mark();
        sheet.querySelector(`[data-seg="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };
      $play.addEventListener('click', () => {
        if (!synth) return;
        if (playing) {
          playing = false;
          synth.cancel();
          $play.innerHTML = playIcon;
          $play.setAttribute('aria-label', 'Play');
          mark();
        } else {
          playing = true;
          $play.innerHTML = pauseIcon;
          $play.setAttribute('aria-label', 'Pause');
          speakFrom(index);
        }
      });
      sheet.addEventListener('close', () => synth?.cancel());
    },
  );
}

// ── READ: the newspaper ─────────────────────────────────────────────────────

async function viewRead([id = 'today'], query) {
  setNav(id === 'today' ? 'today' : '');
  loading('Opening the edition…');
  const ed = await api.edition(id);
  const mode = query.get('mode') === 'social' ? 'social' : query.get('mode') === 'business' ? 'business' : me.profile.mode;
  setTone(mode);
  const isDaily = ed.kind === 'daily';
  const href = (m) => `#/read/${esc(ed.id)}?mode=${m}`;
  render(
    `<div class="readbar">
      <div class="readbar__left">
        <div class="seg" role="group" aria-label="Presentation"><a href="${href('business')}" aria-current="${mode === 'business'}">Business</a><a href="${href('social')}" aria-current="${mode === 'social'}">Conversational</a></div>
        <span class="readbar__note">Same edition, ${mode === 'social' ? 'friendlier voice' : 'professional voice'}.</span>
      </div>
      <div class="readbar__right">
        <button class="tool" type="button" data-listen>▶ Listen</button>
        <a class="tool" href="/api/editions/${esc(ed.id)}/pdf?mode=${mode}" target="_blank" rel="noopener">PDF</a>
        <a class="tool" href="#/edition/${esc(ed.id)}?mode=${mode}">How it was made</a>
        ${isDaily ? '<button class="tool" type="button" data-change>Change today</button>' : ''}
      </div>
    </div>
    ${staleBanner(ed)}${renderNewspaper(ed, mode, { saved: new Set(me.savedKeys || []), sponsored: id === 'today' && !ed.stale ? api.sponsored : null })}`,
    { title: longDate(ed.editorialDate) },
  );
  $app.querySelector('[data-listen]').addEventListener('click', () => openListen(ed, mode));
  $app.querySelector('[data-change]')?.addEventListener('click', () => openChangeToday());
  wirePaper($app, ed);
  if (isDaily) api.track('edition_opened', { mode });
  if (id === 'today' && api.sponsored && !ed.stale) api.track('ad_impression', { id: api.sponsored.id });
  const at = query.get('at');
  const paged = pageify($app, { edId: ed.id, mode, at, onComplete: () => isDaily && api.track('edition_completed', { mode }) });
  if (!paged && at) requestAnimationFrame(() => document.getElementById(at)?.scrollIntoView({ block: 'start' }));
}

// Crossing the phone breakpoint switches between paged and scrolling layouts.
window.matchMedia('(max-width: 760px)').addEventListener('change', () => location.hash.startsWith('#/read') && router());

function wirePaper(root) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('.save');
    if (!b) return;
    e.preventDefault();
    const [edId, stId] = b.dataset.save.split('/');
    const on = b.getAttribute('aria-pressed') !== 'true';
    try {
      await (on ? api.save(edId, stId) : api.unsave(edId, stId));
      me.savedKeys = on ? [...(me.savedKeys || []), b.dataset.save] : (me.savedKeys || []).filter((k) => k !== b.dataset.save);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', on ? 'Saved' : 'Save this story');
      b.querySelector('path')?.setAttribute('fill', on ? 'currentColor' : 'none');
      toast(on ? 'Saved to your library.' : 'Removed from your library.');
    } catch (err) { toast(err.message); }
  });
  root.querySelectorAll('[data-jump]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }),
  );
  root.querySelectorAll('.s-q').forEach((q) => {
    q.querySelectorAll('.s-q__opt').forEach((b) =>
      b.addEventListener('click', () => {
        if (q.dataset.done) return;
        q.dataset.done = '1';
        const right = Number(q.dataset.answer);
        const chosen = Number(b.dataset.opt);
        q.querySelectorAll('.s-q__opt').forEach((o) => {
          if (Number(o.dataset.opt) === right) o.classList.add('is-right');
          else if (o === b) o.classList.add('is-wrong');
          o.disabled = true;
        });
        q.querySelector('.s-q__result').textContent = chosen === right ? 'Nice — you were paying attention.' : 'Not quite. It’s in today’s edition.';
      }),
    );
  });
}

// ── STORY & SOURCE (depth layer) ────────────────────────────────────────────

async function viewStory([edId, storyId], query) {
  setNav('');
  const ed = await api.edition(edId);
  if (!String(edId).startsWith('preview-')) api.track('learn_more_opened');
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  setTone(mode);
  const html = renderStory(ed, storyId, mode);
  if (!html) throw new Error('That story isn’t in this edition.');
  const st = ed.stories.find((s) => s.id === storyId);
  render(html, { title: st.copy[mode].headline });
  wireStoryActions(edId, storyId, mode);
  if (location.hash.includes('#sources')) document.getElementById('sources')?.scrollIntoView();
}

/** Save, share and relevance feedback on the story page. */
function wireStoryActions(edId, storyId, mode) {
  const box = $app.querySelector('[data-actions]');
  if (!box) return;
  const key = `${edId}/${storyId}`;
  const $save = box.querySelector('[data-act="save"]');
  const paintSave = (on) => { $save.setAttribute('aria-pressed', on); $save.textContent = on ? 'Saved ✓' : 'Save'; };
  paintSave((me.savedKeys || []).includes(key));
  $save.addEventListener('click', async () => {
    const on = $save.getAttribute('aria-pressed') !== 'true';
    try {
      await (on ? api.save(edId, storyId) : api.unsave(edId, storyId));
      me.savedKeys = on ? [...(me.savedKeys || []), key] : (me.savedKeys || []).filter((k) => k !== key);
      paintSave(on);
      toast(on ? 'Saved to your library.' : 'Removed from your library.');
    } catch (e) { toast(e.message); }
  });
  box.querySelector('[data-act="share"]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('is-loading');
    try {
      const r = await api.share(edId, storyId);
      if (navigator.share) await navigator.share({ title: r.title, url: r.url }).catch(() => {});
      else { await navigator.clipboard.writeText(r.url); toast('Link copied. It shows this story and its sources only.'); }
    } catch (err) { toast(err.message); }
    btn.classList.remove('is-loading');
  });
  const fb = box.querySelectorAll('[data-act="more"], [data-act="less"]');
  fb.forEach((b) => b.addEventListener('click', async () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    fb.forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', on);
    try { await api.feedback(edId, storyId, on ? b.dataset.act : 'clear'); toast(on ? 'Thanks. Future editions will take that into account.' : 'Feedback removed.'); } catch (e) { toast(e.message); }
  }));
}

async function viewSource([edId, sourceId], query) {
  setNav('');
  const ed = await api.edition(edId);
  if (!String(edId).startsWith('preview-')) api.track('source_opened');
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  setTone(mode);
  const html = renderSource(ed, sourceId, { mode, from: query.get('from') });
  if (!html) throw new Error('That source isn’t in this edition.');
  render(html, { title: 'Source' });
}

// ── ONBOARDING ──────────────────────────────────────────────────────────────

const ob = { step: 1, topics: [], budget: 5, mode: 'business', time: '06:00', channels: ['email'], whatsapp: '', focus: {} };
const SUGGEST = ['AI', 'Technology', 'Farming', 'Food', 'South Africa', 'Business', 'Renewable energy', 'Finance', 'Climate', 'Manufacturing', 'Football', 'Photography', 'Cars'];

async function viewWelcome(_, query) {
  setNav('');
  setTone(ob.mode);
  ob.step = Number(query.get('step')) || 1;
  if (ob.step > 1 && !ob.topics.length) ob.step = 1;
  const total = 5;
  const progress = `<div class="ob__progress"><span>${ob.step < total ? `Step ${ob.step} of ${total - 1}` : 'Your first edition'}</span><div class="ob__bar">${Array.from({ length: total }, (_, i) => `<span class="${i < ob.step ? 'is-on' : ''}"></span>`).join('')}</div></div>`;
  const nav = (back, next, nextLabel = 'Continue') =>
    `<div class="ob__nav">${back ? `<a class="textlink" href="#/welcome?step=${ob.step - 1}">Back</a>` : `<button class="textlink" type="button" data-skip>Skip — show me a sample edition</button>`}${next ? `<button class="btn" type="button" data-next>${nextLabel}</button>` : '<span></span>'}</div>`;

  if (ob.step === 1) {
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">What do you want to <em>know about?</em></h1>
        <p class="ob__hint">Write it the way you’d say it. Broad is fine — we’ll work out the details.</p>
        <form class="ob__input" data-form><input data-input placeholder="e.g. artificial intelligence, farming, South Africa" autocomplete="off" aria-label="Add a topic"><button type="submit">Add</button></form>
        <div class="ob__chosen"><div class="chips" data-chosen></div><div class="areas" data-areas hidden></div></div>
        <p class="ob__suggest-h">Or start with</p>
        <div class="chips" data-suggest></div>
      </div>${nav(false, true)}</div>`,
      { title: 'Welcome' },
    );
    const $chosen = $app.querySelector('[data-chosen]');
    const $areas = $app.querySelector('[data-areas]');
    const $suggest = $app.querySelector('[data-suggest]');
    const $next = $app.querySelector('[data-next]');
    const paint = (last) => {
      $chosen.innerHTML = ob.topics.map((t) => `<button class="chip" type="button" aria-pressed="true" data-remove="${esc(t.id)}">${esc(t.label)} <span class="chip__x" aria-label="Remove">×</span></button>`).join('');
      $suggest.innerHTML = SUGGEST.filter((s) => !ob.topics.some((t) => t.label.toLowerCase() === s.toLowerCase())).map((s) => `<button class="chip chip--dim" type="button" data-add="${esc(s)}">+ ${esc(s)}</button>`).join('');
      paintAreas(last || ob.topics.at(-1));
      $next.disabled = !ob.topics.length;
      $chosen.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => ((ob.topics = ob.topics.filter((x) => x.id !== b.dataset.remove)), paint())));
      $suggest.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(b.dataset.add)));
    };
    // Suggested areas inside a topic: pick any, add your own, or just follow the broad topic.
    const paintAreas = (t) => {
      if (!t) { $areas.hidden = true; return; }
      const all = t.areas || t.expansion;
      const picked = (ob.focus[t.id] ||= all.slice(0, 6));
      $areas.hidden = false;
      $areas.innerHTML = `<div class="areas__head"><b>${esc(t.label)}</b><span>${t.loading ? 'Finding the useful areas…' : 'Which areas matter to you? Leave all on, or follow just the broad topic.'}</span></div>
        <div class="chips">${all.map((a) => `<button type="button" class="chip" data-area="${esc(a)}" aria-pressed="${picked.includes(a)}">${esc(a)}</button>`).join('')}</div>
        <div class="areas__tools"><button type="button" class="textlink" data-areas-all>Select all</button><button type="button" class="textlink" data-areas-none>Broad topic only</button><form data-area-form><input placeholder="Add an area" maxlength="40" aria-label="Add an area"><button type="submit">Add</button></form></div>`;
      const save = () => { ob.focus[t.id] = [...$areas.querySelectorAll('[data-area][aria-pressed="true"]')].map((b) => b.dataset.area); };
      $areas.querySelectorAll('[data-area]').forEach((b) => b.addEventListener('click', () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); save(); }));
      $areas.querySelector('[data-areas-all]').addEventListener('click', () => { ob.focus[t.id] = all.slice(); paintAreas(t); });
      $areas.querySelector('[data-areas-none]').addEventListener('click', () => { ob.focus[t.id] = []; paintAreas(t); });
      $areas.querySelector('[data-area-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = e.target.querySelector('input').value.trim().slice(0, 40);
        if (v && !all.includes(v)) { t.areas = [...all, v]; ob.focus[t.id] = [...(ob.focus[t.id] || []), v]; }
        paintAreas(t);
      });
    };
    const add = async (text) => {
      for (const part of String(text).split(/,|\band\b/).map((s) => s.trim()).filter(Boolean)) {
        const { topic } = await api.interpret(part);
        if (topic && !ob.topics.some((t) => t.id === topic.id)) {
          ob.topics.push(topic);
          // Ask the topic engine for genuinely useful areas (model when available).
          topic.loading = true;
          paint(topic);
          api.suggest(part).then((r) => { if (r.areas?.length) { topic.areas = r.areas; delete ob.focus[topic.id]; } }).catch(() => {}).finally(() => { topic.loading = false; paint(topic); });
        }
      }
      paint();
    };
    $app.querySelector('[data-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $app.querySelector('[data-input]');
      if (input.value.trim()) add(input.value);
      input.value = '';
    });
    $next.addEventListener('click', () => go('#/welcome?step=2'));
    $app.querySelector('[data-skip]').addEventListener('click', async () => {
      await api.saveProfile({ onboarded: true });
      await refreshMe();
      go('#/');
    });
    paint();
    $app.querySelector('[data-input]').focus();
    return;
  }

  if (ob.step === 2) {
    const opts = [
      [3, 'The headlines', 'Just the biggest stories, in a few lines each. Done before your coffee cools.'],
      [5, 'The essentials', 'Only what is genuinely worth five minutes. On a quiet day, less.'],
      [10, 'The full picture', 'The day’s important developments, with context where it helps.'],
    ];
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">How much <em>time</em> do you have?</h1>
        <p class="ob__hint">This is a reading budget, not a story count. If today only needs four minutes, you get four.</p>
        <div class="choices">${opts.map(([m, t, d]) => `<button class="choice" type="button" data-budget="${m}" aria-pressed="${ob.budget === m}"><span class="choice__big">${m}<small>min</small></span><span><p class="choice__title">${t}</p><p class="choice__desc">${d}</p></span></button>`).join('')}</div>
      </div>${nav(true, true)}</div>`,
      { title: 'Welcome' },
    );
    $app.querySelectorAll('[data-budget]').forEach((b) =>
      b.addEventListener('click', () => {
        ob.budget = Number(b.dataset.budget);
        $app.querySelectorAll('[data-budget]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      }),
    );
    $app.querySelector('[data-next]').addEventListener('click', () => go('#/welcome?step=3'));
    return;
  }

  if (ob.step === 3) {
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">How should it <em>sound?</em></h1>
        <p class="ob__hint">Examples below are illustrative. The same facts, sources and caveats either way. Only the voice changes — and you can switch any morning.</p>
        <div class="modes">
          <button class="mode-card" type="button" data-mode="business" aria-pressed="${ob.mode === 'business'}">
            <div class="mode-card__sample mode-card__sample--b"><span class="k">Harvest outlook</span><h4>A dry September cuts the wheat forecast by 7%</h4><p>The National Grain Council now expects 24.6 million tonnes. Millers and bakers are watching.</p></div>
            <div class="mode-card__label"><b>Business</b><span>Concise, precise and calm. For people who need the facts fast.</span></div>
          </button>
          <button class="mode-card" type="button" data-mode="social" aria-pressed="${ob.mode === 'social'}">
            <div class="mode-card__sample mode-card__sample--s"><span class="k">The big one today</span><h4>A dry September just shrank the wheat harvest</h4><p>Bakers say it could reach your bread. Slowly.</p></div>
            <div class="mode-card__label"><b>Conversational</b><span>Simple words, big energy, like a friend with the tea. Just as accurate.</span></div>
          </button>
        </div>
      </div>${nav(true, true)}</div>`,
      { title: 'Welcome' },
    );
    $app.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => {
        ob.mode = b.dataset.mode;
        setTone(ob.mode);
        $app.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      }),
    );
    $app.querySelector('[data-next]').addEventListener('click', () => go('#/welcome?step=4'));
    return;
  }

  if (ob.step === 4) {
    const sample = await api.sampleHooks(ob.mode);
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">When should it <em>arrive?</em></h1>
        <p class="ob__hint">Pick a time, and how you’d like a nudge when it’s ready. This is what your morning ping looks like.</p>
        <div class="fields" style="max-width:none;margin-bottom:28px"><div class="field"><label for="ob-time">Ready by</label><input id="ob-time" type="time" value="${esc(ob.time)}" data-time></div></div>
        <div class="channel-pick">${CHANNELS.map(([v, t, d]) => `<button type="button" class="channel" data-chan="${v}" aria-pressed="${ob.channels.includes(v)}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>${me.email && !me.email.live ? '<p class="ping-note"><b>Heads up:</b> morning emails are still in testing and may not reach everyone yet. Your edition is always waiting in the app.</p>' : ''}
        <div data-ping></div>
        <div class="field" data-wa hidden style="margin-top:22px"><label for="ob-wa">Your WhatsApp number</label><input id="ob-wa" type="tel" inputmode="tel" placeholder="+27 82 123 4567" value="${esc(ob.whatsapp)}" data-wa-input></div>
      </div>${nav(true, true, 'Make my first newspaper')}</div>`,
      { title: 'Welcome' },
    );
    const $ping = $app.querySelector('[data-ping]');
    const paint = () => {
      $ping.innerHTML = ob.channels.length
        ? pingPreview({ ...sample, editionId: null }, { channels: CHANNELS.map((c) => c[0]).filter((c) => ob.channels.includes(c)), time: ob.time }) + `<p class="ping-note"><b>Sample preview.</b> Every ping teases a real story from your edition, and the edition answers it. A quiet morning gets a quiet ping.</p>`
        : `<p class="ping-note">No pings: your newspaper will simply be waiting here at ${esc(ob.time)}.</p>`;
      $app.querySelector('[data-wa]').hidden = !ob.channels.includes('whatsapp');
    };
    paint();
    $app.querySelector('[data-time]').addEventListener('change', (e) => ((ob.time = e.target.value || '06:00'), paint()));
    $app.querySelector('[data-wa-input]').addEventListener('input', (e) => (ob.whatsapp = e.target.value));
    $app.querySelectorAll('[data-chan]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = b.dataset.chan;
        ob.channels = ob.channels.includes(c) ? ob.channels.filter((x) => x !== c) : [...ob.channels, c];
        b.setAttribute('aria-pressed', ob.channels.includes(c));
        paint();
      }),
    );
    $app.querySelector('[data-next]').addEventListener('click', () => go('#/welcome?step=5'));
    return;
  }

  // Step 5 — generate the first edition, showing the engine's real stage log.
  render(
    `<div class="ob">${progress}<div class="ob__body gen">
      ${markSvg({ size: 64, animate: true })}
      <h2 class="gen__title">Setting your first edition.</h2>
      <p class="gen__sub">${topicLine(ob.topics)}</p>
      <div class="gen__bar"><span data-bar></span></div>
      <p class="gen__wait">Your first edition takes about a minute: we’re reading the news, checking it and writing it up. Keep this page open.</p>
      <ol class="stages">${me.stages.map((s) => `<li data-stage="${s.key}"><span class="stages__n">${s.number}</span><span>${esc(s.label)}</span><span class="stages__note"></span></li>`).join('')}</ol>
    </div><div></div></div>`,
    { title: 'Your first edition' },
  );
  await api.saveProfile({
    onboarded: true,
    topics: ob.topics.map((t) => t.id),
    budgetMinutes: ob.budget,
    mode: ob.mode,
    delivery: { time: ob.time, channels: ob.channels, whatsapp: ob.whatsapp },
    focus: ob.focus,
  });
  api.forget();
  await refreshMe();
  // Keep the bar moving while the server works (it eases towards 90% and never claims to be done).
  let pct = 4;
  const tick = setInterval(() => { pct += (90 - pct) * 0.04; const bar = $app.querySelector('[data-bar]'); if (bar) bar.style.width = `${pct.toFixed(1)}%`; }, 1000);
  let ed;
  try {
    ed = await api.today();
  } catch (err) {
    clearInterval(tick);
    $app.querySelector('.gen__wait').innerHTML = `${esc(err.message)} <a class="textlink" href="#/">Go to Today</a>`;
    return;
  } finally {
    clearInterval(tick);
  }
  const items = [...$app.querySelectorAll('[data-stage]')];
  for (const [i, entry] of ed.pipeline.entries()) {
    const li = items.find((x) => x.dataset.stage === entry.stage);
    items.forEach((x) => x.classList.remove('is-now'));
    if (li) {
      li.classList.add('is-done', 'is-now');
      li.querySelector('.stages__note').textContent = entry.note || '';
    }
    $app.querySelector('[data-bar]').style.width = `${Math.round(((i + 1) / ed.pipeline.length) * 100)}%`;
    await new Promise((r) => setTimeout(r, i < 3 ? 160 : 230));
  }
  await new Promise((r) => setTimeout(r, 500));
  go(`#/read/${ed.id}?mode=${me.profile.mode}`);
}

// ── MY TOPICS ───────────────────────────────────────────────────────────────

async function viewTopics() {
  setNav('topics');
  setTone('business');
  const cat = await getCatalog();
  const followed = me.profileTopics;
  const followedIds = new Set(followed.map((t) => t.id));
  render(
    `<div class="page">
      <p class="eyebrow">My topics</p>
      <h1>What you follow</h1>
      <p class="lede">Broad interests are fine. The editor expands each one into the areas worth watching, and decides each morning what deserves space.</p>

      <section class="block">
        <ul class="topic-list">${followed
          .map(
            (t) => `<li class="topic-row"><div><h3>${esc(t.label)}${t.custom ? '<span class="tag">New topic</span>' : ''}</h3><p>${esc(t.expansion.join(' · '))}</p></div><button class="textlink" type="button" data-remove="${esc(t.id)}">Remove</button></li>`,
          )
          .join('')}</ul>
        <form class="add-row" data-add><input placeholder="Add a topic — anything you want to know about" aria-label="Add a topic"><button type="submit">Add</button></form>
      </section>

      <section class="block">
        <h2 class="block__h">Just for today</h2>
        <p class="block__note">Change what you read this morning without touching your usual topics — or let the editor surprise you.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn btn--small" type="button" data-change>Change today’s paper</button>${me.override ? '<button class="btn btn--small btn--ghost" type="button" data-reset-today>Back to my usual topics</button>' : ''}</div>
      </section>

      <section class="block">
        <h2 class="block__h">Explore topics</h2>
        <p class="block__note"><i class="avail"></i> Material in today’s research.</p>
        <div class="catalog">${cat
          .map((t) => `<button type="button" data-follow="${esc(t.id)}" ${followedIds.has(t.id) ? 'disabled' : ''}><h4>${esc(t.label)}${t.hasMaterial ? ' <i class="avail" title="Material in today’s research"></i>' : ''}</h4><p>${followedIds.has(t.id) ? 'Following' : esc(t.expansion.slice(0, 3).join(', '))}</p></button>`)
          .join('')}</div>
      </section>
    </div>`,
    { title: 'My topics' },
  );
  const save = async (ids, msg) => {
    if (!ids.length) return toast('Keep at least one topic.');
    await api.saveProfile({ topics: ids });
    api.forget();
    await refreshMe();
    toast(msg);
    if (location.hash.startsWith('#/topics')) viewTopics(); // never repaint a page the reader has left
  };
  $app.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => save(me.profile.topics.filter((id) => id !== b.dataset.remove), 'Removed. Tomorrow’s edition will reflect it.')));
  $app.querySelectorAll('[data-follow]').forEach((b) => b.addEventListener('click', () => save([...me.profile.topics, b.dataset.follow], 'Added.')));
  $app.querySelector('[data-add]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input');
    if (!input.value.trim()) return;
    const { topic } = await api.interpret(input.value);
    if (me.profile.topics.includes(topic.id)) return toast(`You already follow ${topic.label}.`);
    save([...me.profile.topics, topic.id], `Added ${topic.label}.`);
  });
  $app.querySelector('[data-change]').addEventListener('click', () => openChangeToday());
  $app.querySelector('[data-reset-today]')?.addEventListener('click', async () => {
    await api.changeToday({ topicIds: [] });
    api.forget();
    await refreshMe();
    toast('Back to your usual topics.');
    if (location.hash.startsWith('#/topics')) viewTopics();
  });
}

// ── SETTINGS ────────────────────────────────────────────────────────────────

async function viewSettings() {
  setNav('settings');
  setTone('business');
  const p = me.profile;
  const sample = await api.sampleHooks(p.mode);
  const chans = p.delivery.channels || [];
  const seg = (key, options, value) =>
    `<div class="seg" role="group">${options.map(([v, l]) => `<button type="button" data-set="${key}" data-value="${esc(v)}" aria-pressed="${String(value) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
  const row = (title, note, control) => `<div class="setting"><div class="setting__label"><h3>${title}</h3><p>${note}</p></div><div>${control}</div></div>`;
  render(
    `<div class="page">
      <p class="eyebrow">Settings</p>
      <h1>Let the editor <em class="grad-text" style="font-family:var(--accent-serif);font-weight:400">decide.</em></h1>
      <p class="lede">A few choices are yours. The rest — what matters, how much, in what order — is the editor’s job.</p>
      <section class="panel">
        ${row('Reading time', 'A budget, not a quota.', seg('budgetMinutes', [[3, '3 min'], [5, '5 min'], [10, '10 min']], p.budgetMinutes))}
        ${row('Voice', 'Business or Conversational. Switching never re-researches your edition.', seg('mode', [['business', 'Business'], ['social', 'Conversational']], p.mode))}
        ${row('Discovery', 'How often the editor brings in something adjacent to your interests.', seg('discovery', [['off', 'Never'], ['occasionally', 'Now and then'], ['often', 'Often']], p.discovery))}
        ${row('PDF', 'Paper size for printing.', seg('pdf.paper', [['A4', 'A4'], ['Letter', 'Letter']], p.pdf?.paper || 'A4'))}
        ${row('Audio summary', 'A short spoken version of each edition.', seg('audio.enabled', [[true, 'On'], [false, 'Off']], p.audio?.enabled !== false))}
      </section>

      <h2 class="block__h" style="margin-top:44px">Your morning ping</h2>
      <p class="block__note">When your edition is ready, we nudge you with a teaser of a real story. Pick where. You can also just open the paper.</p>
      <section class="panel">
        ${row('Ready by', 'Your edition is prepared by this time each morning.', `<div class="field"><input type="time" value="${esc(p.delivery.time)}" data-time></div>`)}
        ${row('Send a ping to', me.email && !me.email.live ? 'Morning emails are still in testing and may not reach everyone yet. Your edition is always in the app.' : 'A short email when your edition is ready.', `<div class="seg" role="group" data-chans>${CHANNELS.map(([v, t]) => `<button type="button" data-chan="${v}" aria-pressed="${chans.includes(v)}">${t}</button>`).join('')}</div>`)}
        <div class="setting" data-wa ${chans.includes('whatsapp') ? '' : 'hidden'}><div class="setting__label"><h3>WhatsApp number</h3><p>Only used to message you your edition.</p></div><div class="field"><input type="tel" inputmode="tel" placeholder="+27 82 123 4567" value="${esc(p.delivery.whatsapp || '')}" data-wa-input></div></div>
      </section>
      <div data-ping>${pingPreview(sample, { channels: ['push', 'whatsapp', 'email'], time: p.delivery.time })}</div>
      <p class="ping-note"><b>Sample preview in your ${p.mode} voice.</b> Every ping teases a real story, and the edition answers it. No fake urgency, no numbers we can’t source. A quiet morning gets a quiet ping.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
        <button class="btn btn--small" type="button" data-test-push>Send me a test notification</button>
        <button class="btn btn--small btn--ghost" type="button" data-deliver>Prepare today’s ping files</button>
      </div>

      <h2 class="block__h" style="margin-top:44px">Notifications and privacy</h2>
      <section class="panel">
        ${row('Time zone', 'Your edition is prepared by the time above, in this time zone.', `<select class="select" data-tz aria-label="Time zone">${(window.Intl?.supportedValuesOf?.('timeZone') || [p.tz]).concat(p.tz).filter((z, i, a) => a.indexOf(z) === i).sort().map((z) => `<option ${z === p.tz ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select>`)}
        ${me.push?.enabled ? row('Browser notifications', 'A quiet nudge when your edition is ready, and nothing else. On iPhone, add Over Coffee to your home screen first.', `<button class="btn btn--small btn--ghost" type="button" data-push>${me.push.subscribed ? 'Turn off' : 'Turn on'}</button><p class="note" data-push-note role="status"></p>`) : ''}
        ${row('Personalisation', 'Clear what Over Coffee remembers about you: stories already covered, your relevance feedback and saved stories.', `<button class="btn btn--small btn--ghost" type="button" data-clear>Clear history</button>`)}
      </section>
      <section class="panel" style="margin-top:44px">
        <div class="setting"><div class="setting__label"><h3>Account</h3><p>${esc(me.user?.email || '')}</p></div><div><button class="btn btn--small btn--ghost" type="button" data-logout>Log out</button></div></div>
        <div class="setting"><div class="setting__label"><h3>Start over</h3><p>Replay the welcome and choose your topics again.</p></div><div><button class="textlink" type="button" data-reset>Start over</button></div></div>
      </section>
    </div>`,
    { title: 'Settings' },
  );
  $app.querySelector('[data-logout]')?.addEventListener('click', logout);
  $app.querySelector('[data-tz]')?.addEventListener('change', async (e) => { await api.saveProfile({ tz: e.target.value }); await refreshMe(); toast('Time zone saved.'); });
  $app.querySelector('[data-clear]')?.addEventListener('click', async () => {
    if (!confirm('Clear what Over Coffee remembers? Stories it has covered, your feedback and your saved stories will be removed. Your topics and settings stay.')) return;
    await api.clearPersonalisation();
    me.savedKeys = [];
    toast('History cleared.');
  });
  const $push = $app.querySelector('[data-push]');
  if ($push) {
    const $note = $app.querySelector('[data-push-note]');
    $push.addEventListener('click', async () => {
      $push.classList.add('is-loading');
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (me.push.subscribed && existing) {
          await api.pushUnsubscribe(existing.endpoint);
          await existing.unsubscribe();
          me.push.subscribed = false;
          $push.textContent = 'Turn on';
          $note.textContent = 'Notifications are off.';
        } else {
          // Asked only now, after the reader chose to turn this on, and never on page load.
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') { $note.textContent = 'Your browser blocked notifications. You can allow them in the browser’s site settings.'; return; }
          const key = Uint8Array.from(atob(me.push.publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
          const sub = existing || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
          await api.pushSubscribe(sub.toJSON());
          me.push.subscribed = true;
          $push.textContent = 'Turn off';
          $note.textContent = 'On. You’ll get a nudge when your edition is ready.';
        }
      } catch (err) {
        $note.textContent = /not supported|undefined/.test(String(err.message)) ? 'This browser doesn’t support notifications.' : err.message;
      } finally {
        $push.classList.remove('is-loading');
      }
    });
  }
  const patch = async (key, raw) => {
    const value = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
    const [a, b] = key.split('.');
    const body = b ? { [a]: { ...(me.profile[a] || {}), [b]: value } } : { [a]: value };
    await api.saveProfile(body);
    api.forget();
    await refreshMe();
    toast(a === 'mode' ? 'Saved. Same edition, new voice.' : a === 'budgetMinutes' ? 'Saved. Today’s edition will be re-edited to fit.' : 'Saved.');
    if (a === 'mode' && location.hash.startsWith('#/settings')) viewSettings();
  };
  $app.querySelectorAll('[data-set]').forEach((btn) =>
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
      patch(btn.dataset.set, btn.dataset.value);
    }),
  );
  const saveChannels = async () => {
    const on = [...$app.querySelectorAll('[data-chan][aria-pressed="true"]')].map((b) => b.dataset.chan);
    await api.saveProfile({ delivery: { channels: on } });
    await refreshMe();
    $app.querySelector('[data-wa]').hidden = !on.includes('whatsapp');
    toast(on.length ? 'Saved. Your morning ping is set.' : 'Saved. No pings — the paper will wait for you.');
  };
  $app.querySelectorAll('[data-chan]').forEach((b) =>
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      saveChannels();
    }),
  );
  $app.querySelector('[data-time]').addEventListener('change', async (e) => {
    await api.saveProfile({ delivery: { time: e.target.value } });
    await refreshMe();
    toast('Saved.');
  });
  $app.querySelector('[data-wa-input]').addEventListener('change', async (e) => {
    await api.saveProfile({ delivery: { whatsapp: e.target.value } });
    await refreshMe();
    toast('Saved.');
  });
  $app.querySelector('[data-test-push]').addEventListener('click', () => testPush(sample.hooks));
  $app.querySelector('[data-deliver]').addEventListener('click', async () => {
    const ed = await api.today();
    const { delivered } = await api.deliver(ed.id);
    const names = Object.keys(delivered);
    toast(names.length ? `Prepared ${names.join(', ')} → data/outbox` : 'Pick a channel first.');
  });
  $app.querySelector('[data-reset]').addEventListener('click', async () => {
    await api.reset();
    api.forget();
    ob.topics = [];
    await refreshMe();
    go('#/welcome');
  });
}

// ── DOWNLOAD ────────────────────────────────────────────────────────────────

async function viewLibrary() {
  setNav('');
  setTone('business');
  loading('Opening your library…');
  const { saved, editions } = await api.library();
  const m = me.profile.mode;
  const when = (iso) => longDate(iso);
  const daily = editions.filter((e) => e.kind === 'daily');
  render(
    `<div class="page">
      <p class="eyebrow">Library</p>
      <h1>Everything you’ve <em class="grad-text" style="font-family:var(--accent-serif);font-weight:400">kept.</em></h1>
      <section class="panel lib"><h2 class="block__h">Saved stories</h2>
        ${saved.length ? `<ul class="lib__list">${saved.map((s) => `<li><a href="#/story/${esc(s.editionId)}/${esc(s.storyId)}?mode=${m}"><b>${esc(s.headline)}</b><span>${esc(s.topic || '')} · saved ${esc(shortDate(s.savedAt.slice(0, 10)))}</span></a><button class="textlink" type="button" data-unsave="${esc(s.editionId)}/${esc(s.storyId)}">Remove</button></li>`).join('')}</ul>` : '<p class="lib__empty">Nothing saved yet. Tap the bookmark on any story to keep it here.</p>'}
      </section>
      <section class="panel lib"><h2 class="block__h">Past editions</h2>
        ${daily.length ? `<ul class="lib__list">${daily.map((e) => `<li><a href="#/read/${esc(e.id)}?mode=${m}"><b>${esc(when(e.editorial_date))}</b><span>${e.budget_minutes}-minute edition · ${String(e.topics || '').split(',').filter(Boolean).length} topics${e.sample ? ' · sample' : ''}</span></a></li>`).join('')}</ul>` : '<p class="lib__empty">Your editions will appear here.</p>'}
      </section>
    </div>`,
    { title: 'Library' },
  );
  $app.querySelectorAll('[data-unsave]').forEach((b) => b.addEventListener('click', async () => {
    const [e, s] = b.dataset.unsave.split('/');
    await api.unsave(e, s);
    me.savedKeys = (me.savedKeys || []).filter((k) => k !== b.dataset.unsave);
    viewLibrary();
  }));
}

async function viewDownload() {
  setNav('download');
  setTone('business');
  loading();
  const ed = await api.today();
  const { editions } = await api.list();
  const m = me.profile.mode;
  render(
    `<div class="page">
      <p class="eyebrow">Download</p>
      <h1>Take it <em class="grad-text" style="font-family:var(--accent-serif);font-weight:400">with you.</em></h1>
      <p class="lede">The same edition as a printable newspaper, a short listen, or a ping in your pocket.</p>
      <div class="dl dl--install"><h3>Install Over Coffee</h3><p>Put it on your home screen and it opens like an app, full screen, and your last edition still works offline.</p><div class="dl__actions"><button class="btn btn--small" type="button" data-install hidden>Install app</button></div><p class="dl__hint">iPhone: tap Share, then “Add to Home Screen”. Android and desktop Chrome: use the Install button above or the browser menu.</p></div>
      <div class="dl-grid">
        <div class="dl"><h3>Newspaper PDF · Business</h3><p>Set for paper. ${ed.stats.readingMinutes.business}-minute read.</p><div class="dl__actions"><a class="btn btn--small" href="/api/editions/${esc(ed.id)}/pdf?mode=business" target="_blank" rel="noopener">Open PDF</a><a class="textlink" href="/api/editions/${esc(ed.id)}/pdf?mode=business&download=1">Save</a></div></div>
        <div class="dl"><h3>Newspaper PDF · Conversational</h3><p>The friendly edition, printable. ${ed.stats.readingMinutes.social}-minute read.</p><div class="dl__actions"><a class="btn btn--small" href="/api/editions/${esc(ed.id)}/pdf?mode=social" target="_blank" rel="noopener">Open PDF</a><a class="textlink" href="/api/editions/${esc(ed.id)}/pdf?mode=social&download=1">Save</a></div></div>
        <div class="dl"><h3>Audio summary</h3><p>About ${plural(Math.max(1, Math.round(ed.audio[m].seconds / 60)), 'minute')}. For the drive, the walk or the kitchen.</p><div class="dl__actions"><button class="btn btn--small btn--ghost" type="button" data-listen>▶ Listen</button></div></div>
        <div class="dl"><h3>Morning ping</h3><p>Push, WhatsApp and email teasers for today’s edition, in your ${m} voice.</p><div class="dl__actions"><button class="btn btn--small btn--ghost" type="button" data-deliver>Prepare today’s ping</button><a class="textlink" href="/email/${esc(ed.id)}?mode=${m}" target="_blank" rel="noopener">Preview the email</a></div></div>
      </div>
      <section class="block" style="margin-top:44px">
        <h2 class="block__h">Past editions</h2>
        <p class="block__note">Every edition is stored as it was delivered, and can be reopened or inspected.</p>
        <ul class="archive">${editions
          .map(
            (e) => `<li><div><a href="#/read/${esc(e.id)}">${esc(longDate(e.editorial_date))}</a><small>${esc(e.topics.split(',').join(' · '))} · ${e.budget_minutes}-minute budget · prepared ${esc(hm(e.generated_at))}</small></div><a class="textlink" href="#/edition/${esc(e.id)}">Record</a></li>`,
          )
          .join('')}</ul>
      </section>
    </div>`,
    { title: 'Download' },
  );
  $app.querySelector('[data-listen]').addEventListener('click', () => openListen(ed, m));
  $app.querySelector('[data-deliver]').addEventListener('click', async () => {
    const chans = me.profile.delivery.channels?.length ? undefined : ['push', 'email', 'whatsapp'];
    const { delivered } = await api.deliver(ed.id, chans);
    toast(`Prepared ${Object.keys(delivered).join(', ')} → data/outbox`);
  });
}

// ── COMPARE: the four required prototypes ─────────────────────────────────────

async function viewCompare(_, query) {
  setNav('');
  const set = query.get('set') === 'single' ? 'single' : query.get('set') === 'multi' ? 'multi' : 'single';
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  const minutes = [3, 5, 10].includes(Number(query.get('m'))) ? Number(query.get('m')) : 10;
  const view = ['one', 'modes', 'topics'].includes(query.get('view')) ? query.get('view') : 'one';
  const dev = query.get('dev') === 'mobile' ? 'mobile' : 'desktop';
  setTone(view === 'one' ? mode : 'business');
  loading('Preparing the four editions…');
  const { single, multi } = await api.previews(minutes);
  const eds = { single, multi };
  const link = (o) => {
    const q = new URLSearchParams({ set, mode, m: minutes, view, dev, ...o });
    return `#/lab?${q}`;
  };
  const cell = (n, s, md) => {
    const e = eds[s];
    return `<a class="cmp-cell" href="${link({ set: s, mode: md, view: 'one' })}" aria-current="${view === 'one' && set === s && mode === md}"><b>Preview ${n}</b><span>${s === 'single' ? 'AI' : 'AI · Food · Farming'} — ${md === 'business' ? 'Business' : 'Conversational'}</span><small>${plural(e.stories.length, 'story', 'stories')} · ${e.stats.readingMinutes[md]}-minute read</small></a>`;
  };
  const ed = eds[set];
  const sectionCounts = (e) =>
    e.sections
      .map((s) => `${s.label} ${s.storyIds.length + (e.leadTopicId === s.topicId ? 1 : 0)}`)
      .join(' · ');
  const explain =
    view === 'modes'
      ? `<b>One edition, two voices.</b> Both columns are the same stored edition (${esc(ed.id)}): ${ed.stats.published} stories chosen from ${ed.stats.considered} developments. Switching voice re-renders; it never re-researches or re-writes.`
      : view === 'topics'
      ? `<b>Single vs multi-topic.</b> The editor doesn’t split space evenly. Multi-topic today: ${esc(sectionCounts(multi))}. Lead: “${esc(multi.stories[0]?.copy.business.headline || '')}”.`
      : `<b>${set === 'single' ? 'Single topic' : 'Multi-topic'} · ${mode === 'business' ? 'Business' : 'Conversational'} · ${minutes}-minute budget.</b> ${ed.stats.published} of ${ed.stats.considered} developments cleared the bar; the edition reads in about ${ed.stats.readingMinutes[mode]} minutes. ${set === 'multi' ? `Space by topic: ${esc(sectionCounts(ed))}.` : ''} Nothing was added to fill the budget.`;

  const pairs =
    view === 'modes'
      ? [
          [ed, 'business', `Preview ${set === 'single' ? 1 : 2} · Business`],
          [ed, 'social', `Preview ${set === 'single' ? 3 : 4} · Conversational`],
        ]
      : view === 'topics'
      ? [
          [single, mode, `Preview ${mode === 'business' ? 1 : 3} · Single topic`],
          [multi, mode, `Preview ${mode === 'business' ? 2 : 4} · Multi-topic`],
        ]
      : null;

  render(
    `<div class="cmp-head">
      <p class="eyebrow">Prototype editions</p>
      <h1>Four newspapers, one engine.</h1>
      <p class="lede">The question isn’t whether it works. It’s whether you’d want to open it every morning.</p>
      <div class="cmp-matrix">
        <span class="h"></span><span class="h">Single topic</span><span class="h">Multi-topic</span>
        <span class="h">Business</span>${cell(1, 'single', 'business')}${cell(2, 'multi', 'business')}
        <span class="h">Conversational</span>${cell(3, 'single', 'social')}${cell(4, 'multi', 'social')}
      </div>
      <div class="cmp-controls">
        <span><span class="field__label">Compare</span><span class="seg"><a href="${link({ view: 'one' })}" aria-current="${view === 'one'}">One at a time</a><a href="${link({ view: 'modes' })}" aria-current="${view === 'modes'}">Business vs Conversational</a><a href="${link({ view: 'topics' })}" aria-current="${view === 'topics'}">Single vs Multi</a></span></span>
        <span><span class="field__label">Device</span><span class="seg"><a href="${link({ dev: 'desktop' })}" aria-current="${dev === 'desktop'}">Desktop</a><a href="${link({ dev: 'mobile', view: 'one' })}" aria-current="${dev === 'mobile'}">Phone (swipe pages)</a></span></span>
        <span><span class="field__label">Reading budget</span><span class="seg">${[3, 5, 10].map((x) => `<a href="${link({ m: x })}" aria-current="${minutes === x}">${x} min</a>`).join('')}</span></span>
      </div>
      <p class="cmp-explain">${explain}</p>
    </div>
    ${
      pairs
        ? `<div class="cmp-pair">${pairs
            .map(
              ([e, md, label]) => `<div class="cmp-pair__col"><div class="cmp-pair__label"><span>${esc(label)}</span><a href="#/read/${esc(e.id)}?mode=${md}">Open full page →</a></div><iframe title="${esc(label)}" src="/#/embed/${esc(e.id)}?mode=${md}" loading="lazy"></iframe></div>`,
            )
            .join('')}</div>`
        : dev === 'mobile'
        ? `<div class="lab-phone"><iframe title="Phone preview" src="/#/embed/${esc(ed.id)}?mode=${mode}" width="390" height="780"></iframe><p class="lab-phone__note">390 × 780 · swipe sideways for pages, scroll down within a page. <a href="/api/editions/${esc(ed.id)}/pdf?mode=${mode}" target="_blank" rel="noopener">Open PDF</a></p></div>`
        : `<div class="readbar"><div class="readbar__left"><span class="readbar__note">Preview ${set === 'single' ? (mode === 'business' ? 1 : 3) : mode === 'business' ? 2 : 4} of 4</span></div><div class="readbar__right"><a class="tool" href="/api/editions/${esc(ed.id)}/pdf?mode=${mode}" target="_blank" rel="noopener">PDF</a><a class="tool" href="#/edition/${esc(ed.id)}?mode=${mode}">How it was made</a></div></div>${renderNewspaper(ed, mode)}`
    }`,
    { title: 'Prototype editions' },
  );
  wirePaper($app, ed);
}

async function viewEmbed([id], query) {
  const ed = await api.edition(id);
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  setTone(mode);
  render(renderNewspaper(ed, mode));
  wirePaper($app, ed);
  pageify($app, { edId: ed.id, mode, hint: false });
  // Links inside an embedded preview open in the full app.
  $app.querySelectorAll('a[href^="#/"]').forEach((a) => (a.target = '_top', (a.href = '/' + a.getAttribute('href'))));
}

// ── EDITION RECORD (inspect & audit) ─────────────────────────────────────────

async function viewEdition([id], query) {
  setNav('');
  setTone('business');
  const ed = await api.edition(id);
  const ledger = await api.ledger(ed.id);
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  const events = [...ed.events].sort((a, b) => b.score.total - a.score.total);
  render(
    `<div class="page page--wide">
      <p class="eyebrow">Edition record</p>
      <h1>How this edition was made</h1>
      <p class="lede">Every edition is stored with its research snapshot, editorial decisions, sources and quality checks, so it can be inspected, audited or regenerated.</p>
      <p class="block__note" style="margin-top:-18px">Edition <b>${esc(ed.id)}</b> · ${esc(longDate(ed.editorialDate))} · engine ${esc(ed.engineVersion)} · research: ${esc(ed.research.adapter)}${ed.sample ? ' (sample corpus)' : ''}, cache ${ed.research.cache.hits.length} hit / ${ed.research.cache.misses.length} miss · ${ed.config.budgetMinutes}-minute budget, bar ${ed.editorial.bar.toFixed(2)} · <a href="/api/editions/${esc(ed.id)}" target="_blank" rel="noopener">edition object (JSON)</a> · <a href="#/read/${esc(ed.id)}?mode=${mode}">read the edition</a></p>

      <section class="block"><h2 class="block__h">The pipeline</h2><p class="block__note">One research pass. Business, Conversational, web, PDF and audio all render from the result.</p>
        <ol class="pipeline">${ed.pipeline.map((s) => `<li><b>${s.number}</b><span>${esc(s.label)}</span><span>${esc(s.note || '')}</span></li>`).join('')}</ol>
      </section>

      <section class="block"><h2 class="block__h">The morning ping</h2><p class="block__note">Built from this stored edition (pattern: <b>${esc(ed.hooks?.pattern || 'n/a')}</b>). Checked by the quality gate: it must tease a published story, use only sourced numbers, and carry no false urgency.</p>
        ${ed.hooks ? pingPreview({ hooks: ed.hooks[mode], date: ed.editorialDate, mode, editionId: ed.id }, { time: me.profile.delivery.time }) : ''}
      </section>

      <section class="block"><h2 class="block__h">Editorial decisions</h2><p class="block__note">${ed.stats.considered} developments considered, ${ed.stats.published} published, ${ed.stats.held} held, ${ed.stats.rejected} rejected. Scores combine relevance, significance, freshness, source quality and corroboration.</p>
        <table class="ledger"><thead><tr><th>Development</th><th class="hide-sm">Topic</th><th class="hide-sm">Sources</th><th>Score</th><th>Decision</th></tr></thead><tbody>${events
          .map(
            (e) => `<tr><td><div class="t">${esc(e.title)}</div><div class="r">${esc(e.decision.reason)}</div></td><td class="hide-sm">${esc(e.primaryTopic)}</td><td class="hide-sm num">${e.sourceIds.length} · ${e.publishers.length} pub.</td><td class="num"><span class="scorebar" style="width:${Math.max(2, Math.round(Math.max(0, e.score.total) * 60))}px"></span>${e.score.total.toFixed(2)}<div class="r" title="relevance · significance · freshness · source quality · corroboration">${e.score.relevance} · ${e.score.significance} · ${e.score.freshness} · ${e.score.sourceQuality} · ${e.score.corroboration}${e.score.penalty ? ` − ${e.score.penalty}` : ''}</div></td><td><span class="decision decision--${e.decision.status}">${esc(e.decision.status)}${e.decision.tier ? ` · ${esc(e.decision.tier)}` : ''}</span></td></tr>`,
          )
          .join('')}</tbody></table>
      </section>

      <section class="block"><h2 class="block__h">Quality gate — ${esc(ed.quality.status)}</h2><p class="block__note">Checked in both voices before delivery.</p>
        <ul class="qc">${ed.quality.checks.map((c) => `<li><b class="${c.status}">${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕'} ${esc(c.label)}</b><small>${esc(c.detail)}${c.items?.length ? ' — ' + c.items.map(esc).join('; ') : ''}</small></li>`).join('')}</ul>
      </section>

      <section class="block"><h2 class="block__h">Evidence</h2>
        <p class="block__note">Claims by status: ${ledger.claimsByStatus.map((r) => `${r.n} ${esc(r.status)}`).join(' · ')}. Sources by type: ${ledger.sourcesByType.map((r) => `${r.n} ${esc(r.source_type)}`).join(' · ')}.</p>
      </section>
    </div>`,
    { title: 'Edition record' },
  );
}


// ── PWA: service worker + install prompt ───────────────────────────────────

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  document.querySelectorAll('[data-install]').forEach((b) => (b.hidden = false));
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  api.track('pwa_installed');
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-install]');
  if (b && installEvent) {
    installEvent.prompt();
    installEvent = null;
    b.hidden = true;
  }
});
