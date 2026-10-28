// Persistence. SQLite via node:sqlite (no native dependency).
//
// Editions are stored twice on purpose:
//   - the full edition document (what renderers read; immutable once delivered)
//   - normalised rows for events, sources, claims, stories and quality checks
//     (what audits, analytics and future products query)

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  email TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
-- Lightweight launch analytics: one row per event, no third parties.
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  name TEXT NOT NULL,
  props TEXT,
  at TEXT NOT NULL
);
-- One row per edition per channel: prevents duplicate delivery, drives retries.
CREATE TABLE IF NOT EXISTS deliveries (
  user_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,            -- sent | failed
  attempts INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, edition_id, channel)
);
-- What each reader has already been told (editorial memory).
CREATE TABLE IF NOT EXISTS story_memory (
  user_id TEXT NOT NULL,
  story_key TEXT NOT NULL,
  first_date TEXT NOT NULL,
  last_date TEXT NOT NULL,
  headline TEXT,
  fp TEXT NOT NULL,
  times INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, story_key)
);
CREATE TABLE IF NOT EXISTS saved_stories (
  user_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  headline TEXT,
  topic TEXT,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, edition_id, story_id)
);
CREATE TABLE IF NOT EXISTS feedback (
  user_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  signal TEXT NOT NULL,            -- more | less
  at TEXT NOT NULL,
  PRIMARY KEY (user_id, edition_id, story_id)
);
CREATE TABLE IF NOT EXISTS generation_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  error TEXT,
  at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keys TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  advertiser TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT,
  url TEXT NOT NULL,
  topic_ids TEXT,                  -- JSON array; empty = any
  starts TEXT,
  ends TEXT,
  max_per_edition INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- "Change Daily": topics for one day only, without touching the profile.
