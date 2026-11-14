# Shop: backs, credits and monthly options

New sales use the Shop. Premium membership and Studio Pass are retired offers;
existing receipts, grants, refunds and cancellation portal remain supported.
Studio is a one-time paid add-on, separate from backing packs and storage. Only purchased/legacy-owned backing packs unlock paid designs.

Run `supabase/shop.sql` after the existing evolution and credits setup, before
turning on monthly shop offers. The SQL adds independent paid-invoice accounting,
server-only writes, monthly storage limits and a permanent Studio unlock. It preserves
all cards, existing credits, receipts and legacy subscriptions. Both card-count
and byte limits are enforced in database triggers/storage policies. Downgrade
keeps saved cards readable and permits non-growing updates above the free quota.

## Configuration

Keep all Stripe keys server-only. New monthly offers stay unavailable until
all their fields below are set and validated against an active USD monthly Price.
Do not reuse a price across offers. Pricing and capacities require owner input;
no monthly price or allowance is invented by the code.

| Offer | Required variables |
| --- | --- |
| Studio unlock | STRIPE_PRICE_STUDIO_UNLOCK |
| Celestial Atlas | STRIPE_PRICE_PACK_CELESTIAL |
| Midnight Cathedral | STRIPE_PRICE_PACK_GOTHIC |
| Dragon Sovereign | STRIPE_PRICE_PACK_DRAGON |
| 10 / 30 / 80 credits | STRIPE_PRICE_CREDITS_10 / _30 / _80 (existing USD 2.99 / 6.99 / 14.99) |
| Monthly credit top-off | STRIPE_PRICE_CREDITS_MONTHLY, SHOP_CREDITS_MONTHLY_CENTS, SHOP_MONTHLY_CREDITS (1–1,000) |
| Monthly storage | STRIPE_PRICE_STORAGE_MONTHLY, SHOP_STORAGE_MONTHLY_CENTS, SHOP_STORAGE_CARDS (total capacity), SHOP_STORAGE_BYTES (total bytes) |

After installing the schema, set `SHOP_MONTHLY_ENABLED=true`. This schema-readiness flag also enables the new Studio unlock SKU; it must stay off until shop.sql has been applied. Do not use this
flag to pause sales after accepting subscriptions: pause new sales with
`LIVE_PAYMENTS_ENABLED=false`, keeping webhook fulfillment active.

Monthly top-offs are recurring purchases of wallet credits; unused credits roll
over and remain after cancellation. They do not grant Premium or backing packs.
Storage is a separate recurring subscription; paid periods determine the higher
capacity. Existing legacy Premium limits are preserved when larger. Storage
capacities are total limits, not additive with another subscription.

Checkout requires authentication and validates the configured price and interval.
An existing matching subscription sends the user to Manage billing instead of
starting another. Monthly options use separate checkout idempotency keys.
Credits/storage are fulfilled from verified `invoice.paid`, not checkout return.
Duplicate invoice/period delivery cannot duplicate wallet credits. Refunds and
risk holds remove the affected benefit and reverse refunded credit grants.

Subscribe the webhook to checkout.session.completed,
checkout.session.async_payment_succeeded, customer.subscription.created,
customer.subscription.updated, customer.subscription.deleted, invoice.paid,
invoice.payment_failed, charge.refunded, charge.dispute.created and
radar.early_fraud_warning.created. The last two newly handled invoice/fraud events
must be enabled on the Stripe endpoint when releasing this change.

Check Stripe Tax registrations and merchant tax obligations before enabling tax
collection. Automatic tax is not enabled by this change.

## Release status

Implementation is local until a reviewed build and this schema are deployed.
Stripe live access/browser tooling remains blocked in the recorded chat. The live
key alone does not configure prices or webhook delivery. Preview currently shares
the production account database; verified live/test isolation is still required
before live charging. Real authenticated checkout and credit delivery remain
unverified. Local mocks and SQL tests are narrower evidence.
