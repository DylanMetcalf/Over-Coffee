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
  constructor(file = process.env.OC_DB || path.resolve('data/over-coffee.db')) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
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
