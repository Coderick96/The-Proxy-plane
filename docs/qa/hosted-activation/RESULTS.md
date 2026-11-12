# Final connected private-beta verification

Latest account-isolation repairs and mobile asset verification: [launch-final/RESULTS.md](../launch-final/RESULTS.md). The service evidence below records the earlier connected baseline.

Recommendation: **BLOCKED for full release acceptance; controlled owner/tester beta is available.** No main merge, production promotion or live payment occurred. This report supersedes earlier read-only/not-configured snapshots.

Tested application commit: `428d2d32ee85b87e70be805bd4f9a2166f89f791`.
CI: https://github.com/Coderick96/The-Proxy-plane/actions/runs/42962788388 — all four jobs PASS.
PR: https://github.com/Coderick96/The-Proxy-plane/pull/11 — unmerged draft.
Preview: https://proxy-plane-beta-mhbee2j7u-mrchaserickards-6402.vercel.app (Vercel protection plus approved-email account gate).
Preview deployment: `dpl_7d2zT2R5VvKih5UBpB7RAE7CAGF8`.
Production still points to `dpl_E3LFuW5MW3TWW2YerJs2oQBgKh2U`.

## Repairs completed

- Repaired legacy server-only Supabase credential compatibility; actual hosted service RPC verified. Public/malformed credentials are rejected and no private key reaches browser variables.
- Applied the explicitly approved, reviewed storage/credit/recovery upgrade. All25 existing public/Auth/Storage table row counts and fingerprints matched before/after; existing user data and paid balances were preserved. No baseline reset or regression fixture was inserted into existing accounts.
- Added beta-entry Google/provider availability controls and complete email password-reset request/update/retry handling. Recovery takes priority for approved sessions; missing sessions cannot update passwords. Banner derives version from package.json.
- Fixed shared Stripe-account invoices and checkouts: unrelated customers are acknowledged without granting credits; mapped identity mismatches still fail. Added signed HTTP regression fixtures.
- Fixed checkout and portal returns to use the actual hosting-supplied Preview origin rather than the old production URL. No client-controlled Host/Origin header chooses the destination.
- Installed bounded SQL credit recovery through Supabase pg_cron every minute. Actual automatic successful runs observed;30-second statement/5-second lock timeouts, fixed batch20, no API keys or paid scheduler required. Hosted operation/charge/refill tables remain empty. Empty scheduled ticks are distinct from the local expired-reservation refund tests.
- Configured approved Manafiquetcg TEST prices, a signed TEST webhook and a test portal with period-end cancellation. Actual hosted credential/account/price checks pass. A Stripe-generated no-payment customer connectivity event reports pending_webhooks0; its temporary event subscription was removed. Separately, the actual endpoint rejects an invalid signature400 and accepts a manually signed no-op200. None of these proves checkout fulfillment.
- Preview device AI, owner refill and TEST billing are enabled. Production AI/billing remain false. Cloud AI remains explicitly disabled because OPENAI_API_KEY is absent; securely reusing an existing key has been requested. No new key or paid plan was created.

## QA matrix

| Area | Status | Executed evidence / limit |
|---|---|---|
| Regression/UI/build/dependency audit | PASS | Latest CI:37 groups including21 UI fixtures, successful build, zero production-dependency audit vulnerabilities. |
| Native account/credit isolation and concurrency | PASS | CI Postgres/Auth/REST job; actual local services, concurrent connections, duplicate-safe credit operations. |
| Storage ownership and confirmation email | PASS | Full local Supabase Storage/Mailpit CI job; owner/foreign/anon/update/upsert/signed-URL and actual confirmation-link flows. External delivery is separate. |
| Mobile navigation/accessibility | PASS | Chromium390/768/1440, all six axe assertions, no route overflow/errors. Final hosted gate includes Google availability, disabled Apple and password recovery. |
| Scryfall catalog filters and price/mana sorts | PASS | Live HTTP200 responses for four orders with set/color/rarity; broader external deck-provider coverage remains limited. |
| Editor/queue/PDF geometry | PASS | Browser/regression checks; nine actual PDF image placements at63.5×88.9mm on Letter. Software evidence only. |
| Actual model reference inference | PASS | Hash-verified real text encoder,12 actual UNet steps, three VAE decodes on CPU; finite512×512 outputs, visually inspected. See MODEL-REFERENCE.md. |
| Browser inference runtime initialization | PASS | Actual ONNX Add on software WebGPU; old webgpuInit error reproduced and corrected. Not full native GPU diffusion. |
| Hosted recovery scheduler | PASS | Automatic cron.job_run_details succeeded on multiple minute boundaries; fixed bounded qualified SQL, no user fixture mutation. |
| Hosted Stripe credential/prices/signature boundary | PASS | Actual approved test account/four prices; signed no-op transport and Stripe-generated connectivity probe. No real card/payment. |
| Real authenticated Stripe checkout→credits/renewal/cancellation/refund | NOT TESTED | Local signed/mocked and database fixtures pass; genuine tester workflow still required. TEST checkout now available. |
| External Google callback/email/reset delivery | NOT TESTED | Provider availability read; DOM recovery tests and local Mailpit pass. Apple unavailable and disabled. Genuine identity/provider interaction remains required. |
| Full diffusion on actual phone/PC WebGPU | NOT TESTED | No physical GPU available here. CPU reference and small native runtime tests do not certify device fit/performance. |
| Physical iPhone/AirPrint/desktop sizing | NOT TESTED | Print100%/Actual Size and measure63.5×88.9mm on actual hardware. Calibration PDFs supplied separately. |
| Cloud artwork provider | BLOCKED | Existing key must be saved securely as Preview-only OPENAI_API_KEY in proxy-plane-beta; no key in chat. Recovery scheduler is now verified. |

