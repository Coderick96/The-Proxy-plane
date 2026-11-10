**On-device artwork does not require the cloud setup below.** Browser-local generation is a separate mode with no account/AI-credit requirement; see [DEVICE_AI.md](DEVICE_AI.md). These account/database instructions still apply to cloud features.

# The Proxy Plane 2.6.1 — private beta for 10 cardsmiths

Current staging status: **Proxy plane** (`esndctzrbpoiljwenevp`) contains real
user data and is read-only for this work. Use a NEW isolated project or development
branch for the installation steps below. Do not run these setup scripts against
the existing real-data project. Hosted staging accounts and cloud AI remain paused
until their isolated backend and credentials are verified. A free staging project
could not be provisioned because the connected account has reached its free-project
limit. Never share server secret keys in chat or put them in VITE variables.

This package is prepared for a closed beta, not an already-hosted service.
You can test on your PC today, then share a hosted HTTPS URL when deployed.
There are 10 approved tester email slots; the owner has separate access.
No emails, real purchases, API calls, account creation, or cloud migration were
performed while preparing this release.

## First run on your PC

1. Extract into a NEW folder. Keep the old release and export your card backup.
   Use Node.js 22 or later. Open a terminal in the proxy-kingdom folder.
2. Create a dedicated beta Supabase project (recommended). In its SQL Editor,
   run these files in order: supabase/schema.sql, community.sql, premium.sql,
   evolution.sql, credits.sql, beta.sql. Existing 2.6 databases need beta.sql
   last. Do not rerun older migrations after beta.sql; rerun credits.sql then
   beta.sql last if that happens. This beta migration immediately restricts
   access; avoid applying it to an unrelated/live community database.
3. Copy .env.beta.example to .env. Fill VITE_SUPABASE_URL,
   VITE_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from the SAME
   Supabase project. The VITE key must be the public anon/publishable key.
   The service role/secret key stays server-only. Do not paste keys into chat.
4. In Supabase Authentication settings enable email/password, Confirm Email,
   and configure Site URL + allowed redirects. For PC testing use
   http://127.0.0.1:5173. Use a working email provider/SMTP setup for testers;
   verify actual delivery before handing out the URL. Configure Auth signup
   rate limits/CAPTCHA appropriate to the deployment.
5. Create your owner account in Supabase Authentication > Users and confirm it.
   Put its user UUID in OWNER_USER_ID in .env. Keep BETA_MODE=true and
   VITE_PRIVATE_BETA=true. The owner UUID is not an email address.
6. Run npm install, then npm run beta:setup, then npm start. On Windows you can
   instead double-click START_PRIVATE_BETA.bat after steps 1–5. The launcher
   checks setup, installs if needed and opens the app at http://127.0.0.1:5173.
7. Sign in as owner. Open Beta desk, add the approved email in each of slots
   1–10. Slot replacement/removal revokes the previous tester’s future access.
   Adding an email does not send an invitation. Share the URL yourself.
8. Each tester uses Create tester account with that exact email, confirms the
   email, then signs in. Existing verified accounts can sign in directly.
   Only approved accounts can claim access. Phone-only/unverified accounts
   cannot enter. The backend uses verified Auth data, never editable metadata.

The roster caps approved access, not the number of Auth signup records. A person
could still create an unapproved Auth account, but gets no app/cloud access.
Approval is checked on every API request and direct database/storage requests.
Already-downloaded cards and previously issued signed URLs cannot be recalled;
signed URLs remain usable until their original expiry. Removing a tester does
not delete their private projects or feedback. Keep a separate beta project.

## Keep costs off while testing the core

BETA_AI_ENABLED=false and BETA_TEST_BILLING=false are the defaults.
No API key or Stripe account is required for editing/import/printing tests.
Image generation is paused server-side and takes no credit. Upload your own art
or import real card text while testing. Starter credit policy remains 15 once;
paid Premium remains 200/month and 1 art prompt = 3 choices for 1 credit.
This release does not give testers free Premium or change prices/allowances.

If testing billing later, use ONLY Stripe TEST keys/prices and set
BETA_TEST_BILLING=true. Live checkout/portal is blocked during beta even if a
live secret is accidentally supplied. Configure and verify the webhook first.
Never enter a real payment card in test checkout. Simulated subscriptions still
exercise the 200/month policy in this isolated beta database.

If intentionally testing AI later, configure an available image model/provider,
verify its current cost and your provider limits, then set BETA_AI_ENABLED=true.
The app's image generation, editing and safety configuration must all work; test
refunds. A key merely being present does not verify that its model works.
Credits are app allowances, not a dollar spending cap at the provider. Safety
checks also use provider resources. No hosted AI integration was exercised here.

## Give all 10 testers a web URL

Localhost only works on the computer running the app. Do not send localhost to
remote testers or expose your development port to the internet.

Use a Node-capable HTTPS host plus your Supabase project:
- Install/build command: npm ci && npm run build
- Start command: npm run serve
- Server env: HOST=0.0.0.0, SERVE_WEB=true, BETA_MODE=true, OWNER_USER_ID and
  the server Supabase keys. Use the host's PORT value.
- Build env: VITE_PRIVATE_BETA=true, VITE_SUPABASE_URL and the public VITE key.
  Vite values are baked into the build; rebuild if they change.
- CLIENT_ORIGIN: exact hosted HTTPS origin; update Supabase Site URL and redirect
  allowlist to match. Both server and frontend must use the same beta database.
- Keep BETA_AI_ENABLED=false and BETA_TEST_BILLING=false for the first round.
- Health endpoint: /api/health. It checks process liveness, not credentials.
- /api/beta/status must return enabled:true without exposing the roster. A 503
  means setup/owner configuration is incomplete. Sign in as the owner and test
  approved and unapproved accounts before sharing the URL.
- Run npm run beta:setup once with the hosted server's credentials if not already
  configured against the same database. This command only configures the owner;
  it does not deploy or send invitations.

The Node server serves the built frontend and API on one origin. No Vite dev
server is needed in hosting. Do not upload .env or service keys as public files.
Take a database backup before migrations. Confirm private buckets stay private.

## This afternoon/evening: owner acceptance test

Use BETA_TEST_CHECKLIST.md. Test core locally first. Then exercise two real
accounts, phone + desktop, and one physical print before inviting the rest.
Use Beta desk for reports; the owner can mark New / Investigating / Fixed.
Reports contain only text you deliberately submit, not automatic card dumps.
Feedback is private and capped at 10 reports/account/hour, including direct REST.

## After the beta

Do not turn off only one beta flag. Keep all restrictions while reviewing reports.
For a deliberate public launch: back up first, set pp_beta_config.enabled=false
in SQL Editor, set BETA_MODE=false and VITE_PRIVATE_BETA=false, rebuild/restart.
Existing privacy/ownership policies remain; the added restrictive policies then
allow the original permissions. Do this only when ready for public access.
