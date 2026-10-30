# Launch verification (v0.3.0)

Automated: `npm test` (26 unit/integration tests) and `npm run qa` (35 real-browser checks on an iPhone-size viewport + desktop, last run **35/35**; raw results in `LAUNCH-VERIFICATION.json`).
Statuses are only **PASS** when something actually exercised it. “Sample data” means the check ran against the fictional corpus, not the live web.

## CORE
| Item | Status | How verified |
|---|---|---|
| Signup (valid, weak password, duplicate) | PASS | browser + API tests |
| Login / logout / session persistence | PASS | browser; cookie is HttpOnly; reload keeps session |
| Protected routes and user isolation | PASS | API tests: another reader gets 404 on edition, ledger, hooks, print, email, PDF |
| Onboarding (topic, time, voice, delivery, first edition) | PASS | browser, phone viewport |
| Topic interpretation | PASS | custom topic recognised |
| Topic suggestions | NEEDS ATTENTION | UI, select all, broad-only, add-own PASS. Intelligent areas need `ANTHROPIC_API_KEY`; verified with a stubbed model only. Without a key areas are generic |
| Add / remove topics | PASS | browser |
| Random Topic, Feeling Adventurous | PASS | browser (Change today) |
| Daily Random Topic | NEEDS ATTENTION | “Discovery” setting exists; a dedicated automatic daily-random mode is not built |

## EDITION
| Item | Status | How verified |
|---|---|---|
| Research starts, sources retrieved | PASS | live run against the open web: AI + Farming → 32 articles from real publishers |
| Duplicate stories removed, events clustered | NEEDS ATTENTION | heuristic clustering works (32 articles → 31 events; weak). Model clustering verified with a stub only |
| Editorial selection | PASS | live: 14 of 31 events cleared the bar; budget trimmed to 11 |
| Newspaper generated | PASS | sample and live |
| PDF generated and opened | PASS | rendered, 3 pages, headline text extracted and matched |
| Summary, sources attached | PASS | quick version, 23 sources on sample edition |
| Quality gate | PASS | 12 checks; live run returned *warn* (long sentences in plain extractive copy) and still published, as designed |
| Model-written copy (Business + Conversational) | NOT VERIFIED LIVE | needs an API key; writer code unchanged from prototype and works on sample |

## READING
| Item | Status | How verified |
|---|---|---|
| Front page, page navigation, vertical reading | PASS | real touch events: swipe turns page, scroll does not |
| Page progression indicator | PASS | “2 / 6 · The lead” + dots |
| Learn more, source view, return to the same page | PASS | browser |
| Position restored after reload | PASS | browser |
| Finite end | PASS | last page reached, sign-off shown |

## DESIGN
| Item | Status | Note |
|---|---|---|
| Business / Conversational editions | PASS | both render; copy rewritten for gossip tone (sample) |
| Responsive phone / desktop | PASS | no horizontal overflow; desktop has no pager. Tablet not separately inspected |
| PDF layout | PASS | 3–6 full pages, inspected visually |
| Logo, branding | PASS | wordmark + quiet icon; brand sheet in `docs/brand` |
| Illustrations | NEEDS ATTENTION | generative editorial art per topic; for custom topics it is a generic composition |
| Visual hierarchy | NEEDS ATTENTION | strong on sample; live editions have plain copy and fewer figures/charts (no data to chart) |

## PWA
| Item | Status | How verified |
|---|---|---|
| Manifest, icons (192/512 any + maskable), theme/background | PASS | fetched and validated, icons load |
| Service worker | PASS | activated and controlling |
| Offline | PASS | reload with network off opens the app and today’s edition |
| Installability, standalone launch | NEEDS ATTENTION | all installability criteria are met, but the install prompt and standalone launch need a real phone/desktop; headless cannot click “Install” |

