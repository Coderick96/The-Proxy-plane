# Assistant Manager Q — payment repair review

Recommendation: BLOCKED for live-payment launch; local repair acceptance PASS (42 regression groups).

## Executed evidence

- PASS: `node tests/premium-db.mjs && node tests/credits-db.mjs` — local SQL idempotency, grants/revocation, credit debit/refund, monthly expiry and account/RLS isolation.
- PASS: `node tests/checkout-availability.mjs` — simulated DOM catalog loading, failure/retry, visible disabled explanation, eligible test checkout.
- PASS: `node tests/billing-mode.mjs && npm run test:billing-safety && npm run test:credits && node tests/billing-foreign-invoice.mjs` — production/live/isolation opt-ins, Preview live rejection, account/charge readiness, cross-mode event/object rejection, paused-new-sales webhook handling, monthly grants and account ownership. Mock Stripe providers; no real charge.
- PASS: `npm test > /tmp/assistant-manager-q-payment-full.log 2>&1` — exit 0, 42 groups. Includes simulated account recovery/session races, card search/editor/print, billing/account isolation and SQL regressions.
- PASS: `git diff --check` — no whitespace errors.

## Review findings

1. Original shared database has no mode namespace in customer, receipt or credit ledgers. A test customer mapping or test credit can cross into production if the same data store is used. Fixed code requires explicit live-data-isolation attestation and validates existing live customer objects, but actual isolated live data setup is NOT VERIFIED. The attestation flag alone is not proof. Do not set it on the current mixed test backend.
2. Original beta banner inferred live availability from configuration even when account readiness failed. Root changed it to await live readiness, and deck listing/publish now checks readiness too.
3. New sales can be paused without blocking settlement/refund webhooks from already-created live checkouts; independent fixture passed. Wrong-mode events and retrieved live objects are rejected before grant writes.
4. Cloud AI remains quota-blocked. Live credit products/paid AI promises must remain disabled until actual availability and fulfillment are verified. UI now discloses cloud pause/device hardware requirements.
5. Real authenticated hosted checkout -> Stripe-delivered signed webhook -> actual user credits, real OAuth/email/password-reset delivery, and live-account onboarding are NOT TESTED in this pass. Local/mocked tests do not substitute.

No deployment, environment mutation, database mutation or real Stripe charge was performed by this QA agent.
