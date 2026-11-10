# Runtime and device credit verification

Recommendation: BLOCKED for launch; protected preview only. No production deployment, database migration, real credit adjustment or payment was performed.

| Area | Status | Evidence and limits |
| --- | --- | --- |
| Aggregate regression | PASS | `npm test`: 30 groups, including 19 UI fixtures. See test.log. |
| Production build | PASS | `npm run build`; Asyncify runtime assets emitted; existing large-chunk advisory remains. |
| Reported runtime error | PASS | `npm run test:device-ai-runtime`: old JSEP assets reproduce webgpuInit failure; matching Asyncify executes real ONNX Add result 3.5 using SwiftShader. No model inference. |
| Runtime-managed GPU device | PASS | Executed native Add; explicit custom-device binding failed at inference and was removed. Worker checks actual native device features/limits before downloading weights or charging. |
| Device credit debit | PASS | Actual PGlite SQL and mocked HTTP authorization: fixed one-credit debit, same-ID retries, owner/fingerprint isolation, uppercase UUIDs, exhausted balance and refunded receipt rejection. No live database. |
| Credit retry and account isolation | PASS | Component tests: frozen account session, A/B/A races, uncertain response reuse, last-credit retry, fresh receipt revalidation on worker restart, no output before authorization. |
| Owner refill | PASS | PGlite SQL, mocked HTTP and component tests: owner/code gates, production rejection, additive 100-credit wallet grant, idempotency, uppercase UUIDs, account-switch isolation. No real account refill. |
| Browser/mobile layout | PASS | Actual App/Chromium with mock Worker/GPU/account/credit API at 390, 768, 1440: no overflow, zero scoped axe violations, one authorization POST, no popups/errors. See browser.log. |
| Independent review | PASS | Separate security reviewer executed SQL checks and identified refund-replay, UUID and account epoch defects; root fixed and tested each. Runtime reviewer inspected installed ABI; custom-device advice was superseded by executed failure and managed-device test. Final follow-up accepted managed-device validation; the retry-credit wording correction was applied. See INDEPENDENT-REVIEW.md. |
| Multi-connection SQL races | NOT TESTED | PGlite serializes queries; transaction/locks reviewed, but real concurrent Postgres execution remains required. |
| Hosted account/credit backend | BLOCKED | Isolated Supabase database and credentials/owner ID unavailable; existing real-data project remains read-only. AI pause gate remains closed. Preview refill secret/opt-in configured only; cannot redeem yet. |
| Genuine diffusion | BLOCKED | Available SwiftShader lacks shader-f16; complete model generation on physical GPU/phone not executed. |
| Actual iPhone/Android printing and GPU | NOT TESTED | Real-device memory fit, generation, Safari PDF rendering and physical 63.5 × 88.9 mm print measurement still required. |
| Live external AI/Stripe | NOT TESTED | No external generation/payment performed; local Stripe test-mode regressions pass in aggregate suite. |

## Security limits

Public model weights and user-controlled client code cannot enforce tamper-proof paid inference. The normal app requires a server receipt; modified clients can run weights independently. Raw prompts/images are not sent to device credit authorization. Device failures after debit require same-request retry or owner review; no client-controlled automatic refund.

Owner refill code is server-only, authenticated owner-only, Preview/development-only and disabled in production. No secret values are in these artifacts. Both SQL setup files require reviewed application to an approved isolated staging database; none were applied remotely.

## Rollback and activation

Keep main and production unchanged. Roll back the preview to PR7 if necessary, noting that PR7 retains the reported runtime bug and obsolete free-device behavior. Disable DEV_CREDIT_TOPOFF_ENABLED and BETA_AI_ENABLED to close the new flows. Migrations are additive; do not drop real user tables. Before activation: provision approved isolated staging, apply reviewed baseline credit/device and optional refill SQL, configure account credentials and OWNER_USER_ID, verify real PostgreSQL concurrency/account isolation, then enable AI for invited testers. Never use live Stripe credentials.
