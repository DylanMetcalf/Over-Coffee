# Subscriptions, advertising, messaging: what exists and what does not

## Today
- **Accounts have a `plan`** (`free` by default; existing accounts were migrated to `free`). `server/entitlements.js` defines what each plan can do. **Every plan can do everything today.** The only difference is that the `supporter` plan never shows sponsored placements. No prices or benefits have been invented; override the table with `OC_PLANS_JSON` when you decide terms.
- **No payment provider is connected.** Nothing in the app can take money or change a plan; a reader cannot upgrade or cancel through the UI, and the app does not pretend otherwise. To change a plan today: `UPDATE accounts SET plan='supporter' WHERE email='…'` on the database.
- **Account deletion:** not built. Readers can clear their personalisation history (Settings). Full deletion is a manual database operation until built.

## Adding payments (when you decide to)
Integration points, in order: (1) add `POST /api/billing/checkout` (create a hosted-checkout session with the provider, e.g. Stripe, and return its URL), (2) add a signed webhook endpoint that sets `accounts.plan` from verified provider events only, (3) add a "Plan" row in Settings with the provider's customer-portal link for cancellation and invoices. Keep all provider keys in environment variables. Test with the provider's test mode before enabling.

## Advertising
Built as a **separate, off-by-default layer**; the editorial pipeline never sees it and no ad is ever written into a stored edition.
- Enabled only when `OC_ADS=on`, the reader's plan allows ads, and an **active** campaign matches (`sponsors` table: advertiser, headline, body, https URL, optional topic filter, start/end dates, status).
- Rendered as one clearly labelled **“Sponsored · Advertiser”** block (dashed border, grey, no accent colour) after the first section (Business) or the lead story (Conversational). Not in PDFs or emails.
- Clicks go through `/ad/:id/click` (logged, https targets of active campaigns only). Impressions are logged when the paper is opened with a placement. Both appear in `/api/admin/stats`.
- There is no campaign admin UI. Add a campaign with SQL, e.g.:
  `INSERT INTO sponsors (id, advertiser, headline, body, url, status) VALUES ('c1','Acme','Try Acme','One line.','https://acme.example','active');`
- Not built: frequency caps beyond one placement per edition, reporting UI, an ad network. Evaluate any network for privacy and policy fit before connecting one.

## Messaging (SMS / WhatsApp)
Not implemented, deliberately. Requirements before adding: explicit opt-in with a stored consent record, number validation, STOP/opt-out handling, per-message provider cost, duplicate protection (the `deliveries` table already supports per-channel records), and a link to the correct edition. WhatsApp additionally needs approved message templates through the WhatsApp Business Platform. Fix email and push first.
