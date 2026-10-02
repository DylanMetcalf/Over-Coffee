// Live research adapter (opt-in: OC_RESEARCH=rss).
//
// Pulls public RSS feeds per topic and normalises items into the same article
// shape the sample corpus uses. Entities are extracted with a cheap
// deterministic heuristic (capitalised phrases) — good enough to cluster
// duplicate reporting before any model is involved.

const FEEDS = {
  ai: ['https://feeds.bbci.co.uk/news/technology/rss.xml', 'https://www.theguardian.com/technology/artificialintelligenceai/rss'],
  technology: ['https://feeds.bbci.co.uk/news/technology/rss.xml'],
  business: ['https://feeds.bbci.co.uk/news/business/rss.xml'],
  climate: ['https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
  farming: ['https://www.theguardian.com/environment/farming/rss'],
  food: ['https://www.theguardian.com/food/rss'],
};

const STOP = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'How', 'Why', 'What', 'When', 'Who', 'Is', 'It', 'This', 'That', 'Its', 'As', 'From', 'With', 'After', 'Over']);

export class RssResearchAdapter {
  name = 'rss';
  sample = false;

  async search(topic, date) {
    const feeds = FEEDS[topic.id] || [];
    const out = [];
    for (const url of feeds) {
      try {
        const res = await fetch(url, { headers: { 'user-agent': 'OverCoffee/0.1 (+prototype)' }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const xml = await res.text();
        for (const item of parseItems(xml)) {
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
          const ageH = (new Date(date + 'T07:00:00Z') - new Date(publishedAt)) / 36e5;
          if (ageH > 72 || ageH < -24) continue;
          const publisher = new URL(url).hostname.replace(/^www\.|^feeds\./, '');
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
    return new Set(Object.keys(FEEDS));
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
    items.push({ title: get('title'), link: get('link'), description: get('description'), pubDate: get('pubDate') });
  }
  return items;
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
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
