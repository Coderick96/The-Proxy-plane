# Final account-safety repair pass

Confirmed P1 fixes: delayed initial session restore could replace a newer sign-in and display the prior account's local vault; password recovery could remain open after an account switch and update the new account. Both now preserve the current account context. Checkout/portal/private deck download and multi-step publishing also reject stale account/unmounted actions and freeze the initiating request session.

Independent QA reproduced the old defects and verified the repairs, including a regression built against original App code that fails as expected. Tests cover late initial success/error in App and beta gate, event-driven and silent recovery-account mismatch, A/B/A billing, duplicate clicks, unmount, and publishing after a Storage upload changes accounts. These are simulated DOM/provider tests, not actual provider/payment acceptance.

Mobile optimization: the displayed brand image is141,197bytes instead of2,373,716bytes, a94.05% reduction. Original artwork/PWA icons are retained; only displayed app/header/footer/gate references change. Independent image/diff review passed; App CRLF preserved.

Executed: npm test PASS37groups; npm run test:ui PASS24fixtures after final recovery guards; build PASS; npm audit --omit=dev --audit-level=high reports0vulnerabilities. CI/deployed smoke results will be retained with the release artifacts. No main merge, production promotion, live billing or existing user-data mutation.

Operational read-only recheck: hosted recovery active;1,176 successful automatic runs in the previous day,0failures. Cloud provider key is still absent in proxy-plane-beta Preview, so cloud AI remains disabled. Genuine account/checkout/GPU/printer acceptance remains NOT TESTED; this repair pass does not certify those results. See ../hosted-activation/RESULTS.md for the baseline service evidence and full remaining gates.
