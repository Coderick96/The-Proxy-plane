# Hybrid monetization release checklist

## Implemented in this source package
- Credit products: 10/$2.99, 30/$6.99, 80/$14.99, and Premium 200/month at $14.99.
- Credit packs are available without Premium; checkout no longer applies legacy credits_100 Premium gate.
- Checkout checks Stripe price active status, USD amounts for the four fixed-price offers, and recurring vs one-time billing type.
- Signed Stripe webhooks and receipt-based idempotency already exist in server/premium.js.
- Staging SQL for credit grants/reversals included at supabase/hybrid_monetization_staging.sql.

## Executed evidence and remaining gates
- Full regression/build/audit, native concurrency, Auth/REST/Storage/email-service and browser/PDF jobs passed CI run42938903620 on code b504cae25803563238273a2b362b37515dcc3d84. New repairs require their own final run; see docs/qa/hosted-activation/RESULTS.md.
- Reviewed existing-backend upgrade applied with all25 preexisting table fingerprints preserved; main and production deployment remain unchanged.
- Protected connected Preview is running; anonymous API/credit access is denied. Device AI and owner Preview refill are enabled.
- Actual Stripe TEST catalog already exists in approved Manafiquetcg account. Preview price IDs have been configured; hosted credential/account and signed delivery must still be verified before checkout is enabled.
- Direct database pg_cron recovery installed; automatic successful runs observed. No real credit or AI operation row was created to fake hosted refund evidence.
- Actual pinned device model completed three-image CPU reference inference; native browser GPU and physical phone results remain unverified.
- Real test checkout→webhook→database fulfillment, external OAuth/email, real iPhone/AirPrint/physical sizing remain NOT TESTED. Local mocks/services and PDF placement evidence are separately scoped.

## Safe rollout
1. Create Stripe products/prices in TEST MODE and verify the exact USD amounts.
2. Configure server-only Stripe secrets and the four price IDs.
3. Review backend migrations and preserve existing data. Do not reset the approved shared backend; use disposable databases for destructive fixtures.
4. Run test checkouts, duplicate webhooks, asynchronous payments, partial/full refunds, disputes, subscription renewal/cancel, cross-account access, and simultaneous credit spending.
5. Verify three images cost one credit. Cloud failures recover through durable reconciliation; untrusted browser-device inference does not promise automatic client-triggered refunds.
6. Measure image-generation unit economics before authorizing live billing.
7. Promote only after explicit production approval, with rollback instructions.
