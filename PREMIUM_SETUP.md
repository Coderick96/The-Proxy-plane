# The Proxy Plane 2.6 — Premium setup

The feature code and original design packs are included. No merchant account,
Supabase project, live products, paid AI requests or public deployment were created.
Prices are deliberately unset; the shop displays unavailable products until configured.

## 1. Run the app

Stop the old server. Extract the ZIP into a fresh folder, copy your old .env if
configured, and double-click START_THE_PROXY_PLANE.bat. It now starts BOTH the
editor (127.0.0.1:5173) and app server (127.0.0.1:8787). Ctrl+C stops both.
Keep the same browser and address for previous device saves. Do not delete old
folders or backups until you have verified your work in the new version.

The free editor, normal PNG/PDF exports, private device saves and standard back
work without paid services. Cloud/community need Supabase. AI requests need a
signed-in account, server OpenAI key and credits. No browser Premium toggle grants access.

## 2. Supabase

Follow COMMUNITY_SETUP.md to create an account backend and configure Auth.
Run these SQL files in order in the project's SQL Editor:

1. supabase/schema.sql
2. supabase/community.sql
3. supabase/premium.sql
4. supabase/evolution.sql
5. supabase/credits.sql

For 2.5.x, run credits.sql only. For an existing 2.3 database, run evolution.sql then credits.sql. For 2.1 run premium.sql then evolution.sql. Both are repeatable. Existing
cards default to free access; no saved work is deleted on upgrade or downgrade.

Copy .env.example to .env. Set the SAME project URL in SUPABASE_URL and
VITE_SUPABASE_URL. Set its public browser key in VITE_SUPABASE_ANON_KEY and its
server service-role key in SUPABASE_SERVICE_ROLE_KEY. The service key bypasses
RLS: keep it on the server, never in a VITE_ variable, screenshot or committed file.
Restart after editing .env.

## 3. Choose your products and prices in Stripe test mode

This build offers these specific products. The numbers below are configured
feature limits, not prices. Choose prices only after considering AI, storage,
transaction fees and your support costs.

| Product | Billing | Included |
| --- | --- | --- |
| Premium membership | Monthly recurring | Studio tools, all current packs, 10,000 cloud cards, 1 GiB total managed storage, 200 credits per paid month; three image choices/re-sketch for one credit per request, eligible member deck lines |
| Studio Pass | One-time | Templates, batch styling, local/cloud history, profile themes/showcases, advanced printing, custom back uploads and the three launch backing packs; standard cloud limits and 15 one-time starter AI credits |
| Celestial Atlas | One-time | Astral + Eclipse backs backs only |
| Midnight Cathedral | One-time | Cathedral + Rose backs backs only |
| Dragon Sovereign | One-time | Ember + Jade backs backs only |
| 100 AI credits | One-time | Extra purchased balance for active Premium members; retained after cancellation |

Create a separate Stripe Product/Price for each row. Use a monthly recurring
price only for membership; the other five prices are one-time. Use USD for this
launch configuration. Copy each price_ ID into the matching STRIPE_PRICE_* field.
Do not reuse a Price ID across products. Set the Stripe TEST secret key in
STRIPE_SECRET_KEY. Configure the Stripe customer portal to permit subscription
cancellation. No tax configuration is automated here; configure merchant tax,
receipt, refund and required business policies in Stripe before going live.

A subscription's pack access ends with membership. Separately purchased packs
and Studio Pass remain unlocked after membership ends. AI credits carry forward.
After downgrade, existing cards/history remain readable; new cloud saves above
the lower card/storage quota are blocked, while non-growing edits stay permitted.
History is capped at 20 earlier saves per card; creating a new cloud revision pauses if storage is full so non-growing edits can still save. Larger storage counts managed
source images, community snapshots, project JSON, account history and templates;
it does not measure unrelated buckets or Stripe data.

## 4. Connect verified webhooks

Register /api/billing/webhook with Stripe. For local testing, install the Stripe
CLI from Stripe's official website, authenticate in test mode, then run:

    stripe listen --forward-to http://127.0.0.1:8787/api/billing/webhook

