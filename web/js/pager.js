// Phone reading: swipe sideways to turn the page, scroll down to read it.
//
// The newspaper is rendered once as normal HTML (so desktop, print and PDF stay
// untouched). On phones this module regroups the rendered sections into pages.
// Horizontal movement is native scroll-snap (no gesture hijacking), vertical
// scrolling is native inside each page, so the two never fight.

const KEY = (edId, mode) => `oc:pos:${edId}:${mode}`;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

export const isPhone = () => window.matchMedia('(max-width: 760px)').matches;

function pageKey(el, mode, uid) {
  const c = el.classList;
  if (mode === 'business') {
    if (c.contains('readbar') || c.contains('sample-banner') || c.contains('mast') || c.contains('hero') || c.contains('figures')) return ['front', 'Front page'];
    if (c.contains('lead-body') || c.contains('brief')) return ['lead', 'The lead'];
    if (c.contains('jump')) return null;
    if (c.contains('sec--quiet')) return ['quiet', 'Quiet today'];
    if (c.contains('sec')) return ['sec-' + el.id, el.querySelector('.sec__title')?.textContent || 'Section'];
    if (c.contains('quiet-day')) return ['front', 'Front page'];
    if (c.contains('colophon') || c.contains('readbar-tools')) return ['end', 'Done'];
  } else {
    if (c.contains('readbar') || c.contains('sample-banner') || c.contains('s-mast') || c.contains('s-tldr')) return ['front', 'Front page'];
    if (c.contains('s-card--lead') || c.contains('s-quietday')) return ['lead', 'The big one'];
    if (c.contains('row') || c.contains('s-card')) return ['row-' + uid, el.querySelector('.s-topic')?.textContent?.trim() || 'More stories'];
    if (c.contains('s-quietnote') || c.contains('s-quiz')) return ['extras', 'Quiz'];
    if (c.contains('s-remember') || c.contains('colophon') || c.contains('readbar-tools')) return ['end', 'Done'];
  }
  return ['row-' + uid, 'More'];
}

/**
 * @param {HTMLElement} root  element containing .readbar and .paper
 * @returns {{destroy(): void}|null}
 */
