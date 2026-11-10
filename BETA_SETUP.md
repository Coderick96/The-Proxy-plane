# The Proxy Plane 2.6.5 — isolated private-beta setup

This is a test candidate, not a launch certification. Start with this guide for current setup; older release notes describe historical behavior. Current evidence and remaining gates are in [current launch-gate QA](docs/qa/launch-gates/QA-MATRIX.md) and [the acceptance checklist](BETA_TEST_CHECKLIST.md).

The existing hosted **Proxy plane** project contains real user data and is **read-only** for this work. Do not run setup, fixture users, migrations or refill tests against it. Use a disposable local Supabase stack or an explicitly approved isolated hosted project/branch. Local testing does not require buying a hosted branch. The connected account's free-project quota is exhausted; no paid resource should be created without cost agreement.

## 1. Prepare the source and environment

Use Node.js 22 or later. Keep the old release and export a backup of your cards. From the repository root:

```sh
npm ci
cp config/beta.env.example .env
```

On Windows, copy `config/beta.env.example` to `.env` using Explorer or PowerShell. The tracked example contains only empty credential fields and safe defaults. Fill actual credentials securely in the untracked `.env` or the host's environment settings; never paste secrets into chat, screenshots or committed files.

Set `SUPABASE_URL` and `VITE_SUPABASE_URL` to the **same isolated backend**, its public publishable/anon key in `VITE_SUPABASE_ANON_KEY`, and its server secret/service-role key in `SUPABASE_SERVICE_ROLE_KEY`. Never expose the latter through a `VITE_` variable. The template intentionally cannot connect to any database until configured.

Keep `BETA_MODE=true`, `VITE_PRIVATE_BETA=true`, `BETA_AI_ENABLED=false` and `BETA_TEST_BILLING=false` during core setup. The Vite values are baked into the frontend; rebuild after changing them.

Before setup, run the offline check after securely filling `.env`:

```sh
npm run beta:check
```

The untouched template is expected to report **SETUP BLOCKED**, because its credential fields are empty. This command checks configuration shape and safe feature gates without contacting services, running migrations, making purchases or printing secret values. An **OFFLINE CONFIGURATION PASS** does not verify credentials, prove the database is isolated, or establish launch readiness; Auth/REST/Storage, webhook delivery, genuine inference and physical printing still need executed acceptance tests. Never substitute an existing real-data project's credentials merely to make this check pass.

## 2. Install the reviewed SQL in the isolated database

For a **new, empty isolated** Supabase database, review and execute this order:

1. `supabase/schema.sql`
2. `supabase/community.sql`
3. `supabase/premium.sql`
4. `supabase/evolution.sql`
5. `supabase/credits.sql` — includes the one-credit device authorization RPC and private receipt table.
6. `supabase/ai_recovery.sql` — required before cloud AI; installs durable reservation/result/refund recovery.
7. `supabase/dev_credits.sql` — optional owner development/Preview refill only.
8. `supabase/beta.sql` — **last**, so beta restrictions cover the installed feature tables/functions.

Do not blindly replay this fresh-install sequence on an existing database. Existing data needs a reviewed upgrade, backup and rehearsed restore. Historical 15-credit starter grants and existing purchased wallets are preserved by the compatibility logic; new starter grants are 10 credits. Unknown constraints intentionally abort rather than overwrite data. Rerunning earlier scripts can replace function definitions; reapply the reviewed beta restrictions last before admitting testers.

Local SQL/RLS simulations do not exercise Supabase Auth, REST or Storage services. A complete local Supabase stack or isolated hosted backend is needed to verify all integrations end to end. `npm run test:postgres` checks real PostgreSQL multi-connection credit contention on disposable fixtures. `npm run test:accounts-local` runs actual GoTrue/PostgREST/native PostgreSQL and the app's real account/credit endpoints with local test users. Its Storage interfaces remain fixtures; it does not prove Storage HTTP permissions, OAuth/email delivery or hosted configuration.

Both Docker tests create and remove only their own disposable resources and never accept a hosted database URL. They require a working local Docker socket and the following cached images (`--pull=never` prevents implicit downloads):

```sh
docker pull postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3
docker pull public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b
docker pull public.ecr.aws/supabase/postgrest@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc
npm run test:postgres
npm run test:accounts-local
```

## 3. Configure Auth and the private roster

Enable email/password and Confirm Email. Set the Auth Site URL and allowed redirects to the actual app origin (`http://127.0.0.1:5173` locally, your HTTPS origin when hosted). Configure and test SMTP/email delivery before inviting remote testers. Configure provider credentials and redirects separately before advertising Google or Apple sign-in. Review signup rate limits and CAPTCHA for the deployment.

Create and confirm the isolated owner account. Put its Auth user UUID in `OWNER_USER_ID`, then run:

```sh
npm run beta:setup
npm start
```

Open the app at `http://127.0.0.1:5173`, sign in as owner and use **Beta desk** to approve up to ten tester email slots. The owner has separate access. Adding an email does not send an invitation. Each tester creates an account with that exact email, confirms it and signs in. Check one approved and one unapproved account before sharing access.

