# Payment release activation and rollback

The owner authorized production promotion and live billing. Authorization is recorded, but does not establish successful checkout or fulfillment.

## Required configuration

- Preview retains test-only Stripe credentials, test prices and test webhook secret. Never copy these into a live ledger.
- Live billing requires `VERCEL_ENV=production`, `BILLING_MODE=live`, `LIVE_PAYMENTS_ENABLED=true`, `BILLING_LIVE_DATA_ISOLATED=true`, a live restricted Stripe key, and `STRIPE_EXPECTED_ACCOUNT_ID`.
- `BILLING_LIVE_DATA_ISOLATED` is an operator assertion, not a migration or proof of isolation. Set it only after provisioning and verifying a separate live Supabase backend, or completing a reviewed mode-aware ledger migration. The current shared real-data backend is not eligible: test and live customers, receipts and credits are not namespaced. Do not delete/reset existing data to satisfy this requirement.
- Configure live USD prices for the published amounts and intervals. Test Price IDs cannot be reused live.
- Register a signature-verified live webhook at the intended production origin; configure its signing secret privately. A successful HTTP connectivity probe does not prove credit delivery.
- Store credentials as hosting sensitive environment variables; do not place keys in chat, source, screenshots or logs.

## Acceptance before activation

1. Complete real email/Google sign-in and password recovery with the approved tester. Local Mailpit is separate evidence.
2. In the current TEST Preview, complete authenticated application checkout with a Stripe test card. Verify the application's mapped customer, paid Stripe session, delivered signed event, exactly one receipt and the expected credit ledger increase. Retry event delivery and verify no duplicate grant. Verify refund behavior.
3. Resolve cloud provider quota and execute an actual three-image request, one-credit debit, failure recovery and replay. Do not sell unavailable cloud generation. Device-only capability must be accurately disclosed and verified for the intended users.
4. Verify isolation of live and TEST customer/credit state without changing existing user balances.
5. Stage the exact reviewed production commit with production environment variables, run account/API/mobile smoke checks, then promote that staged production build. Promoting a Preview may rebuild with different production variables.
6. Verify live checkout configuration without charging a real card. Any real monetary acceptance test requires a concrete separately scoped transaction, not an implicit test-card substitution.

## Current external blockers

The connected Stripe account is test-mode only. Production lacks Stripe key, webhook secret and Price IDs. Actual authenticated TEST checkout and external email/OAuth/reset remain unverified. OpenAI inference returned insufficient quota. These are not corrected by enabling environment flags.

## Rollback

Disable `LIVE_PAYMENTS_ENABLED` and stage/release the disabled configuration. Keep the live signature-verified webhook available to process existing payments/refunds; stopping new checkout must not discard paid fulfillment. Roll back application to the prior production deployment only after checking its webhook support (the old test-only build cannot accept live events). Preserve all customers, receipts, credit ledgers and recovery records. Do not roll back by resetting Supabase.
