# Over Coffee — architecture

## Three layers, kept apart

```
ENGINE  ── research + intelligence + editorial decisions      server/engine/*
   │
   ▼
EDITION ── one stored, presentation-neutral object            store.js (editions.doc + normalised tables)
   │
   ▼
DELIVERY ── web · PDF · audio · email · (future channels)      web/js/render/*, server/delivery/*
```

The engine runs once per reader per day. Everything downstream (Business or Social, web or PDF, audio, the depth view) is a rendering of the stored edition. A new channel is a new reader of the edition, never a new research pass.

## The pipeline

| # | Stage | What happens | Cost |
|---|---|---|---|
| 01 | Wake up | Load topics, budget, mode, discovery, any “today only” override | — |
| 02 | Understand | Free-text interests → catalog topics (aliases, typo tolerance) or custom topics | deterministic |
| 03 | Expand | Topic → research areas (AI → companies, releases, regulation, hardware…) | deterministic |
| 04 | Research | Adapter per source family; **cached per adapter × date × topic**, so readers share research | I/O |
| 05–06 | Detect & cluster | Entity overlap + headline similarity, union-find. Five outlets reporting one launch become one event | deterministic |
| — | Assess & extract | Signals (impact, breadth, novelty, flags) and claims with supporting source ids | model (sample: desk fixtures) |
| 07 | Verify | Source credibility; claim status derived from evidence: confirmed / reported / interpreted / emerging / uncertain | deterministic |
| 08 | Prioritize | Weighted score: relevance .30, significance .38, freshness .10, source quality .12, corroboration .10, cross-topic bonus, penalties. Every component is stored | deterministic |
| 09 | Edit | Bar set by budget (5 → .84, 10 → .77, 20 → .62). Words allocated by rank (full / standard / brief); depth is cut before stories. **No padding**; quiet topics are said to be quiet | deterministic |
| 10 | Write | One call per published event writes **both voices** from the verified claims; cached by content hash | model (sample: desk) |
| 11 | Quality gate | Provenance, unsupported figures (every number must appear in the evidence), verbatim quotes, duplication, freshness, budget, language (clickbait / stock AI phrasing / shouting), uncertainty disclosure, clarity, balance, honest silence, checked in both voices. A failing edition is held | deterministic |
| 12 | Generate | Summary, one thing to remember, audio script (~1–2 min) | deterministic |
| 13–14 | Deliver, done | Persist; channels read the stored edition | — |

Model calls are needed only where judgement is (assess/extract, write), and they run on clustered events, not articles. Everything else is cheap and reproducible. Both model steps are cached on their inputs, so re-rendering, re-delivering and switching voice cost nothing.

## Event-first data model

```
Edition ─┬─ config        topics, budget, date, discovery context
         ├─ research      adapter, cache hits/misses, retrieved-at
         ├─ events[]      key, topicWeights, signals, score{…}, decision{status, tier, reason}
         │    └─ claims[] text, kind, status, note, sources[]   ← Claim → Event → Source
         ├─ sources[]     url, title, publisher, type, published/retrieved, excerpt, credibility, heading, role
         ├─ stories[]     eventId, tier, rank, topic, copy{business, social}, depth{timeline, saying, related}, figure
         ├─ sections[]    topic, storyIds, quiet note
         ├─ summary · remember · quiz · audio{business, social}
         ├─ stats         words & minutes per voice, considered/published/held/rejected
         ├─ quality       status, checks[]
         └─ pipeline[]    stage log (ms + note)
```

SQLite tables: `users`, `profiles`, `daily_overrides`, `research_cache`, `editions` (document + indexed columns), `events`, `claims`, `sources`, `stories`, `quality_checks`, `artifacts`. The document is what renderers read. The normalised rows are what audits query (`/api/editions/:id/ledger`, `#/edition/:id`).

## Trust rules the code enforces

- A claim’s status is computed from its sources, never written by the writer.
- Desk/writer material can only cite sources in this edition’s research; quotes from un-researched sources are dropped.
- Low-credibility sources (aggregators, social) stay visible as context but are never used for facts.
- The gate fails on any figure or quote it cannot find in the evidence.
- Sample sources use `sample://` URLs and say so on the source page.

## Live mode

- `OC_RESEARCH=rss`: real RSS feeds per topic, with a deterministic entity extractor so clustering works without a model.
- `OC_WRITER=claude`: `ClaudeWriter` (official `@anthropic-ai/sdk`, `claude-opus-5-5`, structured JSON output, server-side refusal fallback) writes both voices from claims and excerpts. The quality gate then checks its output like any other writer’s. If the call fails, the extractive writer is used: attributed sentences, nothing paraphrased.

## Built for later, not built now

- **Sponsorship.** A sponsor would be its own record (campaign, targeting by topic/geo/edition, creative, dates, approval) attached at delivery as one slot. The engine never reads it, so editorial and advertising cannot touch.
- **Industry editions** (Hazardous Area Daily, Renewable Energy Daily…): a publication = fixed topic set + its own source adapters + its own bar and voice. Same engine, same edition object.
- **Ecosystem** (Sponsor Portal, Mea Creo Workspace, Nova, Atlas): integrate through the edition API and events (edition generated / delivered), never through the reader UI.
- **Desktop app / push / podcast**: further delivery adapters. A server TTS provider slots into `delivery/channels.js#audioPayload`.
