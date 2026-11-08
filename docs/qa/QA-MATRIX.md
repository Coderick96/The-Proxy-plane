# Final QA matrix

Status terms: PASS means the named check executed; BLOCKED means a prerequisite or authorization is missing; NOT TESTED means no execution evidence. PASS for fixtures is not a hosted/device certification.

| Area | Status | Evidence / limits |
|---|---|---|
| Authoritative source/extraction | PASS |2.6.5 Local Art SHA and immutable baseline recorded in source-baseline.json. Older ZIP is backup only. |
| Production build | PASS |final/build.txt; main bundle warning remains. |
| Aggregate regression | PASS |final/npm-test.txt,21 groups including 14 UI fixtures, exit0. |
| Dependency advisory query | PASS |final/npm-audit.json,0 known advisories; not a whole-app security verdict. |
| Homepage390/768/1440 | PASS |Screenshots and browser JSON; gutters, readable terms, real CTA/quick navigation. |
| Tested page accessibility | PASS |Six axe scans, no violations; menu focus/Escape/Tab and skip targets verified. Not every possible state is certified. |
| Mobile Studio overflow/UUID compatibility | PASS |390px document; internal zoom scroll retained; secure UUID fallback exercised with native method disabled. |
| Live Scryfall card/alternate printing data | PASS |live-scryfall.json: actual HTTP200 DFC art fields and140 Sol Ring printings. |
| Text/deck imports and alternate faces | PASS |Parser/URL-adapter HTTP mocks and UI fixtures; reverse face/quantity/account drafts tested. |
| Live third-party deck-site availability | NOT TESTED |Provider fixtures do not prove current upstream access. |
| Editor layers/templates/text import/privacy | PASS |UI fixtures and browser editor navigation/keyboard checks; original capabilities retained. |
| Every frame/mana/set glyph/drag control on every browser | NOT TESTED |Build and selected regressions do not establish exhaustive visual correctness. |
| Print queue edit/removal/backs | PASS |Actual React App fixtures; original browser print suite. |
| Nine-up/PDF paper/trim geometry | PASS |Fixed180×252pt trim, Letter/A4 capacity9 defaults, all supported papers/orientations/bleed guards. |
| Prepared PDF invalidation/duplex None/download | PASS |Final Chromium flows and white750×1050 blank-back pixels. |
| Native iPhone Safari/AirPrint | NOT TESTED |Desktop Chromium width simulation is not native iOS. |
| Physical63.5×88.9mm output | NOT TESTED |Requires calibrated100% printer measurement. |
| Email/signup/OAuth failure recovery | PASS |Mocked auth network errors, retries, signout identity preservation. |
| Actual email/Google/Apple signin and persistence | BLOCKED |No authorized writable test Auth tenant; real-data project remains read-only. |
| Local/account A/B privacy and vault persistence | PASS |PGlite and simulated actual App scope/ABA/backup tests. |
| Hosted RLS/grants/private bucket metadata | PASS |hosted-readonly-audit.json;22 RLS-enabled tables and checked server-only grants. |
| Hosted cross-account writes/storage/session expiry | BLOCKED |Read-only authorization; no test-data mutation. |
| Community profiles/follow/public-private logic | PASS |Privacy/gallery/follow/publish fixtures; beta predicates inspected hosted. |
| Live community end-to-end | BLOCKED |No real user-data interactions authorized. |
| AI three choices/cost/safety/refunds | PASS |Mock providers, credit SQL and HTTP gates; actual provider generation not invoked. |
| Durable AI crash/ack/refund recovery | PASS |PGlite plus independent ambiguous-ack probes; metadata lists/bounded outputs. |
| Recovery UI/isolation/transport IDs | PASS |14-fixture UI suite and independent network/session/non-JSON probes. |
| Actual cloud AI/SDXL generation | NOT TESTED |No paid provider requests/model download or compute run. |
| True concurrent PostgreSQL sessions | NOT TESTED |PGlite locking tests and source review are narrower evidence. |
|10 introductory/200 monthly/purchased persistence | PASS |Local SQL; historical15 balances and unknown constraints preserved. |
| Apply compatibility/recovery to hosted data | BLOCKED |User explicitly requires read-only. Prepared only; no remote migration. |
| Stripe signature/idempotency/refund/subscription logic | PASS |Actual SDK signatures plus mocked provider/PGlite tests. |
| Approved Stripe test product/price catalog | PASS |Connected account read-only; amounts/interval match offers. |
| Actual test checkout/webhook/credit delivery | BLOCKED |No webhook endpoint/test backend credentials; no payment attempted. |
| Live charging | PASS (prevented) |Live/missing-key guards, live webhook rejection; no real card was used. |
| Lint/type checking | NOT TESTED |No configured lint/TypeScript project; build/syntax checks are separate. |
| Deployment/rollback execution | NOT TESTED |Plan documented; no deployment/merge authorized or performed. |

Local core workflows are ready for user testing. Full cloud-beta release remains BLOCKED by the explicit external/device gates in RELEASE-REVIEW.md. Historical failed attempt logs are retained; use final/results.json for current integration status.
