# Over Coffee — launch guide

**Version 0.3.0 (private beta).** One Node service, one SQLite file, Chromium for PDFs. Built for 10–50 real readers.

## YOU NEED TO DO THIS (shortest path)

Nothing below can be done from the build environment because it needs your accounts.

1. **Pick a host and deploy** (≈10 min). Fly.io is the tested config:
   ```
   fly launch --no-deploy --copy-config     # accept fly.toml; change the app name if asked
   fly volumes create oc_data --size 1 --region jnb
   fly secrets set \
     ANTHROPIC_API_KEY=sk-ant-...           # editions need this for real writing (see below)
     RESEND_API_KEY=re_...                  # for email delivery (resend.com, free tier is fine)
     OC_EMAIL_FROM="Over Coffee <hello@yourdomain.com>"   # a verified sender in Resend
     OC_BASE_URL=https://over-coffee.fly.dev              # your real https URL (used in emails)
     OC_ADMIN_TOKEN=$(openssl rand -hex 16) OC_SECRET=$(openssl rand -hex 32)
   fly deploy
   ```
   Render alternative: New → Blueprint → this repo (`render.yaml`), then set the same secrets.
2. **Open the URL, create your account**, finish onboarding, wait for your first edition.
3. **Install it** (below), read it, send the URL to testers.

Without `ANTHROPIC_API_KEY` the app still works, but editions are plain headlines + snippets (no synthesis, no gossip voice, generic topic suggestions). Treat that as a fallback, not the product.

### Environment variables
| Variable | Needed | Purpose |
|---|---|---|
| `OC_BASE_URL` | yes | Public https URL; used in emails and PDF links |
| `ANTHROPIC_API_KEY` | strongly | Model triage (clusters, claims), topic areas, article writing in both voices |
| `OC_WRITER=claude` | strongly | Turns on the model writer (set in `fly.toml`) |
| `RESEND_API_KEY`, `OC_EMAIL_FROM` | for email | Real email delivery. Without them, emails are written to `/data/outbox` only |
| `OC_RESEARCH=rss` | set by Docker | Live research. `sample` = fictional demo data |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for push | Browser notifications. Generate once: `npx web-push generate-vapid-keys`; subject is `mailto:you@yourdomain`. Without them the notification toggle is simply not shown |
| `OC_ADS=on` | optional | Allows sponsored placements. Off by default; with no active campaign nothing renders (see `COMMERCIAL.md`) |
| `OC_PLANS_JSON` | optional | Override plan entitlements once pricing is decided |
| `OC_ADMIN_TOKEN` | optional | `GET /api/admin/stats` with header `x-admin-token` shows launch signals |
| `OC_SECRET` | recommended | Signs PDF render tokens (random per start if unset) |
| `OC_TRIAGE_MODEL`, `OC_WRITER_MODEL` | optional | Override cheap/strong models (defaults: Haiku 4.5 for triage and suggestions, Opus 5.5 for writing) |

### Install as an app (PWA)
- **iPhone (Safari):** Share → *Add to Home Screen*. Must be Safari.
- **Android (Chrome):** menu → *Install app*, or the *Install app* button on the Download page.
- **Desktop (Chrome/Edge):** install icon in the address bar, or the Download page button.
It opens full screen with the Over Coffee icon; the last edition you opened still works offline.

### What is real and what is not
- **Real:** accounts, per-reader isolation, onboarding, live research from the open web for any topic, model triage/writing (with a key), Business + Conversational voices, phone page-swipe reading, depth layer with sources, PDF, email (with Resend), PWA + offline, quality gate, analytics.
- **Sample only:** the *Newspaper lab* and logged-out sample paper use fictional data and are labelled so.
- **Built, needs your configuration to verify in production:** web push (needs VAPID keys, HTTPS, a real browser; code and subscription handling are tested with a stub push service), email delivery (needs Resend), sponsored placements (needs campaigns).
- **Not built (deferred):** WhatsApp/SMS delivery, audio file (the listen button uses the device voice), password reset by email, account deletion UI, payments.

### Known risks to decide on before widening beyond friends
1. **News source licence.** Live research uses Bing News RSS (plus a few publisher feeds). That feed is licensed for personal, non-commercial use. Fine for a private beta; replace with a licensed news/search API before a public or paid launch (one file: `server/engine/research/rss.js`).
2. **Headline + snippet only.** The pipeline works from headlines and short snippets, not full articles, so stories are short and hedged by design. Full-text retrieval is the biggest quality upgrade.
3. **Cost.** Roughly one triage call (cheap model) plus one writer call per published story per edition, cached per event across readers. Watch the first week of usage in your Anthropic console.
4. **SQLite on one volume.** Fine for dozens of readers. Back up `/data` (`fly ssh sftp get /data/over-coffee.db`).

## Operations
- Health: `GET /healthz` (research mode, writer, PDF ok).
- Logs: `fly logs`. Startup prints which integrations are active and warns about missing ones.
- Launch signals: `curl -H "x-admin-token: $OC_ADMIN_TOKEN" https://YOUR-URL/api/admin/stats` (signup, onboarding_completed, edition_opened, edition_completed, learn_more_opened, source_opened, pwa_installed, topics_changed, mode_changed, pdf_downloaded).
- Re-verify after any deploy: `OC_URL=https://YOUR-URL npm run qa` (35 browser checks; creates test accounts).

## Version
`0.3.0`. Existing accounts, profiles and editions are preserved: all database changes are additive (new tables, one new column with a default).
