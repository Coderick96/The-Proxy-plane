# Assistant Manager Q — independent final regression review

## Scope and evidence

Reviewed `/workspace/proxy-plane-latest`, branch `feature/local-art-audit-homepage`, authoritative Local Art 2.6.5 baseline `1707c3ffcc2a351a1db2e2de4802ac902a9526ee`. Package remains version 2.6.5. The current source changes were uncommitted during this review; fingerprints for the reviewed integration files are in `qa1/reviewed-files-sha256.json`.

This reviewer changed only this report and files under `docs/qa/qa1/`. No source fixes, commits, deployment, remote database operations, real payments or external authentication calls were performed by this reviewer.

## Independently executed results

| Command | Status | Actual evidence |
| --- | --- | --- |
| `npm run test:ui` | PASS | Exit 0; all 13 UI groups completed in `qa1/final-ui.log`. Covers community privacy, account A/B/guest isolation, delayed backup imports, backing controls, paid/free editor/deck workflows, beta admission UI, queue removal, bleed preview, homepage callbacks/account states, double-faced cards and auth error recovery. |
| `npm run build` | PASS | Exit 0; Vite built in 6.72 seconds. Raw output `qa1/final-build.log`. Main chunk 613.33 kB minified / 171.64 kB gzip; the >500 kB warning remains. |
| `node tests/print-output.mjs` | PASS | `qa1/print-output.log`; software PDF/HTML/card geometry, supported papers/orientations/bleed, offsets, ranges, capture/cancellation and hard trim-size guards. |
| `node tests/card-backs.mjs` | PASS | `qa1/card-backs.log`; inheritance, overrides, locked-backing rejection, duplex mapping and partial sheets. |
| `node tests/credits-db.mjs` | PASS | `qa1/credits-db.log`; local PGlite checks for one-time 10 starter credits, 200 paid-month credits, expiry, duplicate invoice/period handling, wallet persistence, refunds and account isolation. |
| `node tests/premium-db.mjs` | PASS | `qa1/premium-db.log`; local PGlite purchase/grant/credit/ownership/limit checks, not deployed Supabase verification. |
| `node tests/premium-logic.mjs` | PASS | `qa1/premium-logic.log`; safe restore/template preservation, pack ownership, asset detection, bleed geometry and pagination. |
| `node tests/evolution-db.mjs` | PASS | `qa1/evolution-db.log`; earlier migration stage including legacy daily accounting and paid-deck entitlements. This does not supersede credits.sql policyVersion 30. |
| `node tests/beta-db.mjs` | PASS | `qa1/beta-db.log`; simulated SQL roles, beta admission/revocation, private roster/feedback and REST/RPC/storage gates. |
| `node tests/privacy.mjs` | PASS | `qa1/privacy.log`; default privacy, anonymous/account isolation, private collections/profiles, storage policy and follows. |
| `node tests/workspace-state.mjs` | PASS | `qa1/workspace-state.log`; explicit guest copy and duplicate/full-vault preservation. |
| `node tests/local-art-web.mjs` | PASS | `qa1/local-art-web.log`; fixture PNGs/streaming/three choices/origin and source validation. No actual image model executed. |
| `node tests/monthly-billing.mjs` | PASS | `qa1/monthly-billing.log`; mocked invoice/customer/price/paid-month/cycle validation. No actual Stripe API request. |
| `git diff --check` | PASS | Empty `qa1/diff-check.log` for current changes. |

Machine-readable command/exit results for the 11 standalone local groups: `qa1/final-local-results.json`.

### Attempted but not independently completed

An earlier `npm test > docs/qa/qa1/final-npm-test.log 2>&1` escalation request remained pending and was aborted before test execution. It provides **no pass evidence**. HTTP suites that bind localhost were not independently rerun by this reviewer after that blocker. The lead executed the full suite through an approved route; its logs belong to the lead, not this reviewer. Browser QA was independently authored/reviewed by QA3 and executed through the lead's runtime; this report does not relabel it as my browser execution.

## Source review and acceptance assessment

- **PASS, reviewed and exercised:** Home sends actual App page IDs/callbacks; recent cards still load the editor; no purchase callback is presented as a purchase completion. Logged-out/unconfigured states do not fabricate account balances. Credit copy agrees with 10 starter / 200 paid-month policy.
- **PASS, reviewed and exercised:** email signup/signin and OAuth failures release `authBusy` through `finally`; failed signout preserves the existing account/private workspace and successful signout restores the guest workspace. This proves mocked failure handling, not provider setup.
- **PASS, reviewed and exercised:** library selected-face actions explicitly pass the chosen face; generic result actions default to face zero and do not inherit another card's face state.
- **PASS, source reviewed with QA3 browser evidence handled separately:** all export-affecting settings invalidate the prepared PDF and abort in-flight preparation; lazy PDF/raster modules preserve the export flow. Blank backing is explicitly marked only for a genuine `none` back, allowing a white raster without treating arbitrary failed captures as intentional blanks.
- **PASS, reviewed and exercised:** bleed is passed consistently to spacing-preview geometry; exact trim rectangles remain 2.5 × 3.5 inches.
- **PASS, reviewed:** aggregate and beta/UI runners treat null/nonzero child statuses as failures. Aggregate runner now includes previously unreferenced print-queue and new regressions.
- **PASS, source reviewed:** mobile grid uses zero minimum track sizing so a zoomed card remains inside an independently scrolling preview viewport. Visual/native outcomes are QA3/device evidence, not jsdom claims.

No new confirmed P0/P1 issue was found in the changed frontend/export paths reviewed here. Existing editor behavior is substantially regression-covered; this is not a claim that every control/asset/frame combination has been exercised.

## Remaining issues and release gate

- **P2:** main JS remains >500 kB minified despite lazy export imports. Measure cold mobile load on target devices; the build warning is not a functional test failure.
- **BLOCKED:** actual email/Google/Apple setup, hosted Supabase RLS/storage/account isolation, live Scryfall/deck provider reliability beyond the lead's limited read-only probes, and Stripe sandbox checkout/webhook/lifecycle acceptance require configured external test services. PGlite and mocks cannot certify deployed policies.
- **BLOCKED:** durable recovery for AI reservations across process crashes/refund-RPC failures and historical deployed database constraint compatibility require specialist resolution/acceptance before enabling paid AI use. See the security audit; this reviewer did not perform a database migration or crash-recovery integration test.
- **NOT TESTED:** actual SDXL generation/model installation, native iPhone Safari/PDF/AirPrint, real printer/card measurements, target-host deployment and rollback. Software geometry establishes coordinates, not physical print accuracy.
- **NOT TESTED:** dedicated lint/type-check commands are absent; Vite and esbuild compilation are not replacements for configured linting or TypeScript analysis.

Recommendation: **BLOCKED for launch approval**. The independently exercised local regression/build gate passes, but external-service, AI-recovery and real-device/physical-print gates remain open. Do not merge or deploy based solely on these local results.
