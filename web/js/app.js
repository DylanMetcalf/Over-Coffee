// Over Coffee — the reader app.
// Hash routes, plain DOM, no framework. Every screen answers one question:
// does this help the reader get to their newspaper?

import { api } from './api.js';
import { renderNewspaper } from './render/newspaper.js';
import { renderStory, renderSource } from './render/story.js';
import { markSvg } from './render/mark.js';
import { esc, longDate, hm, plural, numberWord } from './render/util.js';

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
  edition: viewEdition,
  embed: viewEmbed,
};

async function router() {
  const { parts, query } = parseHash();
  const view = routes[parts[0] || ''] || viewHome;
  document.body.classList.toggle('is-embed', parts[0] === 'embed');
  document.getElementById('topbar').hidden = parts[0] === 'embed';
  try {
    if (!me) await refreshMe();
    if (!me.profile.onboarded && !['welcome', 'compare', 'embed', 'story', 'source', 'read', 'edition'].includes(parts[0] || '')) return go('#/welcome');
    await view(parts.slice(1), query);
    if (!query.get('at')) window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    console.error(err);
    failure(err);
  }
}

window.addEventListener('hashchange', router);
router();

// ── HOME: the entrance to the publication ──────────────────────────────────

async function viewHome() {
  setNav('today');
  setTone('business');
  loading();
  const ed = await api.today();
  const m = me.profile.mode;
  const n = ed.stories.length;
  const minutes = ed.stats.readingMinutes[m];
  const override = me.override;
  render(
    `<section class="home"><div class="home__inner">
      ${ed.sample ? `<div class="sample-banner"><strong>Design prototype — sample edition.</strong> Fictional organisations, people and figures. Not current news.</div>` : ''}
      ${markSvg({ size: 54, animate: true })}
      <p class="home__date">${esc(longDate(ed.editorialDate))}</p>
      <h1 class="home__hello">Good morning.</h1>
      <p class="home__edition">Your ${minutes}-minute edition.</p>
      ${override ? `<p class="home__override">${override.reason === 'adventurous' ? 'Feeling adventurous today' : override.reason === 'random' ? 'A random topic, just for today' : 'Changed for today only'}${override.path ? ` — ${esc(override.path.join(' → '))}` : ''}</p>` : ''}
      <p class="home__topics">${topicLine(ed.topics)}</p>
      <p class="home__count">${n ? `${numberWord(n)} ${n === 1 ? 'thing' : 'things'} worth knowing today.` : 'A quiet morning. Nothing cleared the bar.'}</p>
      <div class="home__actions">
        <a class="btn" href="#/read/${esc(ed.id)}?mode=${m}">Read today’s newspaper</a>
        <button class="btn btn--ghost" type="button" data-listen>Listen to summary</button>
      </div>
      <p class="home__meta">Prepared ${hm(ed.generatedAt)} · ${ed.stats.sourcesReviewed} sources reviewed · ${Math.max(1, Math.round(ed.audio[m].seconds / 60))}-minute audio</p>
      <div class="home__more">
        <button class="textlink" type="button" data-change>Change today’s paper</button>
        ${override ? `<button class="textlink" type="button" data-reset-today>Back to my usual topics</button>` : ''}
        <a class="textlink" href="#/compare">Compare the four prototype editions</a>
      </div>
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
        <div class="player__meta"><b>${esc(longDate(ed.editorialDate))}</b>About ${Math.max(1, Math.round(audio.seconds / 60))} minute${audio.seconds > 90 ? 's' : ''} · ${mode === 'social' ? 'Social' : 'Business'} voice${synth ? '' : ' · Your browser can’t speak; here’s the transcript'}</div>
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
        <div class="seg" role="group" aria-label="Presentation"><a href="${href('business')}" aria-current="${mode === 'business'}">Business</a><a href="${href('social')}" aria-current="${mode === 'social'}">Social</a></div>
        <span class="readbar__note">Same edition, ${mode === 'social' ? 'friendlier voice' : 'professional voice'}.</span>
      </div>
      <div class="readbar__right">
        <button class="link" type="button" data-listen>Listen</button>
        <a href="/api/editions/${esc(ed.id)}/pdf?mode=${mode}" target="_blank" rel="noopener">PDF</a>
        ${isDaily ? '<button class="link" type="button" data-change>Change today</button>' : ''}
      </div>
    </div>
    ${renderNewspaper(ed, mode)}`,
    { title: longDate(ed.editorialDate) },
  );
  $app.querySelector('[data-listen]').addEventListener('click', () => openListen(ed, mode));
  $app.querySelector('[data-change]')?.addEventListener('click', () => openChangeToday());
  wirePaper($app, ed);
  const at = query.get('at');
  if (at) requestAnimationFrame(() => document.getElementById(at)?.scrollIntoView({ block: 'start' }));
}

