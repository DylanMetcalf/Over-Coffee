// Live research adapter (opt-in: OC_RESEARCH=rss).
//
// Pulls public RSS feeds per topic and normalises items into the same article
// shape the sample corpus uses. Entities are extracted with a cheap
// deterministic heuristic (capitalised phrases) — good enough to cluster
// duplicate reporting before any model is involved.

import { TOPIC_CATALOG } from '../topics.js';

const FEEDS = {
  ai: ['https://feeds.bbci.co.uk/news/technology/rss.xml', 'https://www.theguardian.com/technology/artificialintelligenceai/rss'],
  technology: ['https://feeds.bbci.co.uk/news/technology/rss.xml'],
  business: ['https://feeds.bbci.co.uk/news/business/rss.xml'],
  climate: ['https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
  farming: ['https://www.theguardian.com/environment/farming/rss'],
  food: ['https://www.theguardian.com/food/rss'],
};

// Any topic: Bing News RSS search returns real publisher URLs, dates and snippets.
// NOTE: this feed is licensed for personal, non-commercial use. Fine for a
// friends-and-family test; swap for a licensed news API before a public launch
// (the adapter interface below is all that has to change).
const BING = (q) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&qft=${encodeURIComponent('interval="4"')}`;

function queriesFor(topic) {
  const base = topic.name || topic.label;
  const extra = (topic.expansion || []).slice(0, 2);
  const qs = [base];
  // Areas the reader chose (or the model suggested) make the search specific.
  if (topic.focused) qs.push(...topic.expansion.slice(0, 3).map((a) => (a.toLowerCase().includes(base.toLowerCase()) ? a : `${base} ${a}`)));
  else if (topic.custom) qs.push(...extra.map((e) => `${base} ${e}`));
  else if (extra[0]) qs.push(`${base} ${extra[0]}`);
  return [...new Set(qs)].slice(0, 3);
}

const STOP = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'How', 'Why', 'What', 'When', 'Who', 'Is', 'It', 'This', 'That', 'Its', 'As', 'From', 'With', 'After', 'Over']);

export class RssResearchAdapter {
  name = 'rss';
  sample = false;

  async search(topic, date) {
    const feeds = [...(FEEDS[topic.id] || []), ...queriesFor(topic).map(BING)];
    const out = [];
    const seenUrls = new Set();
    for (const url of feeds) {
      try {
        const res = await fetch(url, { headers: { 'user-agent': 'OverCoffee/0.1 (+prototype)' }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const xml = await res.text();
        for (const item of parseItems(xml)) {
          item.link = realUrl(item.link);
          if (!item.title || !item.link || seenUrls.has(item.link)) continue;
          seenUrls.add(item.link);
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
          const ageH = (new Date(date + 'T07:00:00Z') - new Date(publishedAt)) / 36e5;
          if (ageH > 72 || ageH < -24) continue;
          const publisher = item.source || new URL(url).hostname.replace(/^www\.|^feeds\./, '');
          out.push({
            id: 'rss-' + hash(item.link || item.title),
            title: item.title,
            publisher,
            sourceType: 'journalism',
            publishedAt,
            excerpt: item.description,
            url: item.link,
            entities: extractEntities(`${item.title}. ${item.description}`),
            topics: [topic.id],
          });
        }
      } catch {
        // A failed feed is skipped; the edition notes reduced coverage.
      }
    }
    return out;
  }

  availableTopics() {
    return new Set(TOPIC_CATALOG.map((t) => t.id)); // any topic can be searched live
  }
}

function parseItems(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const block = m[0];
    const get = (tag) => {
      const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return r ? decode(r[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]+>/g, '').trim() : '';
    };
    items.push({ title: get('title'), link: get('link'), description: get('description'), pubDate: get('pubDate'), source: get('News:Source') });
  }
  return items;
}

/** Bing wraps the publisher URL in a tracking link; unwrap it. */
function realUrl(link) {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('bing.com')) return u.searchParams.get('url') || '';
    return link;
  } catch {
    return '';
  }
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#171;/g, '«').replace(/&#187;/g, '»').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function extractEntities(text) {
  const found = new Set();
  for (const m of text.matchAll(/\b([A-Z][\p{L}\d&'-]+(?:\s+(?:of|de|and|&)?\s*[A-Z][\p{L}\d&'-]+)*)/gu)) {
    const e = m[1].trim();
    if (!STOP.has(e) && e.length > 2) found.add(e);
  }
  return [...found].slice(0, 12);
}

function hash(s) {
  let h = 5381;
  for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
