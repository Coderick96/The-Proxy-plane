# Independent payment security review

Reviewer: payment_security_review (second independent QA pass).
Scope: read-only source review and executed local tests. No deployment, environment changes, database mutations, real Stripe charge or hosted account impersonation.

## Executed checks

| Command | Result | Scope |
|---|---|---|
| `node tests/billing-mode.mjs` | PASS | Local HTTP/mock Stripe: explicit production/live/isolation settings, Preview rejection, account readiness, price mode rejection, signed event mode rejection, service mode checks and paused sales behavior. |
| `node tests/billing-test-mode.mjs` | PASS | Existing test-mode safety guards and signed-event rejection using mock providers. |
| `node tests/checkout-availability.mjs` | PASS | Simulated DOM/catalog loading, failure/retry, disabled explanation and test offer availability. |
| `node tests/deck-store-server.mjs` | PASS | Local deck authorization/download/publication checks. |
| `node tests/beta-server.mjs` | PASS | Mock beta admission, owner-only administration, server-owned user identity and failure closure. |
| `node tests/billing-foreign-invoice.mjs` | PASS | Signed local HTTP with mock Stripe/database; foreign-account event acknowledgment and mapped account mismatch rejection. |

## Findings sent to lead

1. UI cancellation access: `PremiumShop` initially disabled Manage billing whenever new sales were disabled, despite server `billing.portalEnabled` permitting cancellation during a sales pause. Lead notified to honor portal readiness independently and add regression coverage. This report records the reviewed snapshot; rerun after fix is required.
2. Positive live paid-session fulfillment is not asserted by the initial `billing-mode` fixture. It proves live checkout creation, cross-mode rejection and unpaid pending event handling; add a positive live paid-session -> credit grant fixture. Existing test-mode and native SQL idempotency tests are separate evidence.
3. `BILLING_LIVE_DATA_ISOLATED=true` is only an operator assertion. It does not namespace or migrate existing test/live ledgers. The current shared Supabase backend is unsuitable for live activation until isolation is actually completed and verified. Documentation correctly states this.

## Security assessment

No direct auth bypass found in reviewed changes. Live credentials require explicit production selection and isolation assertion, live sales require another opt-in, and Stripe account ID must match. Live retrieved objects must explicitly report live mode. Signed webhook mode must match configured mode. New-sale pause preserves backend processing of outstanding signed payments and cancellation portal access. Existing JWT/beta/account action guards remain.

## External release gate

BLOCKED for real payments: only TEST Stripe access is connected; live key/prices/signing secret and real backend isolation are absent/unverified. Genuine hosted authenticated TEST checkout -> delivered credits, duplicate external delivery/refund, Google/email recovery and real cloud generation remain NOT TESTED/BLOCKED. No local/mock PASS certifies these. Do not activate live sales by setting flags on the current shared backend.

Lead resolution: the portalEnabled UI fix and paused-sales UI regression are implemented and passing. The positive signed live paid-session dispatch/replay and wrong-mode nested object tests have been added to tests/billing-mode.mjs and executed successfully. These mocked tests do not remove external launch blockers.