function wirePaper(root) {
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
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  setTone(mode);
  const html = renderStory(ed, storyId, mode);
  if (!html) throw new Error('That story isn’t in this edition.');
  const st = ed.stories.find((s) => s.id === storyId);
  render(html, { title: st.copy[mode].headline });
  if (location.hash.includes('#sources')) document.getElementById('sources')?.scrollIntoView();
}

async function viewSource([edId, sourceId], query) {
  setNav('');
  const ed = await api.edition(edId);
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  setTone(mode);
  const html = renderSource(ed, sourceId, { mode, from: query.get('from') });
  if (!html) throw new Error('That source isn’t in this edition.');
  render(html, { title: 'Source' });
}

// ── ONBOARDING ──────────────────────────────────────────────────────────────

const ob = { step: 1, topics: [], budget: 10, mode: 'business', time: '06:00', method: 'web' };
const SUGGEST = ['AI', 'Technology', 'Farming', 'Food', 'South Africa', 'Business', 'Renewable energy', 'Finance', 'Climate', 'Manufacturing', 'Football', 'Photography', 'Cars'];

async function viewWelcome(_, query) {
  setNav('');
  setTone(ob.mode);
  ob.step = Number(query.get('step')) || 1;
  if (ob.step > 1 && !ob.topics.length) ob.step = 1;
  const total = 5;
  const progress = `<div class="ob__progress"><span>${ob.step < total ? `Step ${ob.step} of ${total - 1}` : 'Your first edition'}</span><div class="ob__bar"><span style="width:${(ob.step / total) * 100}%"></span></div></div>`;
  const nav = (back, next, nextLabel = 'Continue') =>
    `<div class="ob__nav">${back ? `<a class="textlink" href="#/welcome?step=${ob.step - 1}">Back</a>` : `<button class="textlink" type="button" data-skip>Skip — show me a sample edition</button>`}${next ? `<button class="btn" type="button" data-next>${nextLabel}</button>` : '<span></span>'}</div>`;

  if (ob.step === 1) {
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">What do you want to know about?</h1>
        <p class="ob__hint">Write it the way you’d say it. Broad is fine — we’ll work out the details.</p>
        <form class="ob__input" data-form><input data-input placeholder="e.g. artificial intelligence, farming, South Africa" autocomplete="off" aria-label="Add a topic"><button type="submit">Add</button></form>
        <div class="ob__chosen"><div class="chips" data-chosen></div><p class="ob__expansion" data-expansion></p></div>
        <p class="ob__suggest-h">Or start with</p>
        <div class="chips" data-suggest></div>
      </div>${nav(false, true)}</div>`,
      { title: 'Welcome' },
    );
    const $chosen = $app.querySelector('[data-chosen]');
    const $exp = $app.querySelector('[data-expansion]');
    const $suggest = $app.querySelector('[data-suggest]');
    const $next = $app.querySelector('[data-next]');
    const paint = (last) => {
      $chosen.innerHTML = ob.topics.map((t) => `<button class="chip" type="button" aria-pressed="true" data-remove="${esc(t.id)}">${esc(t.label)} <span class="chip__x" aria-label="Remove">×</span></button>`).join('');
      $suggest.innerHTML = SUGGEST.filter((s) => !ob.topics.some((t) => t.label.toLowerCase() === s.toLowerCase())).map((s) => `<button class="chip chip--dim" type="button" data-add="${esc(s)}">+ ${esc(s)}</button>`).join('');
      const t = last || ob.topics.at(-1);
      $exp.innerHTML = t ? `<b>${esc(t.label)}</b>${t.custom ? ' (new to us — we’ll research it as it comes)' : ''}: we’ll follow ${esc(t.expansion.join(', ').toLowerCase())}.` : '';
      $next.disabled = !ob.topics.length;
      $chosen.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => ((ob.topics = ob.topics.filter((x) => x.id !== b.dataset.remove)), paint())));
      $suggest.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(b.dataset.add)));
    };
    const add = async (text) => {
      for (const part of String(text).split(/,|\band\b/).map((s) => s.trim()).filter(Boolean)) {
        const { topic } = await api.interpret(part);
        if (topic && !ob.topics.some((t) => t.id === topic.id)) ob.topics.push(topic);
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
      [5, 'The essentials', 'Only what is genuinely worth five minutes. On a quiet day, less.'],
      [10, 'The full picture', 'The day’s important developments, with context where it helps.'],
      [20, 'Room for depth', 'More context and a few more stories — never padding.'],
    ];
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">How much time do you have?</h1>
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
        <h1 class="ob__q">How do you want it presented?</h1>
        <p class="ob__hint">The same facts, sources and caveats either way. Only the voice changes — and you can switch any morning.</p>
        <div class="modes">
          <button class="mode-card" type="button" data-mode="business" aria-pressed="${ob.mode === 'business'}">
            <div class="mode-card__sample mode-card__sample--b"><span class="k">Harvest outlook</span><h4>A dry September cuts the wheat forecast by 7%</h4><p>The National Grain Council now expects 24.6 million tonnes. Millers and bakers are watching.</p></div>
            <div class="mode-card__label"><b>Business</b><span>Concise, precise and calm. For people who need the facts fast.</span></div>
          </button>
          <button class="mode-card" type="button" data-mode="social" aria-pressed="${ob.mode === 'social'}">
            <div class="mode-card__sample mode-card__sample--s"><span class="k">The big one today</span><h4>A dry September just shrank the wheat harvest</h4><p>And yes — eventually, that’s about the price of your bread.</p></div>
            <div class="mode-card__label"><b>Social</b><span>A friend catching you up. Warmer, more colourful, just as accurate.</span></div>
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
    render(
      `<div class="ob">${progress}<div class="ob__body">
        <h1 class="ob__q">When should your newspaper arrive?</h1>
        <p class="ob__hint">We’ll have it ready before you sit down.</p>
        <div class="fields">
          <div class="field"><label for="ob-time">Ready by</label><input id="ob-time" type="time" value="${esc(ob.time)}" data-time></div>
          <div class="field"><span class="field__label">Deliver to</span><div class="seg" role="group">${[
            ['web', 'Here'],
            ['email', 'Email'],
            ['pdf', 'Email + PDF'],
          ]
            .map(([v, l]) => `<button type="button" data-method="${v}" aria-pressed="${ob.method === v}">${l}</button>`)
            .join('')}</div></div>
        </div>
      </div>${nav(true, true, 'Make my first newspaper')}</div>`,
      { title: 'Welcome' },
    );
    $app.querySelector('[data-time]').addEventListener('change', (e) => (ob.time = e.target.value || '06:00'));
    $app.querySelectorAll('[data-method]').forEach((b) =>
      b.addEventListener('click', () => {
        ob.method = b.dataset.method;
        $app.querySelectorAll('[data-method]').forEach((x) => x.setAttribute('aria-pressed', x === b));
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
      <ol class="stages">${me.stages.map((s) => `<li data-stage="${s.key}"><span class="stages__n">${s.number}</span><span>${esc(s.label)}</span><span class="stages__note"></span></li>`).join('')}</ol>
    </div><div></div></div>`,
    { title: 'Your first edition' },
  );
  await api.saveProfile({
    onboarded: true,
    topics: ob.topics.map((t) => t.id),
    budgetMinutes: ob.budget,
    mode: ob.mode,
    delivery: { time: ob.time, method: ob.method },
  });
  api.forget();
  await refreshMe();
  const ed = await api.today();
  const items = [...$app.querySelectorAll('[data-stage]')];
  for (const [i, entry] of ed.pipeline.entries()) {
    const li = items.find((x) => x.dataset.stage === entry.stage);
    items.forEach((x) => x.classList.remove('is-now'));
    if (li) {
      li.classList.add('is-done', 'is-now');
      li.querySelector('.stages__note').textContent = entry.note || '';
    }
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
  const seg = (key, options, value) =>
    `<div class="seg" role="group">${options.map(([v, l]) => `<button type="button" data-set="${key}" data-value="${esc(v)}" aria-pressed="${String(value) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
  const row = (title, note, control) => `<div class="setting"><div class="setting__label"><h3>${title}</h3><p>${note}</p></div><div>${control}</div></div>`;
  render(
    `<div class="page">
      <p class="eyebrow">Settings</p>
      <h1>Let the editor decide.</h1>
      <p class="lede">A few choices are yours. The rest — what matters, how much, in what order — is the editor’s job.</p>
      ${row('Reading time', 'A budget, not a quota.', seg('budgetMinutes', [[5, '5 min'], [10, '10 min'], [20, '20 min']], p.budgetMinutes))}
      ${row('Presentation', 'Switching never re-researches your edition.', seg('mode', [['business', 'Business'], ['social', 'Social']], p.mode))}
      ${row('Delivery time', 'Your edition is prepared by this time each morning.', `<div class="field"><input type="time" value="${esc(p.delivery.time)}" data-time></div>`)}
      ${row('Delivery', 'Where your newspaper arrives.', seg('delivery.method', [['web', 'Here'], ['email', 'Email'], ['pdf', 'Email + PDF']], p.delivery.method))}
      ${row('Discovery', 'How often the editor brings in something adjacent to your interests.', seg('discovery', [['off', 'Never'], ['occasionally', 'Now and then'], ['often', 'Often']], p.discovery))}
      ${row('PDF', 'Paper size for printing.', seg('pdf.paper', [['A4', 'A4'], ['Letter', 'Letter']], p.pdf?.paper || 'A4'))}
      ${row('Audio summary', 'A short spoken version of each edition.', seg('audio.enabled', [[true, 'On'], [false, 'Off']], p.audio?.enabled !== false))}
      <div class="setting"><div class="setting__label"><h3>Start over</h3><p>Replay the welcome and choose your topics again.</p></div><div><button class="textlink" type="button" data-reset>Start over</button></div></div>
    </div>`,
    { title: 'Settings' },
  );
  const patch = async (key, raw) => {
    const value = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
    const [a, b] = key.split('.');
    const body = b ? { [a]: { ...(me.profile[a] || {}), [b]: value } } : { [a]: value };
    await api.saveProfile(body);
    api.forget();
    await refreshMe();
    toast(a === 'mode' ? 'Saved. Same edition, new voice.' : a === 'budgetMinutes' ? 'Saved. Today’s edition will be re-edited to fit.' : 'Saved.');
  };
  $app.querySelectorAll('[data-set]').forEach((btn) =>
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
      patch(btn.dataset.set, btn.dataset.value);
    }),
  );
  $app.querySelector('[data-time]').addEventListener('change', (e) => patch('delivery.time', e.target.value));
  $app.querySelector('[data-reset]').addEventListener('click', async () => {
    await api.reset();
    api.forget();
    ob.topics = [];
    await refreshMe();
    go('#/welcome');
  });
}

