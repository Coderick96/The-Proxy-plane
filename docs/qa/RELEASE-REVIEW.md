# Private-beta repair handoff

**Ready for local user testing. Cloud launch recommendation: BLOCKED pending service configuration and device verification.**

The authoritative 2.6.5 Local Art archive is imported and preserved by hash/baseline `1707c3f`. This work is on `feature/local-art-audit-homepage`, with [draft PR #2](https://github.com/Coderick96/The-Proxy-plane/pull/2). Main was not merged; nothing was deployed and no real-data database was modified. Package version remains 2.6.5.

Start with [TESTING.md](../../TESTING.md) to download/run the app and test from a phone on trusted local Wi-Fi.

## Verified final results

- `npm test`: **PASS**, 21 groups including 14 React UI fixtures. Includes SQL/RLS, credit accounting, auth recovery, editor/import/queue, privacy, durable AI and mocked HTTP/Stripe regressions.
- `npm run build`: **PASS**. Initial minified JS reduced from about 997 kB to 618 kB by deferring PDF/raster libraries; the >500 kB warning remains.
- `npm audit --json`: **PASS**, 0 known dependency advisories at this snapshot; not a guarantee of application security.
- Final independent Chromium script: **PASS**, 18 recorded flow checks at 390/768/1440 px; six axe scans report zero violations; no page errors. Native randomUUID was disabled to exercise secure mobile/local-network fallback.
- Original Chromium print regression: **PASS**, nine imported/custom cards, 750×1050 raster checks, intentional white backings, real PDF bytes and download buttons.
- Three independent QA scopes completed: durable state/acknowledgement recovery (`qa-ai-durability.md`), UI/privacy and transport recovery (`qa-recovery-ui.md`), and historical credit constraints (`qa-credit-compat-final.md`). Earlier general/security/mobile reviews are also retained.

Exact output, exit codes and commands: `final/results.json` and `final/*.txt`. Matrix and test limits: `QA-MATRIX.md`. The final JSON/logs take precedence over historical attempt logs and earlier report counts.

## Closed code findings

| Priority | Confirmed issue | Fix / regression evidence |
|---|---|---|
| P1 | Malformed purchase/refund SQL predicates | Valid IN predicates; purchase, refund and entitlements fixtures pass. |
| P1 | Live Stripe usable if beta flag omitted | Only test key formats construct the normal client; checkout/catalog/portal/decks and signed webhook mode are guarded; no rejected event reaches fulfillment. |
| P1 | Bleed preview crashes | Both geometry calls receive bleed; empty/populated queues tested across supported bleed values. |
| P1 | AI crash or failed refund can strand credits | Atomic durable reservation/debit, persisted result before success, 10-minute lease, refund-pending retry and startup/periodic/request reconciliation. Lost reserve/complete acknowledgements tested independently. Only new operations are swept; historical charge rows are untouched. |
| P2 | Historical 15-credit schema rejects new 10-credit grants | Recognized canonical constraints safely reconciled; old amounts/remaining and purchased wallets preserved. Unknown checks abort atomically. Applied only to disposable local fixtures. |
| P2 | Auth network rejection leaves forms stuck | Email/signup/OAuth/signout catch/finally, retries and private-workspace retention tests pass. |
| P2 | Missing double-face import/print selection | Explicit face chooser and queue/editor parameters; grid actions keep independent front-face defaults. |
| P2 | Stale prepared PDFs after settings change | Settings invalidate the blob and abort pending preparation; browser checks custom dimensions, quality, guides and duplex. |
| P2 | Duplex None backing rejected as blank capture | Explicit reverse-side blank sentinel produces white pixels; missing/custom capture guards remain intact. |
| P2 | Tablet clipping and mobile Studio page overflow | Gutters/safe stacked layout; zoom stays inside scroll viewport; screenshots reviewed at all three widths. |
| P2 | Generated operation ID lost after transport failure | Retain ID across fetch/session/non-JSON errors; no additional debit to recover stored results. |
| P2 | Local-network/mobile browsers lack randomUUID | Cryptographic getRandomValues v4 fallback, preserving injected ID factories; no Math.random fallback. Unit and real-browser feature simulation pass. |
| P3 | Test harness omitted fixtures or hid signalled failure | Aggregate runner includes all targeted fixtures; null child exit status now fails. |
| P3 | Beta metadata rejects restricted test keys | Shared predicate accepts sk_test and rk_test consistently. |

## Remaining gates requiring external configuration or hardware

1. **Real Supabase project is READ-ONLY by user instruction.** Hosted metadata confirms RLS on all 22 public tables, private art/community/deck buckets, restricted credit-function grants, and beta assertions on the checked gallery/access functions. Its actual starter CHECK still requires 15. The prepared compatibility and recovery SQL have NOT been applied there. Use an isolated staging database or separately authorize a reviewed migration; never replay schema scripts into real data blindly.
2. **Stripe sandbox webhook delivery is not configured.** User-approved Manafiquetcg test account has correct USD prices: 10/$2.99,30/$6.99,80/$14.99, Premium/$14.99/month with 200 credits in product metadata. It has zero webhook endpoints. Real Checkout→signed webhook→database fulfillment, renewal/cancel/refund/replay still need a test backend, securely bound test credentials and callback URL. No test or live payment was made here. Keep beta purchases off until that test completes.
3. **Real account/provider flows remain unverified.** Email confirmation, Google/Apple configuration, token/session behavior, actual account-A/B REST/storage writes and signed URL expiry were not tested on user data. Local PGlite/mocks are explicitly narrower evidence. Hosted Auth leaked-password protection is disabled: review [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Public SECURITY DEFINER advisor warnings require checking intentional gallery/beta read helpers, not blindly revoking them and breaking workflows.
4. **Cloud AI deployment has not been exercised.** The new SQL must be installed in staging before AI; missing recovery functions fail closed before charging. Run the API continuously or schedule service-only reconciliation. True multi-connection PostgreSQL contention, real moderation/image providers and SDXL compute are NOT TESTED. Results are capped 20 MiB each and list views return metadata only; review storage budget and retention before enabling cloud generation. Keep `BETA_AI_ENABLED=false` until those operational checks pass.
5. **Native iPhone Safari/AirPrint and physical print dimensions require human/device evidence.** Chromium is not WebKit or an AirPrint driver. Use Actual Size/100%, matching paper, no fit/shrink/borderless expansion; measure the 25.4 mm calibration ruler and 63.5 × 88.9 mm card edges. Verify cuts and duplex alignment on each printer/media combination.

Performance advisors include unindexed foreign keys and per-row auth evaluation. They are documented in `hosted-readonly-audit.json`; no hosted indexes/policies were changed. Large-bundle and storage-budget work remains a measured performance/operations follow-up, not a claim of perfect performance. Before future real sales, review tax registrations/configuration; this candidate cannot use live Stripe credentials.

## Reproduce

```sh
npm ci --ignore-scripts --cache /tmp/proxy-plane-npm-cache
npm test
npm run build
npm audit --json
PRINT_BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser
PRINT_BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:print-browser
```

Browser binaries may need `npx playwright install chromium` and OS libraries, or a locally installed Chromium. No lint/TypeScript pass is claimed: neither is configured. Browser tests block remote resources and seed an isolated fixture queue. Servers/browsers created by the automated scripts are closed; no production service is left running.

## Release/rollback checklist

- Review final tests, screenshots, changed-file inventory and independent QA before proposing a merge.
- Keep this draft unmerged until external gates are accepted. Publishing the feature branch is not production deployment approval.
- Use isolated Supabase/Stripe test resources; set `BETA_MODE=true`, `VITE_PRIVATE_BETA=true`, correct owner/roster and CLIENT_ORIGIN, with AI/purchases initially off. Keep service/billing/provider secrets server-side and environment files out of commits.
- Before any future database change, obtain authorization, back up, rehearse a restore on a clone, inspect actual constraints/functions and review generated changes. The 15-credit compatibility script uses ACCESS EXCLUSIVE locking and intentionally aborts on unknown checks.
- Code rollback uses a reviewed revert commit or a known prior deployment artifact. Preserve baseline/archive and immutable billing ledgers; never reset shared main or erase credits/receipts as rollback.
- No hosted migration, merge, production deployment or live-payment action was performed in this mission.
