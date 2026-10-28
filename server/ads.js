// Sponsored placements. Kept completely apart from the editorial pipeline:
// nothing here is written into a stored edition, ranking never sees it, and it
// only appears when (a) OC_ADS=on, (b) the reader's plan allows ads, and (c) an
// active campaign matches. With no campaigns, nothing renders. Ever.

import crypto from 'node:crypto';
import { entitlementsFor } from './entitlements.js';

const safeUrl = (u) => {
  try {
    return new URL(u).protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
};

export function pickSponsored({ store, user, plan, topicIds, date, editionId, env = process.env }) {
  if (env.OC_ADS !== 'on' || !entitlementsFor(plan, env).ads) return null;
  const rows = store.db.prepare("SELECT * FROM sponsors WHERE status = 'active' AND (starts IS NULL OR starts <= ?) AND (ends IS NULL OR ends >= ?)").all(date, date);
  const eligible = rows.filter((r) => safeUrl(r.url) && (() => { const t = JSON.parse(r.topic_ids || '[]'); return !t.length || t.some((x) => topicIds.includes(x)); })());
  if (!eligible.length) return null;
  const pick = eligible[parseInt(crypto.createHash('sha256').update(date + user).digest('hex').slice(0, 8), 16) % eligible.length];
  return { id: pick.id, label: 'Sponsored', advertiser: pick.advertiser, headline: pick.headline, body: pick.body || '', href: `/ad/${encodeURIComponent(pick.id)}/click?e=${encodeURIComponent(editionId)}` };
}

export function clickTarget(store, id) {
  const r = store.db.prepare("SELECT url FROM sponsors WHERE id = ? AND status = 'active'").get(id);
  return r && safeUrl(r.url);
}