The roster restricts access, not Auth signup records: an unapproved person may create an Auth account but cannot enter the beta. Removing an approval does not delete private projects. Previously downloaded cards and unexpired signed URLs cannot be recalled. Never use editable user metadata as an authorization source.

## 4. Verify account credits before enabling generation

The current policy is **10 introductory credits once**, **200 per verified paid Premium month**, and **one credit per artwork request containing three choices** in both device and cloud modes. There is no automatic Free refill or monthly rollover. Purchased wallet credits persist after cancellation; historical granted balances are preserved. Stripe TEST-mode payments do not charge real cards.

Device image computation runs in the browser and needs no OpenAI key. It still requires a working authenticated account/credit backend. The runtime/model preparation precedes server authorization; no generation steps should run until a matching receipt returns. Unknown authorization responses must retry the same operation ID. Device failures after a confirmed debit use same-request retry or owner review, not a client-controlled automatic refund. Public weights and user-controlled browser code cannot enforce tamper-proof paid inference against a modified client.

Before enabling `BETA_AI_ENABLED=true`, verify account-A/account-B isolation, fixed debit amounts, concurrent requests, duplicate/retry behavior, insufficient balance and refund-revocation handling on the isolated backend. Test the full model on a compatible physical GPU/phone: a successful runtime self-check does not prove model memory fit or diffusion correctness. Some mobile devices do not support the required WebGPU features.

### Optional owner development refill

Apply the optional `supabase/dev_credits.sql` in the isolated database. Set `DEV_CREDIT_TOPOFF_ENABLED=true`, `DEV_CREDIT_TOPOFF_AMOUNT=100`, `OWNER_USER_ID` and a private server-only `OWNER_TOPOFF_CODE`. Do not put the code in this template, public JavaScript or test fixtures. The Premium owner panel adds 100 wallet credits per new confirmed redemption, with same-ID retry protection and no Stripe call. Other users must be denied even if they know the code. The endpoint is disabled in production. Vercel uses Preview-only variables for this feature; do not spoof `VERCEL_ENV` to bypass the production guard.

### Optional cloud artwork

Configure a server-only provider key and supported image/safety models, verify provider costs/limits and run a real isolated request before advertising cloud generation. Merely detecting a key is not a successful integration test. Credits are app allowances, not a provider dollar cap.

Cloud recovery requires `supabase/ai_recovery.sql`. A continuous Node server reconciles expired reservations at startup and every minute. Vercel/serverless disables that timer; requests and recovery reads reconcile, but **idle crash refunds require a separately configured service-only scheduler** for `pp_ai_reconcile(20)` at least once per minute. Do not enable cloud AI until that operational path and private result retention/storage budget are verified.

## 5. Verify Stripe TEST-mode billing separately

Keep `BETA_TEST_BILLING=false` until the isolated database, test key, distinct test prices and signed webhook are configured. Fill the template's `STRIPE_*` fields securely with **test-mode** values only. Never use a real payment card or live secret. Verify the published USD prices, monthly interval, Checkout delivery, signature validation, duplicate events, credit grants, renewal, cancellation and refunds end to end. Local mocks are useful regression evidence, not proof of Stripe webhook delivery. Configure and verify the test customer portal too.

## 6. Host a protected HTTPS preview when ready

Localhost works only on the computer running the app. Do not send it to remote testers or expose a development port publicly.

For a continuous Node host, build with `npm ci && npm run build`, start with `npm run serve`, and use `HOST=0.0.0.0`, `SERVE_WEB=true` and the host-provided `PORT`. For Vercel, the repository's `vercel.json` builds `dist` and routes `/api/*` to `api/index.js`; that entry sets serverless mode. Use the intended staging project and Preview environment only. No production deployment is authorized by this guide.

Set `CLIENT_ORIGIN` to the exact hosted HTTPS origin and update Auth Site URL/redirects to match. Build and server credentials must refer to the same isolated backend. `/api/health` reports process/configuration presence; it does **not** verify authentication, migrations, credentials, provider access or readiness. `/api/beta/status` must return `enabled:true`; a 503 indicates incomplete setup. Verify actual owner, approved and denied account flows, private saves, REST/storage isolation and signed URL expiry before inviting testers.

## Acceptance and rollback

Run the available automated tests/build and record exact results. Then use [BETA_TEST_CHECKLIST.md](BETA_TEST_CHECKLIST.md) on physical mobile and desktop devices. Native Safari/AirPrint, PDF rendering and physical card dimensions require real-device/printer evidence: print at 100%/Actual Size on matching paper and measure 63.5 × 88.9 mm cards and the calibration ruler. Software geometry alone cannot certify a printer.

Keep main and production unchanged until approval. Preserve card backups, immutable billing ledgers and historical balances. Roll back code through a reviewed prior artifact/revert; do not reset user data or drop tables. Disable AI, test billing and development refill flags to close those flows while investigating. A paid database branch is optional infrastructure, not a substitute for passing these gates.
