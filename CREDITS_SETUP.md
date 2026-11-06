# One-time and monthly AI credits — 2.6.0

Run migrations in this order: schema.sql, community.sql, premium.sql,
evolution.sql, credits.sql. Existing 2.5.x cloud databases need credits.sql only.
All are in supabase/. Never rerun an older migration AFTER credits.sql: it would
replace current credit functions. Run credits.sql again last if that occurs.
The 2.6 server requires policyVersion 30 and refuses the older daily policy.

Free: 15 starter AI credits per Supabase account, once, up to 15 image requests
if used entirely for artwork. Cards/sets/reviews share credits. Signing out,
refreshing, importing a backup, changing devices or crossing midnight does not
refill them. Separate accounts are separate allowances: this is not identity
verification or protection against someone creating multiple accounts. Before
public launch, configure email verification, signup controls and abuse limits.

Premium: 200 credits per paid monthly period. One credit generates three artwork
candidates; the user selects one at no additional cost. Re-sketch is another
one-credit request. Purchased credit packs retain the existing 100-credit SKU
and price configuration but new purchases require active Premium. Studio Pass
retains its three-choice/re-sketch tools without a recurring monthly allowance.

Payment: STRIPE_PRICE_PREMIUM_MONTHLY must be a recurring monthly price with
interval_count=1. No amount was selected and no live product was created.
The existing signature-verified webhook retrieves the current subscription and
invoice. Only paid, positive-amount creation/renewal invoices with the matching
Premium price and a full monthly period qualify. Duplicate invoice deliveries
or duplicate periods do not refill balances. Prorations, annual/weekly prices,
zero-payment trials, canceled subscriptions and unrelated lines grant no credits.
Existing subscriptions receive their allowance on their next qualifying paid
invoice. To import a current already-paid invoice, replay its invoice.paid event
through Stripe's verified webhook after configuring/migrating; do not manually
repeat a raw wallet grant. Test checkout, invoice, cancellation, failed payment,
refund, duplicate delivery and renewals in Stripe test mode before live sales.

Monthly pools expire at the billed period end and require that specific
subscription to remain entitled. Cancel-at-period-end retains access until the
actual end; cancellation/downgrade or a refund hold disables the relevant pool.
Purchased wallet credits and unused starter credits remain. Refunds of failed
AI restore the source pool, including expired/revoked pools without making those
credits spendable again. Legacy daily-charge refunds stay on the old day and do
not mint new starter/monthly credits. The old daily tables remain as audit data.

The supplied tests use an embedded PostgreSQL database and mocked Stripe/AI.
No real provider, customer, payment or cloud migration was exercised. The image
provider/model must still be configured and tested with an available model
before launch; these credit changes do not migrate the retired default image
model or connect a free AI provider. No local-device balance is authoritative.