export function pageify(root, { edId, mode, at = null, onComplete = () => {}, hint = true }) {
  const paper = root.querySelector('.paper');
  if (!paper || !isPhone()) return null;
  const readbar = root.querySelector('.readbar');
  const pages = [];
  const index = new Map();
  let uid = 0;
  const nodes = [...(readbar ? [readbar] : []), ...paper.children];
  // Keep the page news-first: the voice switch stays on top, the tools move to the last page.
  const tools = readbar?.querySelector('.readbar__right');
  if (tools) {
    const box = document.createElement('div');
    box.className = 'readbar-tools';
    box.innerHTML = '<h3>Tools</h3>';
    box.appendChild(tools);
    const at = nodes.findIndex((n) => n.classList?.contains('colophon'));
    nodes.splice(at < 0 ? nodes.length : at, 0, box);
  }
  for (const el of nodes) {
    const k = pageKey(el, mode, ++uid);
    if (!k) { el.remove(); continue; }
    let p = index.get(k[0]);
    if (!p) {
      p = { key: k[0], title: k[1], nodes: [] };
      index.set(k[0], p);
      pages.push(p);
    }
    p.nodes.push(el);
  }
  if (pages.length < 2) return null;

  document.body.classList.add('has-pager');
  const pager = document.createElement('div');
  pager.className = 'pager';
  pager.setAttribute('role', 'region');
  pager.setAttribute('aria-label', 'Newspaper pages. Swipe sideways to turn the page.');
  const paperClass = paper.className;
  pages.forEach((p, i) => {
    const pg = document.createElement('section');
    pg.className = 'pg';
    pg.dataset.i = i;
    pg.setAttribute('aria-label', `Page ${i + 1} of ${pages.length}: ${p.title}`);
    const inner = document.createElement('div');
    inner.className = `pg__in ${paperClass}`;
    p.nodes.forEach((n) => inner.appendChild(n));
    if (i < pages.length - 1) {
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'pg__next';
      next.innerHTML = `<span>Next page</span><b>${pages[i + 1].title} →</b>`;
      next.addEventListener('click', () => go(i + 1));
      inner.appendChild(next);
    }
    pg.appendChild(inner);
    pager.appendChild(pg);
  });
  paper.replaceWith(pager);

  const bar = document.createElement('nav');
  bar.className = 'pager-bar';
  bar.setAttribute('aria-label', 'Page navigation');
  bar.innerHTML = `<button type="button" class="pager-bar__btn" data-prev aria-label="Previous page">‹</button>
    <div class="pager-bar__mid"><span class="pager-bar__title"></span><span class="pager-bar__dots" aria-hidden="true">${pages.map(() => '<i></i>').join('')}</span></div>
    <button type="button" class="pager-bar__btn" data-next aria-label="Next page">›</button>`;
  root.appendChild(bar);

  const $pages = [...pager.querySelectorAll('.pg')];
  const $dots = [...bar.querySelectorAll('.pager-bar__dots i')];
  const $title = bar.querySelector('.pager-bar__title');
  let current = 0;
  let completed = false;

  function show(i) {
    current = i;
    $dots.forEach((d, n) => d.classList.toggle('is-on', n === i));
    $title.textContent = `${i + 1} / ${pages.length} · ${pages[i].title}`;
    bar.querySelector('[data-prev]').disabled = i === 0;
    bar.querySelector('[data-next]').disabled = i === pages.length - 1;
    if (i === pages.length - 1 && !completed) {
      completed = true;
      onComplete();
    }
  }
  function go(i, smooth = true) {
    const n = Math.max(0, Math.min(pages.length - 1, i));
    pager.scrollTo({ left: $pages[n].offsetLeft - pager.offsetLeft - 12, behavior: smooth ? 'smooth' : 'instant' });
    show(n);
    $pages[n].querySelector('.pg__in').scrollTo({ top: 0 });
  }
  const pageAtScroll = () => {
    const mid = pager.scrollLeft + pager.clientWidth / 2;
    let best = 0;
    $pages.forEach((p, n) => { if (p.offsetLeft - pager.offsetLeft <= mid) best = n; });
    return best;
  };
  let t;
  pager.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const n = pageAtScroll();
      if (n !== current) show(n);
      save();
    }, 80);
  }, { passive: true });
  const save = () => store.set(KEY(edId, mode), { page: current, y: $pages[current].querySelector('.pg__in').scrollTop, at: Date.now() });
  $pages.forEach((p) => p.querySelector('.pg__in').addEventListener('scroll', () => { clearTimeout(save.t); save.t = setTimeout(save, 200); }, { passive: true }));
  bar.querySelector('[data-prev]').addEventListener('click', () => go(current - 1));
  bar.querySelector('[data-next]').addEventListener('click', () => go(current + 1));
  const onKey = (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') go(current + 1);
    if (e.key === 'ArrowLeft') go(current - 1);
  };
  document.addEventListener('keydown', onKey);

  // Where was I? A link to a story wins; otherwise the saved page and scroll.
  requestAnimationFrame(() => {
    const target = at && root.querySelector('#' + CSS.escape(at));
    if (target) {
      const pg = target.closest('.pg');
      go(Number(pg.dataset.i), false);
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
      return;
    }
    const saved = store.get(KEY(edId, mode));
    if (saved && saved.page > 0 && saved.page < pages.length && Date.now() - saved.at < 12 * 3600e3) {
      go(saved.page, false);
      requestAnimationFrame(() => $pages[saved.page].querySelector('.pg__in').scrollTo({ top: saved.y }));
    } else show(0);
    if (hint && !store.get('oc:hint-swipe')) {
      store.set('oc:hint-swipe', 1);
      pager.classList.add('pager--hint');
      setTimeout(() => pager.classList.remove('pager--hint'), 2600);
    }
  });
  show(0);
  return { destroy() { document.removeEventListener('keydown', onKey); document.body.classList.remove('has-pager'); } };
}
