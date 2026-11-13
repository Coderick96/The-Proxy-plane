# Independent payment UI and release review

Reviewer: third independent QA agent, payment_ui_release_review.
Scope: local working candidate in `/workspace/proxy-plane-staging`; no deployment, environment mutation, account operation, payment or database mutation performed.

## Executed results

| Check | Result | Evidence/scope |
| --- | --- | --- |
| `node tests/checkout-availability.mjs` | PASS | Executed twice; final test includes loading/error/retry, stale offer clearing, visible disabled reasons, enabled TEST offer and paused LIVE sales retaining cancellation portal. Uses simulated DOM/catalog/provider responses. |
| `npm run build` | PASS | Executed; Vite completed in 8.28 seconds. `/tmp/payment-ui-release-build.log`. Existing >500kB chunk warning remains; build success is not a performance certification. |
| Current PremiumShop Chromium rendering, 390/768/1440px | PASS | Independent esbuild + local HTTP fixture; imports actual component and CSS, supplies paused-live catalog, blocks external resources. Each `scrollWidth` equals viewport; no browser page errors. Visible paused-sales explanation, checkout disabled, Manage billing enabled. No actual authenticated Stripe request. |
| New/current checkout controls touch target sizing | PASS after fix | Initially reproduced 36px controls (P2). Parent authorized scoped `.premium-page button { min-height:44px; }` repair in src/premium.css. Executed the independent actual Chromium fixture again: retry, refresh, portal and checkout controls all measured exactly 44px at 390/768/1440px; no overflow or page errors. This is a local browser measurement, not a real iPhone test. |
| Source version label | PASS (source) | package.json version 2.6.5; BetaGate imports package version. Does not establish which build a user's current tab serves. |
| External email / Google sign-in and password recovery | NOT TESTED | No access to user's authenticated browser credentials/session. Local tests cannot certify delivery or OAuth callbacks. |
| Real hosted TEST checkout -> signed webhook -> exactly-once credits | NOT TESTED | No actual authenticated application checkout completed by this reviewer. |
| LIVE Stripe credentials, prices, account, webhook and isolated ledger | BLOCKED | Connected access previously exposes TEST account only; deployment and ledger provisioning not part of this read-only review. |
| Real mobile Safari and physical card printing | NOT TESTED | Chromium CSS/layout inspection does not certify device printing or exact physical output. |

## Review findings

The clearer PremiumShop loading/error/retry and unavailable reasons address the confusing disabled-button symptom without fabricating purchase availability. Product availability stays server-owned. Existing account-scoped useAccountAction remains in place. The newly added explicit `billing.portalEnabled` handling fixes a reviewed regression where pausing new sales would have disabled the user's subscription cancellation portal. This fix was present in the final independently executed checkout-availability test and browser fixture.

The beta banner obtains package version and distinguishes test/live/disabled purchase state. Root revised live readiness to call the actual service readiness verifier rather than relying only on environment flags. No authorization check was removed in the reviewed status path.

Production release must not imply real AI availability: cloud quota remains unresolved in the recorded external evidence, and actual user hardware generation has not been universally validated. Updated copy warns cloud AI may be paused and device generation needs compatible hardware. Warning copy alone is not proof that paid service is available.

An initial independent Vite-mounted fixture timed out because its custom route was intercepted by the test server's routing. This was a test-harness failure, not a reproduced application failure. Replaced with an isolated esbuild + HTTP fixture serving the actual current component and CSS; all three viewports then passed the checks above.

Recommendation: code improvements pass scoped UI verification, including the repaired and rechecked 44px touch targets. Paid production launch remains BLOCKED pending the separately listed real integration, account/ledger isolation and AI service acceptance checks.

## Authorized follow-up edit

Parent granted ownership for src/premium.css only to append scoped minimum 44px control height. No other source edits by this reviewer. Final independent Chromium output: viewport/scroll 390/390,768/768,1440/1440; all four controls44px; errors[].
