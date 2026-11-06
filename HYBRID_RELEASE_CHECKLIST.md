# Hybrid monetization release checklist

## Implemented in this source package
- Credit products: 10/$2.99, 30/$6.99, 80/$14.99, and Premium 200/month at $14.99.
- Credit packs are available without Premium; checkout no longer applies legacy credits_100 Premium gate.
- Checkout checks Stripe price active status, USD amounts for the four fixed-price offers, and recurring vs one-time billing type.
- Signed Stripe webhooks and receipt-based idempotency already exist in server/premium.js.
- Staging SQL for credit grants/reversals included at supabase/hybrid_monetization_staging.sql.

## Not yet executed
- Stripe test product/price creation and webhook secret configuration.
- Applying SQL to Supabase (project esndctzrbpoiljwenevp).
- End-to-end paid/refund/dispute/concurrent-credit tests.
- Full npm tests/build (npm ci --offline fails because yallist@3.1.1 is not cached).
- GitHub source upload and Vercel deployment.

## Safe rollout
1. Create Stripe products/prices in TEST MODE and verify the exact USD amounts.
2. Configure server-only Stripe secrets and the four price IDs.
3. Snapshot staging database, review credits.sql + staging SQL and apply to staging only.
4. Run test checkouts, duplicate webhooks, asynchronous payments, partial/full refunds, disputes, subscription renewal/cancel, cross-account access, and simultaneous credit spending.
5. Verify three images cost one credit and failed generation refunds one credit.
6. Measure image-generation unit economics before authorizing live billing.
7. Promote only after explicit production approval, with rollback instructions.