## DELIVERY
| Item | Status | How verified |
|---|---|---|
| Scheduled generation | PASS | scheduler test: prepares and delivers once at the reader’s local time |
| Duplicate prevention, retry | PASS | test: second tick does not resend; failed channel retried up to 3 times |
| Email | NEEDS ATTENTION | writes the message to the outbox; real sending uses Resend and is untested without your key |
| Push, WhatsApp | NOT APPLICABLE | not offered in the product for launch |
| PDF download | PASS | |
| Failure handling | PASS | generation failure shows an error page and the app stays usable; model failure falls back to plain copy |

## SECURITY
Passwords: scrypt, per-user salt. Sessions: random token, only its hash stored, HttpOnly + SameSite=Lax (+Secure on https). Auth endpoints rate-limited. API keys are server-side only. Security headers set. Request bodies capped. PDF render uses a signed per-edition token. Not done: CSRF tokens beyond SameSite, account lockout, email verification, password reset.


## v0.3 upgrade (brand, memory, delivery, sharing)
Automated: `npm test` 36 passing, `npm run qa` 43/43 browser checks. Live-web memory check run by hand (below).

| Item | Status | How verified |
|---|---|---|
| Buttons: calm accent, one primary per screen, AA contrast, focus ring, loading/success states | PASS | computed style in browser: flat colour, contrast 5.04:1; inspected on landing, home, story pages |
| Existing icon, wordmark, fonts, layouts, dashboard, both editions | PASS | unchanged; all earlier checks still pass |
| Editorial memory: new / duplicate / development / recurring | PASS | unit tests; **live web, two consecutive days**: day 2 held back 9 already-covered stories, 0 repeated headlines |
| “What changed since…” on developing stories | PARTIAL | logic and rendering tested; no real development occurred in the live check, so not yet seen with live data |
| Syndicated copies not counted as corroboration | PASS | unit tests (“X on MSN” and same-title copies = one origin) |
| Saved stories, Library, past editions | PASS | browser |
| Relevance feedback (more/less), clear history | PASS | browser + unit; feedback nudges ranking by at most ±0.1 |
| Share one story: public page, real sources, no reader data, social card, revoke | PASS | unit + browser; card PNG rendered by Chromium |
| Failed generation keeps last edition available; failures logged; bounded retries | PASS | unit test with a forced storage failure |
| Never announce a stale or held edition | PASS | scheduler logic, unit-tested |
| Email: unsubscribe + preferences links, one-click `List-Unsubscribe`, consent timestamp | PASS (code) / NOT VERIFIED (provider) | link, signed token, GET-confirm / POST-unsubscribe tested; the Resend call itself needs your key |
| Per-reader time zone, DST | PASS | reader's IANA zone used for delivery time and edition date; selectable in Settings |
| Web push: subscribe/unsubscribe, expired subscription removal, duplicate prevention | PASS (code, stub push service) / NOT VERIFIED end-to-end | needs VAPID keys, HTTPS and a real browser; toggle hidden when not configured |
| Notification opens the correct edition | NOT VERIFIED | service-worker handler written; payload carries the edition URL |
| Entitlements and sponsored placements | PASS (structure) | off by default; labelled; https only; ad-free plan respected; not in stored editions |
| Subscriptions / payments | NOT BUILT | no provider connected; see `COMMERCIAL.md` |
| Analytics: delivery results, returning readers, saves, shares, feedback, ad events | PASS | owner stats endpoint; only real events recorded |
| Landing page + social preview | PASS | how-it-works, editions explained, absolute `og:image` |
| Source photos | NOT BUILT, by decision | feeds give no reuse licence; the app keeps its own generated abstract illustrations (no hotlinking, no failures to handle) |

## Reading times: 3, 5 and 10 minutes (20 retired)
| Item | Status | How verified |
|---|---|---|
| Onboarding, Settings and the lab offer 3 / 5 / 10 only; default 5 | PASS | browser |
| Existing 20-minute readers move to 10 automatically | PASS | unit test (stored profile with 20) |
| Each edition fits its budget; story count grows with the budget; 3 minutes is never empty | PASS | unit test on sample data (2 / 4 / 8 stories) |
| Short editions carry at least 2 / 3 / 4 stories if they clear a quality floor (0.6), at most 3 / 6 / 12 | PASS | unit-tested logic; a genuinely quiet day still produces a short or empty edition |
