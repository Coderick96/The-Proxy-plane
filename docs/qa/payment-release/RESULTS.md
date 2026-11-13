# Payment release repairs

Status: local code repairs verified; live charging remains BLOCKED.

- `npm test`: PASS, 42 groups (independent Assistant Manager Q).
- `node tests/billing-mode.mjs`: PASS, final positive signed live paid-session dispatch, duplicate receipt identity, wrong-mode price/intent/charge rejection, paused sales with outstanding webhooks and portal. Local Stripe/database mocks; SQL idempotency has separate regression coverage.
- `node tests/checkout-availability.mjs`: PASS, simulated DOM/catalog loading, failure, retry, disabled reasons and cancellation while sales paused.
- `npm run build`: PASS (independent UI QA); existing large chunk warning remains.
- `npm audit --omit=dev --audit-level=high`: PASS, zero reported vulnerabilities.
- Real hosted checkout through delivered credits: NOT TESTED. Email/Google/password recovery delivery: NOT TESTED.
- Current live activation: BLOCKED; only test Stripe account connected, production credentials/prices/webhook absent, shared test/live credit schema requires isolation, cloud AI quota unresolved.

No real charge, Supabase mutation or live activation was performed by these repairs. Existing data and workflows preserved. See ACTIVATION.md for configuration, acceptance and rollback.
