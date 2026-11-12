# Final account-safety repair pass

Confirmed P1 fixes: delayed initial session restore could replace a newer sign-in and display the prior account's local vault; password recovery could remain open after an account switch and update the new account. Both now preserve the current account context. Checkout/portal/private deck download and multi-step publishing also reject stale account/unmounted actions and freeze the initiating request session.

Independent QA reproduced the old defects and verified the repairs, including a regression built against original App code that fails as expected. Tests cover late initial success/error in App and beta gate, event-driven and silent recovery-account mismatch, A/B/A billing, duplicate clicks, unmount, and publishing after a Storage upload changes accounts. These are simulated DOM/provider tests, not actual provider/payment acceptance.

Mobile optimization: the displayed brand image is141,197bytes instead of2,373,716bytes, a94.05% reduction. Original artwork/PWA icons are retained; only displayed app/header/footer/gate references change. Independent image/diff review passed; App CRLF preserved.

Executed: npm test PASS37groups; npm run test:ui PASS24fixtures after final recovery guards; build PASS; npm audit --omit=dev --audit-level=high reports0vulnerabilities. CI/deployed smoke results will be retained with the release artifacts. No main merge, production promotion, live billing or existing user-data mutation.

Operational read-only recheck: hosted recovery active;1,176 successful automatic runs in the previous day,0failures. Cloud provider key is still absent in proxy-plane-beta Preview, so cloud AI remains disabled. Genuine account/checkout/GPU/printer acceptance remains NOT TESTED; this repair pass does not certify those results. See ../hosted-activation/RESULTS.md for the baseline service evidence and full remaining gates.


## Exact candidate and hosted evidence

Application commit: `a6edd71c31170f9cbbc322789838a49b8a18fb52` (later documentation-only changes do not alter this application).
CI run: https://github.com/Coderick96/The-Proxy-plane/actions/runs/43127742448 — all four jobs PASS (regression/build/audit, native Postgres/accounts, full Supabase services, browser/runtime/PDF).
Preview deployment: `dpl_H1Gydy65ZJNAzK1RzVRyygoAFfxj`, protected URL https://proxy-plane-beta-4r0l6t31c-mrchaserickards-6402.vercel.app .
Hosted Chromium gate checks PASS at390/768/1440px: no overflow, no page errors, optimized256px logo decoded, email recovery available, Google offered, Apple disabled. Health reports accountsConfigured=true, billingConfigured=true, aiConfigured=false; private beta enabled, anonymous device credit charge401. The existing TEST Stripe webhook now targets this exact Preview while retaining its secret bypass query securely.

Production alias still resolves to original `dpl_E3LFuW5MW3TWW2YerJs2oQBgKh2U`. No existing user records were mutated in this pass. Test purchases and owner refills remain Preview-only; live clients are forbidden by backend guards.

Recommendation: **BLOCKED for full release acceptance; repaired private beta available for owner testing.** Remaining external gates: securely supply existing OPENAI_API_KEY in proxy-plane-beta Preview and verify cloud generation; actual tester email/OAuth/reset and TEST checkout→credit/subscription fulfillment; actual supported GPU and iPhone/desktop printer checks. Do not turn mocked/local results into claims that these happened. Print calibration links and the detailed acceptance checklist remain in the source package.

Rollback: use the prior reviewed Preview or revert this code on the feature branch; disable affected Preview features if investigating. Retarget the TEST webhook to whichever Preview is under test. Keep production and main unchanged; do not restore/drop real tables or rotate shared secrets merely to rerun a test.