CREATE TABLE IF NOT EXISTS daily_overrides (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);
-- Research once: per adapter, per date, per topic. Also caches writer output.
CREATE TABLE IF NOT EXISTS research_cache (
  key TEXT PRIMARY KEY,
  adapter TEXT NOT NULL,
  created_at TEXT NOT NULL,
  json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS editions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,              -- daily | preview
  editorial_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  budget_minutes INTEGER NOT NULL,
  topics TEXT NOT NULL,
  sample INTEGER NOT NULL,
  quality_status TEXT NOT NULL,
  doc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS editions_user_date ON editions(user_id, editorial_date);
CREATE TABLE IF NOT EXISTS events (
  id TEXT NOT NULL,
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT,
  primary_topic TEXT,
  status TEXT,
  score REAL,
  decision TEXT,
  decision_reason TEXT,
  PRIMARY KEY (edition_id, id)
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT NOT NULL,
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  event_id TEXT,
  url TEXT, title TEXT, publisher TEXT, source_type TEXT,
  published_at TEXT, retrieved_at TEXT, credibility REAL,
  PRIMARY KEY (edition_id, id)
);
CREATE TABLE IF NOT EXISTS claims (
  id TEXT NOT NULL,
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  text TEXT, kind TEXT, status TEXT, source_ids TEXT,
  PRIMARY KEY (edition_id, event_id, id)
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT NOT NULL,
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  tier TEXT, rank INTEGER, topic_id TEXT,
  PRIMARY KEY (edition_id, id)
);
CREATE TABLE IF NOT EXISTS quality_checks (
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  PRIMARY KEY (edition_id, check_id)
);
-- Delivery artifacts (PDF files, email payloads). Rendered lazily, cached.
CREATE TABLE IF NOT EXISTS artifacts (
  edition_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  mode TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (edition_id, kind, mode)
);
`;

export class Store {
  constructor(file = process.env.OC_DB || path.resolve(process.env.OC_DATA || 'data', 'over-coffee.db')) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
    // Additive migrations (safe on existing databases).
    const cols = this.db.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name);
    if (!cols.includes('plan')) this.db.exec("ALTER TABLE accounts ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'");
  }

  // ── settings (persistent secrets etc.) ──
  getSetting(key) {
    return this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;
  }
  setSetting(key, value) {
    this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  // ── editorial memory ──
  listMemory(userId) {
    return this.db.prepare('SELECT story_key AS key, first_date AS firstDate, last_date AS lastDate, headline, fp, times FROM story_memory WHERE user_id = ?').all(userId).map((r) => ({ ...r, fp: JSON.parse(r.fp) }));
  }
  upsertMemory(userId, key, date, headline, fp) {
    this.db
      .prepare(
        `INSERT INTO story_memory (user_id, story_key, first_date, last_date, headline, fp, times) VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(user_id, story_key) DO UPDATE SET last_date = excluded.last_date, headline = excluded.headline, fp = excluded.fp, times = times + 1`,
      )
      .run(userId, key, date, date, headline, JSON.stringify(fp));
  }

  // ── saved stories, feedback ──
  saveStory(userId, editionId, storyId, headline, topic) {
    this.db.prepare('INSERT OR REPLACE INTO saved_stories (user_id, edition_id, story_id, headline, topic, saved_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, editionId, storyId, headline, topic, this.now());
  }
  unsaveStory(userId, editionId, storyId) {
    this.db.prepare('DELETE FROM saved_stories WHERE user_id = ? AND edition_id = ? AND story_id = ?').run(userId, editionId, storyId);
  }
  listSaved(userId) {
    return this.db.prepare('SELECT edition_id AS editionId, story_id AS storyId, headline, topic, saved_at AS savedAt FROM saved_stories WHERE user_id = ? ORDER BY saved_at DESC LIMIT 200').all(userId);
  }
  setFeedback(userId, editionId, storyId, topic, subtopic, signal) {
    this.db.prepare('INSERT OR REPLACE INTO feedback (user_id, edition_id, story_id, topic, subtopic, signal, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, editionId, storyId, topic, subtopic, signal, this.now());
  }
  feedbackFor(userId) {
    return this.db.prepare('SELECT edition_id AS editionId, story_id AS storyId, topic, subtopic, signal FROM feedback WHERE user_id = ?').all(userId);
  }
  /** Net relevance signal per topic and subtopic, from explicit reader feedback only. */
  affinity(userId) {
    const out = { topics: {}, subtopics: {} };
    for (const f of this.feedbackFor(userId)) {
      const v = f.signal === 'more' ? 1 : -1;
      if (f.topic) out.topics[f.topic] = (out.topics[f.topic] || 0) + v;
      if (f.subtopic) out.subtopics[f.subtopic] = (out.subtopics[f.subtopic] || 0) + v;
    }
    return out;
  }
  clearPersonalisation(userId) {
    for (const t of ['feedback', 'story_memory', 'saved_stories']) this.db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
  }

  // ── failures ──
  logFailure(userId, date, error) {
    this.db.prepare('INSERT INTO generation_failures (user_id, date, error, at) VALUES (?, ?, ?, ?)').run(userId, date, String(error).slice(0, 400), this.now());
  }
  failureCount(userId, date) {
    return this.db.prepare('SELECT COUNT(*) AS n FROM generation_failures WHERE user_id = ? AND date = ?').get(userId, date).n;
  }
  latestEditionAny(userId, kind = 'daily') {
    const r = this.db.prepare('SELECT id FROM editions WHERE user_id = ? AND kind = ? ORDER BY editorial_date DESC, generated_at DESC LIMIT 1').get(userId, kind);
    return r ? this.getEdition(r.id) : null;
  }

  // ── shares ──
  createShare(token, userId, editionId, storyId) {
    this.db.prepare('INSERT INTO shares (token, user_id, edition_id, story_id, created_at) VALUES (?, ?, ?, ?, ?)').run(token, userId, editionId, storyId, this.now());
  }
  getShare(token) {
    return this.db.prepare('SELECT token, user_id AS userId, edition_id AS editionId, story_id AS storyId, revoked FROM shares WHERE token = ?').get(token) || null;
  }
  revokeShare(token, userId) {
    return this.db.prepare('UPDATE shares SET revoked = 1 WHERE token = ? AND user_id = ?').run(token, userId).changes;
  }

  // ── push subscriptions ──
  savePush(userId, endpoint, keys) {
    this.db.prepare('INSERT INTO push_subscriptions (endpoint, user_id, keys, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys').run(endpoint, userId, JSON.stringify(keys), this.now());
  }
  listPush(userId) {
    return this.db.prepare('SELECT endpoint, keys FROM push_subscriptions WHERE user_id = ?').all(userId).map((r) => ({ endpoint: r.endpoint, keys: JSON.parse(r.keys) }));
  }
  deletePush(endpoint) {
    this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  }

  // ── plan ──
  planOf(userId) {
    return this.db.prepare('SELECT plan FROM accounts WHERE user_id = ?').get(userId)?.plan || 'free';
  }

  // ── stats for the owner ──
  deliveryStats() {
    return this.db.prepare('SELECT channel, status, COUNT(*) AS n FROM deliveries GROUP BY channel, status').all();
  }
  editionStats() {
    return {
      generated: this.db.prepare("SELECT COUNT(*) AS n FROM editions WHERE kind = 'daily'").get().n,
      failures: this.db.prepare('SELECT COUNT(*) AS n FROM generation_failures').get().n,
      returning7d: this.db.prepare("SELECT COUNT(*) AS n FROM (SELECT user_id FROM analytics WHERE name = 'edition_opened' AND at > datetime('now','-7 day') GROUP BY user_id HAVING COUNT(DISTINCT substr(at,1,10)) >= 2)").get().n,
    };
  }

  now() {
    return new Date().toISOString();
  }

  // ── users & profiles ──
  ensureUser(id, name, defaults) {
    const u = this.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!u) {
      this.db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(id, name, this.now());
      if (defaults) this.saveProfile(id, defaults);
    }
  }
  // ── accounts & sessions ──
  createAccount(id, email, pwHash, name, defaults) {
    this.ensureUser(id, name, defaults);
    this.db.prepare('INSERT INTO accounts (user_id, email, pw_hash, created_at) VALUES (?, ?, ?, ?)').run(id, email, pwHash, this.now());
  }
  accountByEmail(email) {
    return this.db.prepare('SELECT user_id AS userId, email, pw_hash AS pwHash FROM accounts WHERE email = ?').get(email) || null;
  }
  accountById(userId) {
    return this.db.prepare('SELECT user_id AS userId, email FROM accounts WHERE user_id = ?').get(userId) || null;
  }
  createSession(tokenHash, userId, expiresAt) {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  }
  sessionUser(tokenHash) {
    const r = this.db.prepare('SELECT user_id AS userId, expires_at AS exp FROM sessions WHERE token_hash = ?').get(tokenHash);
    if (!r) return null;
    if (r.exp < this.now()) {
      this.deleteSession(tokenHash);
      return null;
    }
    return r.userId;
  }
  deleteSession(tokenHash) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }
  onboardedUsers() {
    return this.db
      .prepare('SELECT a.user_id AS userId FROM accounts a')
      .all()
      .map((r) => r.userId);
  }

  // ── analytics & deliveries ──
  logEvent(userId, name, props) {
    this.db.prepare('INSERT INTO analytics (user_id, name, props, at) VALUES (?, ?, ?, ?)').run(userId || null, name, props ? JSON.stringify(props) : null, this.now());
  }
  analyticsSummary() {
    return this.db.prepare('SELECT name, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users FROM analytics GROUP BY name ORDER BY n DESC').all();
  }
  getDelivery(userId, editionId, channel) {
    return this.db.prepare('SELECT status, attempts, detail FROM deliveries WHERE user_id = ? AND edition_id = ? AND channel = ?').get(userId, editionId, channel) || null;
  }
  recordDelivery(userId, editionId, channel, status, detail) {
    this.db
      .prepare(
        `INSERT INTO deliveries (user_id, edition_id, channel, status, attempts, detail, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(user_id, edition_id, channel) DO UPDATE SET status = excluded.status, attempts = attempts + 1, detail = excluded.detail, updated_at = excluded.updated_at`,
      )
      .run(userId, editionId, channel, status, detail ? String(detail).slice(0, 300) : null, this.now());
  }

  getProfile(userId) {
    const r = this.db.prepare('SELECT json FROM profiles WHERE user_id = ?').get(userId);
    return r ? JSON.parse(r.json) : null;
  }
  saveProfile(userId, profile) {
    this.db
      .prepare('INSERT INTO profiles (user_id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at')
      .run(userId, JSON.stringify(profile), this.now());
    return profile;
  }

  getOverride(userId, date) {
    const r = this.db.prepare('SELECT json FROM daily_overrides WHERE user_id = ? AND date = ?').get(userId, date);
    return r ? JSON.parse(r.json) : null;
  }
  setOverride(userId, date, value) {
    if (!value) return this.db.prepare('DELETE FROM daily_overrides WHERE user_id = ? AND date = ?').run(userId, date);
    this.db
      .prepare('INSERT INTO daily_overrides (user_id, date, json) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET json = excluded.json')
      .run(userId, date, JSON.stringify(value));
  }

  // ── research cache ──
  getResearchCache(key) {
    const r = this.db.prepare('SELECT json FROM research_cache WHERE key = ?').get(key);
    return r ? JSON.parse(r.json) : null;
  }
  putResearchCache(key, adapter, value) {
    this.db
      .prepare('INSERT INTO research_cache (key, adapter, created_at, json) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json, created_at = excluded.created_at')
      .run(key, adapter, this.now(), JSON.stringify(value));
  }

  // ── editions ──
  saveEdition(ed) {
    const tx = (fn) => {
      this.db.exec('BEGIN');
      try {
        fn();
        this.db.exec('COMMIT');
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
    };
    tx(() => {
      this.db.prepare('DELETE FROM editions WHERE id = ?').run(ed.id);
      this.db.prepare('DELETE FROM artifacts WHERE edition_id = ?').run(ed.id);
      this.db
        .prepare(
          'INSERT INTO editions (id, user_id, kind, editorial_date, generated_at, engine_version, budget_minutes, topics, sample, quality_status, doc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(ed.id, ed.userId, ed.kind, ed.editorialDate, ed.generatedAt, ed.engineVersion, ed.config.budgetMinutes, ed.topics.map((t) => t.id).join(','), ed.sample ? 1 : 0, ed.quality.status, JSON.stringify(ed));
      const ev = this.db.prepare('INSERT INTO events (id, edition_id, key, title, primary_topic, status, score, decision, decision_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const cl = this.db.prepare('INSERT INTO claims (id, edition_id, event_id, text, kind, status, source_ids) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const e of ed.events) {
        ev.run(e.id, ed.id, e.key, e.title, e.primaryTopic, e.status, e.score.total, e.decision.status, e.decision.reason);
        for (const c of e.claims) cl.run(c.id, ed.id, e.id, c.text, c.kind, c.status, c.sources.join(','));
      }
      const so = this.db.prepare('INSERT INTO sources (id, edition_id, event_id, url, title, publisher, source_type, published_at, retrieved_at, credibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of ed.sources) so.run(s.id, ed.id, s.eventId, s.url, s.title, s.publisher, s.sourceType, s.publishedAt, s.retrievedAt, s.credibility.score);
      const st = this.db.prepare('INSERT INTO stories (id, edition_id, event_id, tier, rank, topic_id) VALUES (?, ?, ?, ?, ?, ?)');
      for (const s of ed.stories) st.run(s.id, ed.id, s.eventId, s.tier, s.rank, s.topicId);
      const qc = this.db.prepare('INSERT INTO quality_checks (edition_id, check_id, status, detail) VALUES (?, ?, ?, ?)');
      for (const c of ed.quality.checks) qc.run(ed.id, c.id, c.status, c.detail);
    });
    return ed;
  }

  getEdition(id) {
    const r = this.db.prepare('SELECT doc FROM editions WHERE id = ?').get(id);
    return r ? JSON.parse(r.doc) : null;
  }

  latestEdition(userId, date, kind = 'daily') {
    const r = this.db.prepare('SELECT doc FROM editions WHERE user_id = ? AND editorial_date = ? AND kind = ? ORDER BY generated_at DESC LIMIT 1').get(userId, date, kind);
    return r ? JSON.parse(r.doc) : null;
  }

  listEditions(userId, limit = 30) {
    return this.db
      .prepare('SELECT id, kind, editorial_date, generated_at, budget_minutes, topics, sample, quality_status FROM editions WHERE user_id = ? ORDER BY generated_at DESC LIMIT ?')
      .all(userId, limit)
      .map((r) => ({ ...r }));
  }

  /** Audit query straight off the normalised tables. */
  editionLedger(id) {
    return {
      events: this.db.prepare('SELECT * FROM events WHERE edition_id = ? ORDER BY score DESC').all(id).map((r) => ({ ...r })),
      claimsByStatus: this.db.prepare('SELECT status, COUNT(*) AS n FROM claims WHERE edition_id = ? GROUP BY status').all(id).map((r) => ({ ...r })),
      sourcesByType: this.db.prepare('SELECT source_type, COUNT(*) AS n FROM sources WHERE edition_id = ? GROUP BY source_type ORDER BY n DESC').all(id).map((r) => ({ ...r })),
    };
  }

  // ── artifacts ──
  getArtifact(editionId, kind, mode) {
    const r = this.db.prepare('SELECT path FROM artifacts WHERE edition_id = ? AND kind = ? AND mode = ?').get(editionId, kind, mode);
    return r && fs.existsSync(r.path) ? r.path : null;
  }
  putArtifact(editionId, kind, mode, file) {
    this.db
      .prepare('INSERT INTO artifacts (edition_id, kind, mode, path, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(edition_id, kind, mode) DO UPDATE SET path = excluded.path, created_at = excluded.created_at')
      .run(editionId, kind, mode, file, this.now());
  }
}
