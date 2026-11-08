# Independent QA2: frontend recovery and regression

Reviewed 2026-11-07 in `/workspace/proxy-plane-latest`, branch `feature/local-art-audit-homepage`. Scope is current uncommitted AI recovery frontend and existing homepage/authentication/printing regressions. No app files changed by this reviewer; no remote services contacted.

| Check | Result | Evidence |
| --- | --- | --- |
| Actual React UI regression suite | PASS | `npm run test:ui`, exit 0; 14 fixture pass lines in `qa-recovery-ui/ui-tests.log` |
| Recovery metadata-only initial request, explicit result retrieval, GET-only recovery | PASS | Actual `AIRecovery` component in `tests/ai-recovery-ui.jsx`, executed by suite |
| Signed-out state, delayed A result after switching B, stale A metadata after A/B/A | PASS | Actual component tests; simulated authentication/fetch |
| Explicit image selection and current-card isolation | PASS (review + existing UI simulations) | Recovery only sets three choices; App associates them with captured editor ID; `ArtChoices` requires Use option click. Card changes hide choices for another ID. Recovery fixture itself does not exercise the entire App integration. |
| UUID request generation without mutating caller; server error ID/status | PASS | API assertions in executed recovery fixture |
| Network/auth/non-JSON error operation ID retention | PASS after repair | Independent injected network failure, session exception and non-JSON 503 assertions exit 0; `qa-recovery-ui/network-error-probe-final.log`; final UI suite exit 0 |
| Homepage routes/account/credit/disclaimer/offline fallback | PASS | Executed homepage fixture; simulated DOM |
| Authentication failure/retry/signout account isolation | PASS | Executed actual App auth-recovery and account-workspace fixtures; simulated providers |
| Print geometry/queue/spacing/backing regressions | PASS | UI suite and `npm run test:print`, exit 0; `qa-recovery-ui/print-tests.log` |
| Real browser, iPhone Safari, physical printer | NOT TESTED | These runs use jsdom and software PDF/document assertions; physical trim cannot be certified |
| Supabase policies / Stripe / AI provider integration | NOT TESTED | Outside this frontend review; no credentials or real-data writes used |

## Finding repaired and independently retested

Original P2: transport exceptions and non-JSON responses lost the generated operation ID. Root repaired `src/premiumApi.js` with an outer catch retaining the originally submitted ID while preserving server error IDs/status. Independently reran the actual UI suite: exit 0, all 14 fixtures, `qa-recovery-ui/ui-tests-final.log`. An additional independent probe asserted network rejection, non-JSON 503 and session exception retain the ID; caller body remains unchanged. Probe exit 0. Original failing evidence is retained for traceability. No remaining blocker found in this frontend scope.

## Limits

The full UI command passed independently before and after repair; the print command passed once independently. These are automated simulated DOM/provider tests and software geometry tests, not external integrations or a complete launch certification. The reviewed recovery fixture does not test malformed image results, downloaded JSON, keyboard interaction, or delayed recovery result over A/B/A specifically (metadata A/B/A is covered). No cross-account exposure or extra billing POST found in the scoped source review.


## Final mobile UUID helper review — 2026-11-08

PASS: independently executed `node tests/uuid.mjs` (exit 0; `qa-recovery-ui/uuid-final.log`) and reran `npm run test:ui` after the helper integration (exit 0, all 14 fixtures; `qa-recovery-ui/ui-uuid-final.log`). Source review confirms native `randomUUID` is preferred, fallback uses only cryptographic `getRandomValues` with UUID v4 version/variant bits, and unavailable secure entropy throws. Browser callers import the helper; injectable UUID defaults in deck import, imported proxies and workspace cloning remain intact. No new blocker found in this small change. These independent runs do not constitute real-device HTTP/Safari validation; browser fallback verification reported by root was not independently rerun by QA2.
