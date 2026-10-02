# Over Coffee

**Good morning. Here’s what matters.**

A personal daily newspaper you can finish over a cup of coffee. Over Coffee researches the reader’s interests, collapses duplicate reporting into events, checks claims against their sources, decides what deserves space within a reading budget, writes the edition in two voices, quality-checks it and delivers it as a finite newspaper on the web, as a PDF and as a short audio summary.

> **Design prototype.** The editions use a sample research corpus. Every organisation, person, quote and figure in it is fictional, and each edition says so. The engine is real; the news is not.

## Run it

```bash
npm start            # http://localhost:4321  (Node ≥ 22.5, no npm install needed)
npm test             # engine tests (node:test)
npm run previews     # renders the four prototype newspapers to samples/*.pdf
```

No runtime dependencies. Storage is SQLite via `node:sqlite`. PDFs use headless Chromium if one is found (`OC_CHROME` to point at one); otherwise the reader gets the print page and the browser’s own “Save as PDF”.

| Env | Default | |
|---|---|---|
| `PORT` | `4321` | |
| `OC_BASE_URL` | `http://localhost:PORT` | Used in PDF short links back to the digital depth layer |
| `OC_DB` | `data/over-coffee.db` | SQLite file |
| `OC_RESEARCH` | `sample` | `rss` switches to live RSS research (behind a proxy, run Node with `NODE_USE_ENV_PROXY=1`) |
| `OC_WRITER` | — | `claude` enables the Claude writer for events the sample desk has no copy for (needs `npm install` for the optional `@anthropic-ai/sdk`, plus credentials) |

## The four prototype editions

Open **`#/compare`** (also linked from the home screen). It shows all four in a 2×2 grid, with Business vs Social and Single vs Multi side by side, and a 5/10/20-minute budget switch. PDFs of each are in [`samples/`](samples/).

| | Single topic: AI | Multi-topic: AI · Food · Farming |
|---|---|---|
| **Business** | Preview 1 | Preview 2 |
| **Social** | Preview 3 | Preview 4 |

Previews 1 and 3 are **one stored edition** rendered twice, and so are 2 and 4. Switching voice never re-researches or re-writes.

## Where things are

```
server/
  index.js              HTTP API, print route, delivery scheduler
  store.js              SQLite: edition documents + normalised audit tables
  engine/
    pipeline.js         the 14 stages, wake-up → done
    topics.js           understand / expand / random / adventurous
    research/           adapters (sample corpus, live RSS) + per-topic cache
    cluster.js          event detection & clustering (deterministic)
    analyst.js          signals + claims per event
    verify.js           source credibility, claim status
    prioritize.js       transparent weighted score
    editor.js           the bar, the budget, depth tiers, quiet sections
    writer.js           desk / Claude / extractive writers, both voices
    quality.js          the quality gate (11 checks, both voices)
    generate.js         summary, one thing to remember, audio script
  delivery/             PDF (headless Chromium), email outbox, audio payload
  data/                 SAMPLE corpus and desk (fictional)
web/
  index.html, js/app.js the reader app (no framework)
  js/render/            pure renderers shared by browser and server (newspaper, story, print, illustration, chart, mark)
  css/                  paper (Business), social, print, base (app shell), self-hosted fonts
docs/ARCHITECTURE.md    engine · edition · delivery, data model, cost, what’s next
```

## App map

`#/` home · `#/welcome` onboarding · `#/read/:edition` newspaper · `#/story/:edition/:story` depth view · `#/source/:edition/:source` original source · `#/topics` · `#/settings` · `#/download` · `#/compare` the four prototypes · `#/edition/:id` how an edition was made (audit)

## Product walkthrough

[`docs/walkthrough/Over-Coffee-Walkthrough.pdf`](docs/walkthrough/Over-Coffee-Walkthrough.pdf): every screen (S01–S36) and the four newspapers (N1–N4) in one document, with a feedback sheet. To regenerate after design changes, start the server and run:

```bash
node scripts/walkthrough/capture.mjs data/walkthrough/shots     # screenshots via Playwright
node scripts/walkthrough/build.mjs   data/walkthrough/shots docs/walkthrough/Over-Coffee-Walkthrough.pdf
```
