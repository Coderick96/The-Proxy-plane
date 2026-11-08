# Security audit — authoritative 2.6.5 Local Art baseline

Date: 2026-11-07. Reviewer: security_audit specialist. This document distinguishes source inspection from executed verification. No external accounts, payments, SQL migrations or user data were changed.

## Confirmed baseline findings

| ID | Priority | Status at baseline | Evidence | Minimal correction |
|---|---|---|---|---|
| SEC-01 | P1 | FAIL (source inspection; execution pending dependency install) | `supabase/premium.sql:27`, `:36`, `supabase/evolution.sql:77`: comma-separated `if sku=...` expressions are invalid PL/pgSQL. | Replace with `IN (...)`; exercise the full schema sequence in local PGlite, including reruns. |
| SEC-02 | P1 | FAIL (source inspection) | `server/index.js:27-28`: live billing is blocked only when `BETA_MODE=true`. Omitting that flag permits configured live Stripe credentials to reach checkout/portal; webhook at `:19-22` has no mode check. `server/premium.js:13` creates a Stripe client from any configured key. | Fail closed for live credentials independently of beta mode, require explicit test billing opt-in, reject live webhook events before fulfillment, and test zero downstream calls. |
| SEC-03 | P2 | FAIL (source inspection) | `src/premiumCatalog.js:6` advertises `starterLimit:15`; `supabase/credits.sql:8,29,52` implements ten. Several tests still expect fifteen and retired 100-credit offers. | Align fresh-account UI/test expectations with ten; preserve existing stored balances and legacy purchase revocation. |
| SEC-04 | P2 | BLOCKED durability verification | `server/index.js:52-55` reserves credits, calls the provider, then refunds on a caught error. A process exit after reservation or a failed refund RPC has no durable retry/reconciliation worker. | Before expanding beta, add durable operation status and stale-reservation reconciliation; exercise process restart and transient refund failure. Do not treat the per-process pending set as distributed concurrency protection. |
| SEC-05 | P2 | NOT TESTED operational controls | Runtime has no configured application service credentials. Real Supabase Data API grants, storage service metadata/quota behavior, OAuth provider settings, session revocation and Stripe endpoint configuration have not been observed. | Verify two real test accounts in a dedicated nonproduction project and a Stripe sandbox; keep service-role and payment keys server-only. |

## Source-reviewed protections

- `server/premium.js:user` calls Supabase `auth.getUser(token)` before returning an account; authorization uses that returned ID, not a body-supplied owner. Beta membership is checked server-side via `pp_beta_claim`.
- `schema.sql` has owner-scoped project RLS and private art storage with folder ownership checks. `community.sql` separates editable private JSON from rendered publication metadata and snapshots; effective public access additionally requires public profile and collection.
- Grants, receipts, credit mutation RPCs and upload tickets are revoked from anonymous/authenticated clients. Service-role mutation functions explicitly grant execution to the service role; server-issued deck downloads check account entitlements before issuing a short-lived URL.
- Credit spend functions serialize on the auth user row. Receipts and ledger references are unique; monthly invoice periods are unique/nonoverlapping; refund functions keep a refunded marker. Local PGlite tests subsequently exercised these protections; hosted Supabase configuration remains unverified.
- Webhook uses raw bytes and official Stripe signature verification before fulfillment. Purchases are granted through server-resolved customer ownership and Stripe prices, not a success-page assertion.
- Deck URL imports only construct requests for four fixed HTTPS provider hosts and use manual redirects, timeout and a response-size cap (`server/deckImport.js`).
- Cloud AI safety checks run before spending and after output, charge one credit for three art choices, and invoke database refund on caught failures. Actual provider output and availability are unverified.
- The local Python art studio binds loopback and requires host/origin/content type for generation. Its GPU/model execution, provider licensing and real-device behavior are NOT TESTED.

## Verification boundaries

Local Postgres-emulation tests are not proof of hosted Supabase configuration. Mock Stripe events are not a successful hosted checkout or subscription lifecycle. No live payment call is authorized. No physical or iPhone print accuracy can be certified by this review.

## References consulted

- Supabase skill and current RLS documentation via `supabase_search_docs`, including SQL function execution privileges, ownership predicates and security-definer risks.
- Stripe best-practices/security skill and current webhook/Billing testing documentation via `stripe_search_stripe_documentation`; signature validation, duplicate event handling, test/live mode separation, and sandbox vs synthetic event boundaries.
- Supabase changelog fetch was attempted with curl but failed to reach the inherited proxy; no changelog freshness claim is made.

## Executed syntax checks

PASS: `node --check` executed for all seven `server/*.js` modules. PASS: Python `ast.parse` executed for `local-art-studio/app.py` and `renderer.py`. These checks do not import dependencies, execute SQL, run generation, or establish external integration correctness.

## Candidate corrections

