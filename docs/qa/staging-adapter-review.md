# Independent protected-staging adapter review

Reviewer: independent QA agent `qa_staging_adapter`. Date: 2026-11-08.
Scope: `api/index.js`, `vercel.json`, `.vercelignore`, and serverless change in `server/index.js`. No application changes, resource mutations, or commits by this reviewer.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| Production frontend build | PASS | `npm run build`, exit 0; Vite 6.4.5 transformed 1,938 modules and built in 4.15 s. |
| Adapter import | PASS | `node --input-type=module -e "import app from './api/index.js'; if(typeof app!=='function')throw Error('Not Express'); if(app.locals.stopAIRecovery)throw Error('Serverless interval exists'); console.log('PASS Express default export imports without opening a socket; no recovery interval');"`, exit 0. No credentials supplied. |
| Raw webhook parsing source order | PASS | `/api/billing/webhook` uses `express.raw` before global `express.json`; the adapter passes the original Express app without adding a parser. This is source inspection, not a hosted webhook test. |
| Test-only webhook safeguards | PASS | Source rejects non-test secret keys and events where `livemode !== false`; Stripe `constructEvent` receives the request buffer and signature. |
| Serverless background timer | PASS | Adapter supplies `SERVERLESS_MODE=true`; interval creation is guarded by `services.configured && env.SERVERLESS_MODE !== 'true'`. Existing persistent-server behavior remains unchanged. |
| Backend dynamic assets | PASS | `includeFiles: server/assets/**` covers dynamically read premium SVG assets. Source review only. |
| Secret packaging | PASS | `.vercelignore` excludes `.env`, `.env.*`, `.git`, dependencies, archives and build output. No secret literal introduced in reviewed diff. This does not certify Vercel's configured secret values. |
| Function duration | PASS | Configured 300 seconds matches the Hobby maximum; this does not guarantee every AI request finishes within it. |
| Hosted API rewrites, raw bytes, static priority, SSO | NOT TESTED | Requires an actual protected deployment and HTTP checks; no deployment performed by this reviewer. |
| Stripe delivery / isolated DB authorization | BLOCKED | Credentials, protected-webhook delivery setup and isolated database configuration are outside this source review. Existing real-data database must remain read-only. |

## Required hosted acceptance checks

Before inviting testers, verify `/`, a real `/assets/...` bundle, an SPA deep link, `/api/health`, an unknown `/api/...` path, and an unknown static asset. Confirm API routes retain their original path through `/api/:path* -> /api`; the SPA rewrite must not turn API errors into HTML. Verify unauthenticated external access is protected by Vercel SSO, and inspect the browser console/network for missing assets. Verify `billingConfigured` and AI UI accurately reflect paused integrations. A signed TEST webhook must be checked through the deployed adapter before calling billing verified; keep protection and use a scoped automation bypass rather than exposing the preview.

## Integration gates and constraints

1. **Cloud AI must stay paused.** Vercel Functions impose a 4.5 MB request/response payload limit. The current nonstreaming `res.json` contains three base64 images and can exceed the response cap, including recovery-detail responses. Re-sketch accepts a source up to 10 MiB and global JSON accepts 12 MiB, above the platform request cap. Use private object storage with authenticated result access/direct uploads, or an appropriately implemented streaming response and a bounded upload path, before claiming this integration works on Vercel. Returning a platform error after paid generation is not acceptable credit delivery.
2. **Idle refund recovery needs a real scheduler** before cloud AI activation. Removing the persistent timer is correct for serverless. Opportunistic request-driven reconciliation does not guarantee recovery while the app is idle. Provision and verify an isolated scheduled reconciler; a preview-only deployment must not assume production-only Vercel Cron executes there.
3. **Process-local limits are not durable global limits.** Deck import counters and AI pending sets reset across instances; durable credit operations remain essential. Shared rate limiting should precede broader exposure, especially once generation is enabled.
4. **CORS origin needs the exact preview origin** once external frontend/backend flows are used. No server secret should be put in a `VITE_` variable. Missing-service preview health is not evidence that authenticated flows are configured.
5. **Build warnings:** main bundle 617.54 kB minified / 173.03 kB gzip; mixed static/dynamic html-to-image imports prevent isolation into another chunk. These are performance follow-ups, not evidence of a failed build.

## Recommendation

**Protected core-preview candidate**, conditional on real hosted routing/assets/SSO smoke checks and clearly paused AI/billing/account-dependent workflows. **Full private beta remains BLOCKED** on isolated backend configuration and end-to-end integration evidence. No production deployment, merge, live payments, real-data writes or physical printer accuracy is approved or verified by this report.