Copy its whsec_ signing secret into STRIPE_WEBHOOK_SECRET and restart the app.
Subscribe the public endpoint to these events for a hosted installation:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- charge.refunded
- charge.dispute.created

Access is granted from verified webhook/API state, never from the success URL.
Receipts, invoices, credit grants and reversals are idempotent in the database.
The server rereads current subscription state to resist out-of-order events.
A refund (including a partial refund) or dispute revokes its entire one-time
purchase. Subscription invoice refunds/disputes suspend that subscription's
access and reverse its credited allowance; later subscription events do not
silently reactivate it. Refund/dispute resolution and any further Stripe billing
cancellation are merchant actions: investigate in Stripe, cancel billing as
appropriate, and remove a pp_subscription_holds record in the SQL Editor only
when resolved. Spent refunded credits can leave a negative balance. Other
legitimate permanent purchases are retained.

Use Stripe's test checkout and test clocks to verify purchase, renewal,
cancellation, refund, delayed payment and webhook retry flows before live keys.
Then refresh access in the app's Premium page. This package was tested with
mocked Stripe provider calls and real signature verification, not your live
merchant account. A real test-mode checkout has not been performed here.

## 5. Test as the owner without taking a payment

Create/sign into your own Cardsmith account. Find its UUID in Supabase Auth.
In YOUR SQL Editor, replace YOUR_AUTH_USER_UUID below with that actual UUID:

    insert into public.pp_grants(user_id,source,feature)
    values ('YOUR_AUTH_USER_UUID','owner-studio-preview','studio');

This grants real Studio access to that account through the same access path as
a purchase. It includes the launch packs and profile tools. It does not grant a
membership or credits. To test AI, optionally issue a deliberate credit grant:

    select public.pp_credit_grant('YOUR_AUTH_USER_UUID','owner-ai-test',20);

Actual generation calls use your server OpenAI account and incur its API costs.
No keys or credits were supplied with this ZIP. To revoke owner preview, set
active=false on the grant row in the SQL Editor, then refresh access. Never add
an authenticated-user policy allowing clients to edit grants or credits.

## 6. OpenAI and AI behavior

Set OPENAI_API_KEY on the server. The optional model fields are configurable.
Credits: artwork request = 1; Free receives one image, Premium / Studio Pass
receives three choices for that one credit, then selects one. Reference re-sketch
also returns three choices for one credit. Card = 1 (sets contain 1–10 cards); review = 1.
There is one in-flight generation per account per server process. Credits are
reserved atomically before contacting OpenAI and returned on provider/validation
failure. Accounts receive 15 starter credits once. Premium receives 200 per paid
monthly period, without rollover. Spend order: expiring monthly allowance,
non-expiring starter, then purchased credits. Older wallet balances remain.
See CREDITS_SETUP.md for migration and verified-invoice fulfillment.

Generate text/lore first and review the drafts. Illustration buttons use shared
art direction plus each card's prompt. Entire-set artwork runs sequentially;
if a later request fails, completed images remain in the result. Save the set or
download its JSON before leaving the page. Artwork is not guaranteed to depict
identical recurring characters across images. Rules/balance feedback is a
suggestion, not authoritative validation or a guarantee of play quality.

Successful requests consume credits even if the browser closes before reading
the response. A server crash between an upstream result and a refund is an
operational reconciliation case; the credit ledger retains spend references.
This starter does not include a persistent generation-job queue. Do not run it
at public scale until you have monitored real costs and operational recovery.

## 7. Where to use the features

- Premium navigation: browse packs, actual configured prices, membership/access,
  cloud usage and credit balance; checkout and customer portal.
- Studio → 11: free back, owned pack backs, or Studio custom upload. A locked or
  unloaded pack back prevents printing instead of silently substituting a blank.
- Studio → 12: reusable style templates (100 device /
  100 account), and batch application to selected device cards. Templates preserve
  main text, mana, stats, source art and privacy; custom layer contents are part
  of the reusable design. Device template removal does not delete account copies.