- SEC-01: corrected `IN (...)` PL/pgSQL predicates in `premium.sql` and `evolution.sql`; no remote database was touched.
- SEC-02: the server now constructs Stripe clients only for `sk_test_`/`rk_test_` credentials. Checkout, portal, catalogs and paid deck publication use a shared test-only guard. Private-beta sales additionally require `BETA_TEST_BILLING=true`. Webhooks accept only signature-verified events with `livemode:false`, independent of the sales opt-in so refunds/cancellations can still reconcile after sales are disabled. The fulfillment service also rejects live/missing-mode events when called directly.
- SEC-03: fresh-account UI/test expectations now use ten starter credits and the current 10/30/80 offers. Existing persisted balances are not modified. The retired `credits_100` receipt remains revocable/refundable without re-enabling its sale; regression fixture models an existing ledger entry.
- Added `tests/billing-test-mode.mjs` for live/missing/restricted credential cases, signed live/missing-mode event rejection and no-downstream-call assertions.
- Corrected stale `premium-server.mjs` fixtures so one-time prices are not incorrectly recurring, the Premium price matches the published amount, the retired offer is unavailable, and all accounts receive three artwork choices as implemented.

Initial candidate test execution attempted eight files but dependencies were still installing; all eight exited with `ERR_MODULE_NOT_FOUND`. These attempts are BLOCKED, not test assertion failures and not passes. Logs: `/tmp/proxy-security-{premium-db,credits-db,beta-db,billing-test-mode,premium-server,monthly-billing,deck-store-server,beta-server}.log`. Later reruns completed after installation; see the final verification table below. Early socket tests also hit sandbox `listen EPERM`; socket-enabled lead reruns then passed.

## Final verification of owned changes

| Finding/test | Candidate result | Evidence and limits |
|---|---|---|
| SEC-01 schema syntax and repeatability | PASS (local PostgreSQL emulation) | `node tests/premium-db.mjs`, `node tests/credits-db.mjs`, `node tests/beta-db.mjs` executed successfully; repeated schema installations and RLS exercised. Reviewer-local logs `/tmp/proxy-security-{premium-db,credits-db,beta-db}.log`. |
| SEC-02 test-only guard | PASS (local HTTP + mock Stripe) | Lead executed `npm test` with socket permission. `billing-test-mode` group passed live/missing key rejection, test/restricted key acceptance, signed live/missing-mode event denial and no-fulfillment-call assertions. Raw log `/tmp/proxy-plane-candidate-network-tests.log`. This is executed lead evidence, not a separate specialist rerun of the socket test. |
| SEC-03 credit policy alignment | PASS (local PGlite) | Fresh account ten, monthly two hundred, paid wallet persistence, idempotent refunds and legacy credits_100 receipt revocation pass the owned database tests. No existing account balances were changed. |
| Monthly invoice checks | PASS (mock Stripe) | Specialist ran `node tests/monthly-billing.mjs`; owner/price/paid-status/cycle/interval/proration checks pass. |
| Backend auth, actual signature algorithm and AI refunds | PASS (local HTTP + mock services/providers) | Lead `npm test` groups `premium-server`, `beta-server`, `deck-store-server`, `ai-safety` passed; uses official Stripe SDK signature verification but no hosted checkout. Free and Premium artwork both return three choices per one-credit request. |
| SEC-04 durable AI recovery | BLOCKED / remains open | A process can exit after committed credit reservation; caught-error refund RPC can fail. There is no durable reconciliation worker in this candidate. No claim of crash-safe credit delivery. |
| SEC-05 hosted integrations | BLOCKED | Hosted Supabase, Google/Apple/email provider callbacks and real Stripe sandbox purchases/refunds/subscriptions were not run. Requires nonproduction credentials/settings. |

The aggregate `npm test` run recorded above ended with an unrelated UI test failure (`kingdom-aggregate` missing click target). Therefore this log is evidence for individual passing backend groups only; it is not an aggregate-suite PASS. Independent QA and the lead own the final full-suite gate.

## Remaining release controls

- Keep billing in a dedicated Stripe test environment. Do not enable live mode or use real cards. Keys belong in the platform secret store, never source, client bundles or screenshots; use least-privilege restricted test keys where supported.
- Verify real sandbox purchase/renewal/failed-payment/cancellation/refund lifecycles before enabling test billing for beta testers; synthetic events alone do not establish delivery.
- If attaching an existing database rather than a fresh beta database, inventory existing constraints/migration history first. The current scripts use `CREATE TABLE IF NOT EXISTS`; they do not automatically reconcile a historical fifteen-credit table constraint with a newer ten-credit insert policy. No data-changing compatibility migration was applied or certified here.
- Run hosted Supabase security advisors and a two-account REST/storage denial matrix against the actual beta project before declaring private-beta readiness.
- This candidate adds no tax collection or registrations. Any future real billing release needs an explicit tax review; test-only operation here does not establish tax readiness.
