# Private-beta launch gate review

Recommendation: **BLOCKED**. The code is a private-beta candidate; this report is not approval to merge or deploy production. Main, real-data Supabase projects and live payments remain untouched.

| Gate | Result | Executed evidence / remaining limit |
| --- | --- | --- |
| Aggregate regression | PASS | `npm test`: 32 groups. Includes owner/device credit, account-switch races, Stripe test-mode guards, editor/import/print and the new preflight/browser-acceptance regressions. Providers and parts of HTTP/Auth are mocked. |
| Production build | PASS | `npm run build`. Existing >500 kB main-chunk advisory remains. |
| Production dependency audit | PASS | `npm audit --omit=dev --audit-level=high`: zero advisories at execution time. This is not a security certification. |
| Native PostgreSQL contention | PASS | `npm run test:postgres`: real PostgreSQL 17.6, separate connections. Sixteen duplicate requests debit once; 24 unique requests cannot overspend 10 starter credits; foreign-owner operation collisions are rejected; 16 duplicate refills grant once; concurrent refunds restore once. RPC/table privileges deny unprivileged roles. Auth/storage schema interfaces remain fixtures. |
| Actual local account/API flow | PASS | `npm run test:accounts-local`: actual GoTrue signup/login/refresh, PostgREST owner-only vault writes/reads, real private-beta outsider denial, actual app→supabase-js→GoTrue/PostgREST→native PostgreSQL credit endpoints. Eight duplicate authorizations debit once; eight owner refills grant 100 once; other users are denied; access API returns separate balances. Auto-confirmed local accounts and SQL Auth/storage helpers are not email delivery or Storage HTTP proof. Disposable resources were removed. |
| Scryfall live catalog | PASS | Four actual read-only HTTP searches using the app query builder: M21/green/rare filters, price ascending/descending and mana ascending/descending. All returned 200 and 12 correctly filtered/ordered cards. Does not establish all alternate artwork/deck URL paths. |
| Browser layout/navigation | PASS | `npm run test:browser`: 390/768/1440 layouts; 18 flows; six accessibility scans, all empty; no page errors. The harness now asserts accessibility and route-overflow results. Optional catalog proxy refused because no backend is running in this isolated harness; no real catalog provider was tested. |
| Browser printing | PASS | `npm run test:print-browser`: nine imported/custom cards, 750×1050 captures, real PDF files and print/export buttons. |
| Independent PDF sizing | PASS | Separate QA inspected both generated PDFs with PyMuPDF: nine image placements each, 63.5×88.9 mm in PDF coordinates. Physical output is unverified. |
| Runtime initialization | PASS | `npm run test:device-ai-runtime`: old JSEP assets reproduce the reported error; matching Asyncify runs real ONNX Add on SwiftShader. This is not diffusion. |
| Device artwork UI | PASS | `npm run test:device-ai-browser`: actual App/Chromium with explicit GPU/Worker/Auth/credit API mocks, 390/768/1440 widths, one authorization POST, no overflow/accessibility findings/popups. This is not real diffusion or billing delivery. |
| Configuration preflight | PASS | `node tests/beta-preflight.mjs`: missing/mismatched settings, public-secret exposure, invalid owner, live Stripe and production refills are rejected. Current unconfigured environment correctly returns SETUP BLOCKED from `npm run beta:check`. Offline success does not prove valid credentials or account isolation. |
| GitHub checks | NOT TESTED | Workflow added for regression/build/audit, native PostgreSQL, actual local account services and four browser harnesses. Read-only permissions, pinned action/image references, no secrets or deployment steps. GitHub execution must pass on the published PR. |
| Full local Supabase | BLOCKED | Both normal and reduced official CLI starts exceeded the 8 GB workspace disk capacity during image extraction; stopped before activation. This was a local capacity failure, not an application test failure. |
| Hosted account/credit backend | BLOCKED | Preview health reports accountsConfigured=false, billingConfigured=false, aiConfigured=false. Existing real-data database remains read-only. An approved isolated hosted database and secure configuration are still needed for a remotely usable beta. |
| Real OAuth/email delivery | NOT TESTED | Google/Apple provider setup, email confirmation/delivery and session revocation need actual configured services and callbacks. |
| Genuine device artwork | BLOCKED | Available software adapter lacks shader-f16. Complete pinned-model generation, memory fit, cancellation and card application need compatible physical hardware. |
| Stripe integration delivery | NOT TESTED | Local signature/mode/idempotency regressions pass. No actual Checkout→webhook→database fulfillment, renewal/cancellation/refund delivery was executed. Purchases remain off. |
| Cloud idle refunds | BLOCKED | Continuous Node server has reconciliation; serverless has no configured idle scheduler. Keep cloud AI disabled until an authenticated scheduler and failure recovery are verified. |
| Physical/iPhone printing | NOT TESTED | Letter/A4 calibration PDFs are available. A person must test Safari/AirPrint/PDF rendering, Actual Size, 25.4 mm ruler, 63.5×88.9 mm trim and duplex registration on actual printer/paper. |

## Confirmed repairs in this branch

- P1 setup blocker: referenced environment template was absent. Added tracked `config/beta.env.example` with empty credentials and disabled paid features.
- P1 setup blocker: instructions omitted cloud recovery SQL. Corrected full dependency order, beta-last requirement and optional owner-refill setup.
- P2: stale version, source-branch and 15-credit instructions contradicted the current application. Current guidance now identifies 2.6.5, 10 introductory credits and the pending launch-gates branch; historical release notes remain preserved.
- P2 QA defect: accessibility/route-overflow findings could be recorded while the browser harness exited successfully. They now fail the run, with regression fixtures proving failure behavior.
- P2 preflight defect found independently: arbitrary strings were accepted as public account keys. Public-key format/role validation now rejects service and unrelated provider keys, and server-key format is checked separately.

## Independent evidence

Three separate reviewers covered security, browser/print and release setup. Browser QA independently measured PDF placements and reviewed completed browser output. Setup QA executed preflight and browser-gate tests and reviewed CI safety. Independent Docker attempts were permission-blocked; only the lead's native PostgreSQL execution is claimed. Do not interpret three reviewers as three independent end-to-end executions.

## Activation and rollback

1. Use an approved isolated backend; never replay setup into the existing real-data projects. Complete secure configuration and run `npm run beta:check`.
2. Verify real account A/B REST and Storage isolation, beta admission and owner identity. Apply/review only the documented setup sequence on that isolated backend.
3. Keep billing/cloud AI paused until real test-mode webhook delivery and scheduled recovery pass. Never use live Stripe keys.
4. Complete physical-device generation and printing acceptance in `BETA_TEST_CHECKLIST.md`.
5. Require green PR checks and review. No merge or production deployment is authorized by this report.

This branch adds setup/test/CI materials and does not replace application workflows. Roll back by returning to the prior preview/source commit or reverting this branch. Preserve all card data and credit ledgers; never delete or reset databases as rollback. Local native test containers remove only their own generated container and disposable volumes.