// ── DOWNLOAD ────────────────────────────────────────────────────────────────

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
      <h1>Take it with you.</h1>
      <p class="lede">The same edition as a printable newspaper, a short listen, or a note in your inbox.</p>
      <div class="dl-grid">
        <div class="dl"><h3>Newspaper PDF · Business</h3><p>Set for paper. ${ed.stats.readingMinutes.business}-minute read.</p><a class="btn btn--small" href="/api/editions/${esc(ed.id)}/pdf?mode=business" target="_blank" rel="noopener">Open PDF</a> <a class="textlink" style="margin-left:12px" href="/api/editions/${esc(ed.id)}/pdf?mode=business&download=1">Save</a></div>
        <div class="dl"><h3>Newspaper PDF · Social</h3><p>The friendly edition, printable. ${ed.stats.readingMinutes.social}-minute read.</p><a class="btn btn--small" href="/api/editions/${esc(ed.id)}/pdf?mode=social" target="_blank" rel="noopener">Open PDF</a> <a class="textlink" style="margin-left:12px" href="/api/editions/${esc(ed.id)}/pdf?mode=social&download=1">Save</a></div>
        <div class="dl"><h3>Audio summary</h3><p>About ${Math.max(1, Math.round(ed.audio[m].seconds / 60))} minutes. For the drive, the walk or the kitchen.</p><button class="btn btn--small btn--ghost" type="button" data-listen>Listen</button></div>
        <div class="dl"><h3>Email</h3><p>A short summary with links to the paper and the PDF.</p><button class="btn btn--small btn--ghost" type="button" data-email>Send to my inbox</button></div>
      </div>
      <section class="block" style="margin-top:34px">
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
  $app.querySelector('[data-email]').addEventListener('click', async () => {
    const { file } = await api.email(ed.id);
    toast(`Prepared for delivery: ${file}`);
  });
}

