# Independent QA2 — security and billing

Reviewer: `qa_security_final`. Scope: feature/local-art-audit-homepage, authoritative Local Art 2.6.5 source. This reviewer changed only this report and `docs/qa/qa2/` evidence. No application edits, secrets, external provider calls, payments, deployment or database operations outside ephemeral PGlite fixtures.

## Independently executed results

| Status | Command/check | Evidence and limits |
| --- | --- | --- |
| PASS | `node tests/credits-db.mjs` | `qa2/credits-db.log`: 10 one-time starter credits; 200 monthly paid credits; expiry/cancellation; duplicate protection; wallet preservation; exact refunds; account isolation. PGlite simulated Supabase roles. |
| PASS | `node tests/privacy.mjs` | `qa2/privacy.log`: anonymous and account-owner separation, private-by-default cards/collections, gallery eligibility, storage read policies and ownership constraints. PGlite, not deployed Supabase. |
| PASS | `node tests/premium-db.mjs` | `qa2/premium-db.log`: invalid SQL repair, server-only grant/spend privileges, duplicate purchase/invoice behavior, legacy credits_100 refund compatibility, downgrade and quota behavior. |
| PASS | `node tests/beta-db.mjs` | `qa2/beta-db.log`: 10 tester seats, verified-email admission, revocation, direct RPC/storage gates and owner-only roster. |
| PASS | `node tests/monthly-billing.mjs` | `qa2/monthly-billing.log`: mocked Stripe paid-status/customer/price/cycle checks; rejects zero payment, annual, proration and unrelated invoices. No Stripe network request. |
| PASS | Direct Node service contract assertions | `qa2/test-mode-source-contract.log`: live/missing credentials produce no Stripe client; sk_test/rk_test accepted; beta requires test opt-in; service fulfillment rejects live/missing mode; legacy pack not sold. Stripe SDK accepts signed fixture and rejects tampered payload. No HTTP listener. |
| NOT TESTED by QA2 | HTTP billing-test-mode and premium-server suites | The initial permission request did not execute; it was aborted. Lead's separately executed full suite is evidence attributable to the lead, not this reviewer. |
| BLOCKED | Hosted Supabase/Auth/Storage and actual Stripe sandbox lifecycle | No configured test project, OAuth provider setup, webhook endpoint or test catalog was supplied to this reviewer. PGlite/mocks do not verify these services. |

Raw independent exits are in `qa2/results.json`; all five recorded exits are zero. Supabase and Stripe security skills were read. No claim is made that documentation or configuration on remote services was verified.

## Source-reviewed repaired boundaries

- `server/premium.js:5–6,16`: only test key formats construct the normal Stripe client, including restricted test keys; beta sales additionally require explicit opt-in.
- `server/index.js:19–24`: raw request body signature verification precedes fulfillment; both live and absent `livemode:false` are rejected. `server/premium.js:32` repeats the event-mode boundary inside the fulfillment service.
- Checkout and portal middleware use the shared guard; catalog availability and paid deck publication/prices use the same policy. No browser-provided user ID or amount determines credit ownership/grants.
- Auth uses server `getUser` and beta admission RPC. SQL mutation functions for grants, purchases and credits have explicit execute revocations for public/anon/authenticated roles and service-role grants. Owner-scoped policies include both `USING` and `WITH CHECK` on updates.
- Receipt/ledger uniqueness and account-row locking support duplicate-safe local accounting. Refunds preserve legacy credits_100 compatibility while the catalog no longer sells that SKU.

## Remaining findings and launch gates

| Priority | Status | Finding / required action |
| --- | --- | --- |
| P1 | OPEN before billed cloud AI enablement | `server/index.js:54–57`: spend occurs before generation; refund is an awaited catch-path RPC, with no durable completion/reconciliation state. Process death after debit or a failed refund RPC can strand credits. Keep beta cloud AI paused until a durable recovery mechanism and crash/refund-failure tests exist, or explicitly limit the beta to non-billed local/editor workflows. |
| P1 | BLOCKED external verification | Execute real test-environment signup/email verification/Google/Apple, token revocation, account A/B REST/storage isolation, signed URL expiry, and Stripe test checkout/renewal/cancel/refund/replay against isolated services. Current local passes cannot certify deployment configuration. |
| P2 | CONDITIONAL compatibility defect | `supabase/credits.sql:3–10` uses `CREATE TABLE IF NOT EXISTS`; it cannot replace a historical starter allowance CHECK requiring15. A local simulated historical-schema repro is included in `qa2/legacy-constraint-repro.mjs/.log`. Inspect any actual existing database before applying changes; preserve existing15-credit balances and migrate the constraint safely in staging if present. No existing user data was altered. |
| P3 | OPEN status reporting mismatch | `server/beta.js:7` reports `testBilling` using only `startsWith('sk_test_')`, while the shared billing guard accepts `rk_test_`. A restricted test key can correctly enable checkout but falsely report billing unavailable in beta status. Use the shared predicate for consistent metadata and add a regression. This does not allow live charging. |

No P0 issue was identified in this bounded review. That is not proof that the complete application has no P0 issue. Release recommendation: **BLOCKED for full-feature private-beta readiness** until the external-service and credit-recovery gates are met; local test-only development can continue. Tax configuration/registrations must be reviewed before any future live subscription rollout; none were enabled or certified here.