- Studio → 13: device history and separately recorded cloud history (20 earlier
  saves). Restoring creates an editable draft and preserves current ownership,
  collection and privacy. Save explicitly to commit a restore. Old artwork paths
  are content-addressed so later normal uploads do not overwrite earlier art.
- Studio → 14: editable cards/sets/lore, optional illustrations and rules review.
  Saved AI sets are private by default. User-entered text is never changed without
  applying a result. PNG/community snapshots remain the card front.
- Print: bleed, back offsets in mm, registration marks and up to 30 device alignment
  profiles. Bleed uses an expanded duplicate behind the unchanged 2.5 × 3.5 inch
  trim-size card and adds gutters, reducing capacity. Still test one physical sheet
  at 100% Actual size. Printer profiles cannot control the device driver.
- Kingdom → My profile: themed banners, gallery/spotlight layout, three featured
  cloud cards, and a server-derived Studio/Premium badge on public profiles.
  Save featured cards to the account and publish them first. Privacy checks also
  govern showcase images, even if a card is later made private.

Backup projects now includes device templates, version history and print profiles.
These stay isolated by signed-in account, as do cards and print queues. The
per-sheet back selection remains temporary. Nothing is automatically published.

Creative tools run in the browser; access checks are not copy-protection for
client code. Cloud quotas, profile changes, paid source assets, credit spending
and purchase grants are enforced by the server/database. Previously downloaded
images cannot be recalled. This package is an implementation for your app,
not an audited turnkey public billing service.

## 8. Hosting and final verification

The launcher is for local use. For deployment, build with npm run build, serve
dist over HTTPS and proxy /api to the app server. Set CLIENT_ORIGIN to your exact
public origin, configure Auth redirect URLs and Stripe's public webhook URL.
Set HOST for your hosting environment if its process must listen beyond loopback.
Keep all server-only keys outside the public bundle. Never expose the development
Vite server as your production service.

Included verification:

    npm run build
    npm run test:backs
    npm run test:community
    npm run test:premium
    npm audit

Checks cover simulated React workflows, database RLS/privacy/quotas, paid access,
credit accounting, purchase idempotency, server routes, signed webhooks with mock
providers, bleed geometry and cloud pagination beyond 1,000 cards. Native-browser
visual QA, real Supabase Auth/Storage, live OpenAI, real Stripe test checkout and
physical duplex print verification remain to be performed in your environment.

Primary integration references:
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/events/manage-webhook-endpoints
- https://developers.openai.com/api/docs/guides/structured-outputs


## 2.4 owner publishing and community updates

Set OWNER_USER_ID on the server to your Supabase Auth user UUID. Never use a
VITE_ prefix for owner/server secrets. Only that user can publish deck products
or choose home features. Sign in normally and open Premium Decks.

Upload a ZIP/PDF up to 100 MiB, provide a title, slug, description and creator
credit, and confirm you have distribution rights. For individual sales, create
an active one-time Stripe price and paste its price_ ID. Enable member access
for decks included with active Premium. A product can support both routes.
Studio Pass alone does not unlock member deck lines. Files use a private
proxy-plane-decks bucket and short-lived download links, with server access
checks. The store starts empty. Validate checkout, delivery, cancellation,
refund and storage with your own test environment before launch.

The owner can paste up to three public creation IDs in the home-feature control.
A featured creation that becomes private disappears automatically. Empty slots
fall back to real Commander staples. Public creations expose their IDs to the
owner in Gathering Plane.

Gathering Plane's Proxxied importer is for exported PNG/JPEG/WebP proxy images
(up to 10 at once, under 20 MiB each) you own or have permission to repost.
It requires creator credit and rights confirmation; a source link and artist
credit may be supplied. Imports start in the private device vault. Publication
is a separate explicit action. No wholesale Proxxied migration was performed:
https://proxxied.com/terms/ does not establish a blanket catalog redistribution
license. A bulk migration needs an authorized export and creator permissions.
