# Hybrid monetization staging implementation

This source update is **not deployed**. Do not run the migration on production until tests pass.

## Planned Stripe products
- `STRIPE_PRICE_CREDITS_10`: $2.99 one-time, 10 credits
- `STRIPE_PRICE_CREDITS_30`: $6.99 one-time, 30 credits
- `STRIPE_PRICE_CREDITS_80`: $14.99 one-time, 80 credits
- `STRIPE_PRICE_PREMIUM_MONTHLY`: $14.99/month, 200 monthly credits
- Cosmetic pack prices use existing `STRIPE_PRICE_PACK_*` variables; determine prices separately.

Use **Stripe test-mode price IDs** during QA. Price amounts are configured in Stripe, not enforced in source. Check each price before enabling checkout. Keep `BETA_MODE=true` and billing disabled for production beta until approval.

## Changes
- Everyone can buy credit packs without Premium.
- Artwork generation returns three images for one credit for every account.
- New starter allowance is 10, monthly Premium allowance remains 200.
- Existing cosmetic entitlements and monthly billing remain intact.
- Purchase grants and refund reversals use per-pack quantities and idempotent receipt IDs.

## Critical rollout cautions
- `supabase/credits.sql` currently recreates more than one function; review its effect on existing data before applying.
- `supabase/hybrid_monetization_staging.sql` updates purchase/revoke functions, but does not alter existing starter allowances.
- Confirm that `pp_access_for` reports the correct allowance after deploying credits.sql changes; existing 15-credit accounts may need grandfathering.
- Test successful checkout, duplicate webhook delivery, refunded charge, failed generation refund, concurrent spending, and account isolation.
- Stripe fees and AI costs must be measured before turning on live checkout. Purchased credits do not have an expiration in this implementation.

## Verified Stripe test catalog (2026-11-04)
Stripe account `acct_1TkUa7IdJpeICyDW` (test mode). Price IDs are in `STRIPE_TEST_PRICE_IDS.env`. Set these four server-only env vars in the backend hosting environment. Do not put Stripe secret or webhook signing secret in browser variables. Test-mode product creation does not configure a webhook or deploy the backend.
