# Authoritative source inventory

Source: user-supplied `Proxy-Plane-2.6.5-Local-Art.zip` (152 files). SHA-256 and extraction count: `source-baseline.json`. Imported unchanged into commit `1707c3ffcc2a351a1db2e2de4802ac902a9526ee` before fixes. Older GitHub ZIP remains only a backup; it was not the development baseline. Package version remains 2.6.5.

## Architecture and existing features

- Vite 6 / React 18 JavaScript SPA; state-based navigation in `src/App.jsx`, not a URL router. Actual pages: home, library, deck import, custom studio, Gathering Plane, vault, print, premium, premium decks. Checkout return is a query parameter. There is no TypeScript project or configured lint script.
- `src/Home.jsx`: mobile-first homepage; real page callbacks, offline staples with artist credits, optional community-featured content, private/device workspace and precise credit terms.
- Editor: `CardControls`, `CardRenderer`, `InteractivePreview`, `LayerDesigner`, mana/text/set symbols, original frame treatments, layers, typography, art positioning, uploads, backs, PNG exports. Licensed historical frame templates are not bundled.
- Imports: Scryfall search/printings/faces, deck text and supported URL providers, text-only import, attributed private proxy import. Server deck URL handling uses explicit provider validation. Live Scryfall smoke checks are recorded separately; provider availability is not guaranteed.
- Persistence: IndexedDB/localStorage scoped by authenticated user; guest work is separate and copied only explicitly. Supabase handles account-backed projects, art storage, profiles, collections, community posts/follows and private assets.
- Printing: shared fixed 2.5 × 3.5 inch geometry for preview/PDF, paper/orientation/margins, 9-up Letter/A4 defaults, bleed, guides, duplex alignment, queue editing/removal, calibration, ranges and abortable capture. jsPDF/html-to-image/html2canvas load when export is requested.
- Express 4 API (`server/index.js`), CORS, 12 MiB JSON cap, raw-body signed Stripe webhook, Supabase service client, structured/image AI provider requests and moderation, beta admission/feedback and owner tools. No secrets are supplied to this runtime.
- Local Art Studio: separate loopback Python HTTP service at 127.0.0.1:8765; lazy SDXL model with PyTorch/diffusers; three streamed image candidates and guarded postMessage import. This requires local compute/model setup and is not an iPhone-hosted image model.

## Backend interfaces

`GET /api/health`, `POST /api/decks/import`, `GET /api/premium/catalog`, `GET /api/premium/access`, `GET /api/premium/assets/:pack/:design`, `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`, `POST /api/generate-art`, `POST /api/ai/resketch`, `POST /api/ai/set`, `POST /api/ai/review` plus beta and deck product routes in `server/beta.js` and `server/deckStore.js`. API authorization validates bearer tokens on the server. RLS and storage policies remain a separate enforcement layer.

## Environment requirements (names only)

Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public client key only), `VITE_PRIVATE_BETA=true` for the private-beta gate. Never put service-role, billing or model secrets in VITE variables.

Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN`, `OWNER_USER_ID`, `BETA_MODE=true`, `BETA_AI_ENABLED=false`, `BETA_TEST_BILLING=false`; `PORT` / `HOST`, optionally `SERVE_WEB=true`. For explicitly configured sandbox tests only: `STRIPE_SECRET_KEY` (test restricted/secret key), `STRIPE_WEBHOOK_SECRET`, server-owned `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_STUDIO_PASS`, `STRIPE_PRICE_PACK_*`, `STRIPE_PRICE_CREDITS_{10,30,80}`. Live Stripe credentials and live webhook events are rejected by this candidate. AI secrets/models are server-only: `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OPENAI_TEXT_MODEL`, `OPENAI_SAFETY_MODEL`. Do not enter secret values in chat or commit environment files.

SQL setup order for a fresh disposable test database: schema → community → premium → evolution → credits → beta (see existing setup guides). `evolution.sql` tests exercise the superseded daily policy in isolation; `credits.sql` replaces it with the final 10-once/200-paid-month policy. These files were NOT applied to any hosted database. Existing installations require backup and constraint/migration review first; do not replay setup SQL blindly.

## Reproducibility and tests

Use Node 24 (executed 24.22.1), npm 11 (executed 11.9.0), committed lockfile. `npm ci --ignore-scripts --cache /tmp/proxy-plane-npm-cache`. Existing scripts: build, dev, server/start, community, backs, premium, decks, evolution, print, AI safety, credits, beta. Added `npm test` aggregates 21 groups including 14 JSX fixtures through `test:ui`; `test:browser` and `test:print-browser` are explicit real-browser suites. Playwright 1.65.0 and axe Playwright 4.14.0 are pinned development tools. Browser installation may require `npx playwright install chromium` and OS libraries, or an installed Chromium via `PRINT_BROWSER_EXECUTABLE`.

No lint/type-check pass is claimed: neither is configured. Vite/esbuild compilation, JavaScript syntax checks, npm audit, PGlite SQL authorization fixtures, Express mocked integration tests, jsdom React tests and Chromium assertions provide distinct evidence. No app test touches real card payments or a production database.

Durable AI recovery: `server/aiRecovery.js`, `supabase/ai_recovery.sql`, private service-only operation ledger; reserve/debit is atomic, result saves precede success, UUID retries are duplicate-safe, expired leases refund, and failed refunds retry. Metadata-only recent-request lists and owner-authorized result retrieval support recovery UI. No hosted migration was executed.