// ── COMPARE: the four required prototypes ─────────────────────────────────────

async function viewCompare(_, query) {
  setNav('');
  const set = query.get('set') === 'single' ? 'single' : query.get('set') === 'multi' ? 'multi' : 'single';
  const mode = query.get('mode') === 'social' ? 'social' : 'business';
  const minutes = [5, 10, 20].includes(Number(query.get('m'))) ? Number(query.get('m')) : 10;
  const view = ['one', 'modes', 'topics'].includes(query.get('view')) ? query.get('view') : 'one';
  setTone(view === 'one' ? mode : 'business');
  loading('Preparing the four editions…');
  const { single, multi } = await api.previews(minutes);
  const eds = { single, multi };
  const link = (o) => {
    const q = new URLSearchParams({ set, mode, m: minutes, view, ...o });
    return `#/compare?${q}`;
  };
  const cell = (n, s, md) => {
    const e = eds[s];
    return `<a class="cmp-cell" href="${link({ set: s, mode: md, view: 'one' })}" aria-current="${view === 'one' && set === s && mode === md}"><b>Preview ${n}</b><span>${s === 'single' ? 'AI' : 'AI · Food · Farming'} — ${md === 'business' ? 'Business' : 'Social'}</span><small>${plural(e.stories.length, 'story', 'stories')} · ${e.stats.readingMinutes[md]}-minute read</small></a>`;
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
      : `<b>${set === 'single' ? 'Single topic' : 'Multi-topic'} · ${mode === 'business' ? 'Business' : 'Social'} · ${minutes}-minute budget.</b> ${ed.stats.published} of ${ed.stats.considered} developments cleared the bar; the edition reads in about ${ed.stats.readingMinutes[mode]} minutes. ${set === 'multi' ? `Space by topic: ${esc(sectionCounts(ed))}.` : ''} Nothing was added to fill the budget.`;

  const pairs =
    view === 'modes'
      ? [
          [ed, 'business', `Preview ${set === 'single' ? 1 : 2} · Business`],
          [ed, 'social', `Preview ${set === 'single' ? 3 : 4} · Social`],
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
        <span class="h">Social</span>${cell(3, 'single', 'social')}${cell(4, 'multi', 'social')}
      </div>
      <div class="cmp-controls">
        <span><span class="field__label">Compare</span><span class="seg"><a href="${link({ view: 'one' })}" aria-current="${view === 'one'}">One at a time</a><a href="${link({ view: 'modes' })}" aria-current="${view === 'modes'}">Business vs Social</a><a href="${link({ view: 'topics' })}" aria-current="${view === 'topics'}">Single vs Multi</a></span></span>
        <span><span class="field__label">Reading budget</span><span class="seg">${[5, 10, 20].map((x) => `<a href="${link({ m: x })}" aria-current="${minutes === x}">${x} min</a>`).join('')}</span></span>
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
        : `<div class="readbar"><div class="readbar__left"><span class="readbar__note">Preview ${set === 'single' ? (mode === 'business' ? 1 : 3) : mode === 'business' ? 2 : 4} of 4</span></div><div class="readbar__right"><a href="/api/editions/${esc(ed.id)}/pdf?mode=${mode}" target="_blank" rel="noopener">PDF</a><a href="#/edition/${esc(ed.id)}?mode=${mode}">How it was made</a></div></div>${renderNewspaper(ed, mode)}`
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

      <section class="block"><h2 class="block__h">The pipeline</h2><p class="block__note">One research pass. Business, Social, web, PDF and audio all render from the result.</p>
        <ol class="pipeline">${ed.pipeline.map((s) => `<li><b>${s.number}</b><span>${esc(s.label)}</span><span>${esc(s.note || '')}</span></li>`).join('')}</ol>
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