## Independent review and scope

QA1 independently passed nine security/credit/RLS suites and found no confirmed P0/P1 in that bounded review. QA2 independently checked live Scryfall orders and actual PDF dimensions; its first broad browser run was interrupted by concurrent HMR and was not counted as a pass. The orchestrator subsequently ran the immutable repaired source successfully, and CI browser job passed. QA3 independently passed the billing regression and existing beta UI checks, and reviewed cron timeouts and report consistency. Several later agent turns hit the session usage limit, so this is not a claim that three agents independently executed every final change. Latest code passed all four independent CI jobs; targeted operator-readiness/origin tests were additionally run by the orchestrator.

## Commands and retained evidence

- `npm test`: local36-group run before final origin regression; latest CI37 groups includes it.
- `npm run test:ui`:21 fixtures.
- `npm run build` and `npm audit --omit=dev --audit-level=high`.
- `npm run test:browser`; `PRINT_BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:print-browser`.
- `npm run test:device-ai-runtime`; `npm run test:device-ai-browser` in CI.
- `npm run test:accounts-local`; `node tests/postgres-concurrency.mjs`; `npm run test:supabase-stack` in CI.
- `node tests/app-origin.mjs`, `node tests/billing-readiness.mjs`, `node tests/billing-foreign-invoice.mjs`, `node tests/premium-server.mjs`.
- Actual CPU model commands and scope are documented in docs/qa/finish-beta/MODEL-REFERENCE.md; raw logs/three decoded examples are in accompanying verification artifacts.

The first local print rerun used the wrong environment-variable name and could not locate Playwright's bundled browser. The corrected command above executed successfully. A first hosted operator probe lacked its in-memory secret and made no request; a later one refused a cross-origin protection redirect. The final probe used a scoped automation bypass and passed. Failed attempts are not represented as passes.

## Prioritized remaining work

- P1 acceptance: actual GPU generation and real mobile/physical printing; actual tester identity and TEST checkout→wallet/subscription acceptance. These cannot be inferred from local fixtures.
- P1 optional cloud setup: securely supply the existing cloud key, run one real generation and recovery/error acceptance, then enable its browser flag. Keep disabled until verified.
- P2 security configuration: Supabase reports leaked-password protection disabled. Review provider availability/plan before enabling; no paid upgrade is authorized. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- P2 operations: monitor recovery failures/backlog and cron history growth; retain deployment/database backups and record tester/device performance.

Security advisors also flag intentional service-only tables without public policies and public gallery/beta helper SECURITY DEFINER functions. Those are not blanket proof of exposure: targeted ownership/RLS tests passed. Review permissions per function before changing grants; do not break gallery/beta access to silence a generic advisory. Advisory reference: https://supabase.com/docs/guides/database/database-linter

## Deployment and rollback checklist

1. Keep main and production unchanged. Reuse the tested application commit and protected Preview; do not promote without separate approval.
2. Preserve source ZIP/card backups and existing credit ledgers; schema/function backup is not a full data backup.
3. On a new Preview, update the TEST Stripe webhook URL to the exact new host, retaining its secret query bypass securely. Verify signature boundary, test account/prices and returned beta origin. Never put bypass or signing secrets into docs/browser variables.
4. For a feature regression, disable the affected Preview flags and rebuild, or return testers to the previous reviewed Preview. Disable/retarget the test webhook as appropriate.
5. For scheduler rollback, unschedule only proxy-plane-ai-recovery; do not drop shared extensions or delete ledgers. Disable cloud generation if durable recovery is unavailable.
6. Revoke the dedicated automation bypass and disable the TEST webhook when retiring the beta. Do not activate live keys, charge real cards, reset tables or restore over newer user data.
