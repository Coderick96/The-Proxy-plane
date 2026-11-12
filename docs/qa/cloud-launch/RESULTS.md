# Cloud launch preparation

Recommendation: **BLOCKED for full cloud/release acceptance. The protected private beta remains available.**

Application commit: `8cc8cb359e2418656feaf34f0cb94420d8aba0a9`.
PR: https://github.com/Coderick96/The-Proxy-plane/pull/12 (stacked on unmerged PR11).
CI: https://github.com/Coderick96/The-Proxy-plane/actions/runs/43332650539 — all four jobs passed.
Preview: https://proxy-plane-beta-czcd51d2m-mrchaserickards-6402.vercel.app .
Deployment: `dpl_3qkGeMqmyqwEWn4n4bJ6J7gu14Lj`.

## Implemented and verified

- Replaced the retired image default with pinned GPT Image 2.5 Flare. Both generation and re-sketch use explicit server-side quality, return three choices for one app credit, preserve safety/recovery behavior, and return sanitized usage metadata. Provider failures never return raw bodies or secrets. There is no paid fallback.
- Added a separate server cloud opt-in. Saving a key or changing a browser flag alone cannot activate paid cloud requests.
- Added conservative recovery admission limits:128MiB globally,64MiB per account,20MiB per pending result plus4KiB metadata. New requests at capacity fail before app-credit debit; existing results remain readable/replayable. These are logical payload/reservation bounds, not physical PostgreSQL/WAL measurements.
- Applied the function-only capacity patch to the approved backend. Counts and fingerprints for six credit/recovery tables matched before and after. No result, credit or account was deleted.
- Added a Preview-only operator check with a strong separate secret and fixed owner/operation/prompt. It accepts no client overrides, returns no images or keys, and uses normal safety/durable recovery. A completed replay returns stored metadata without generating again.

| Check | Status | Evidence and scope |
|---|---|---|
| Local regression/build/audit | PASS |40 groups; build passed; zero production-dependency audit vulnerabilities. |
| Native capacity/concurrency | PASS | Independent PostgreSQL connections prove atomic admission, no-charge rejection, replay at capacity and service-only grants. PGlite fixtures also passed. |
| CI | PASS | Regression, Postgres/accounts including native capacity race, full Supabase services, and browser/runtime/PDF jobs all passed. |
| Hosted model/key access | PASS | GET probe200 for pinned image and retained text/safety models. This is not inference proof. |
| Hosted mobile gate | PASS | Chromium390/768/1440px, no overflow/page errors, accounts/billing configured, anonymous credit charge401. |
| Real cloud inference | BLOCKED | OpenAI returned429, classified as INSUFFICIENT_API_QUOTA, in the pre-reservation safety request. No image or app-credit charge. |
| Genuine tester OAuth/email/reset and TEST checkout fulfillment | NOT TESTED | Local/service/simulated results remain separately scoped in earlier reports. |
| Physical GPU/phone/printer | NOT TESTED | Existing actual CPU model and software PDF geometry evidence do not certify real hardware. |

## Provider blocker

The supplied key is now correctly Preview-only. Key/model access works, but API billing balance or spending limits prevent inference. Two paced attempts failed before reservation: the fixed operation and credit-charge counts both remained zero. No image was generated and no app credit was consumed. An earlier operator request rejected hosting routing metadata before any provider/debit; that compatibility issue was fixed and regression-tested.

The account owner must check [OpenAI API billing](https://platform.openai.com/settings/organization/billing) and [organization/project limits](https://platform.openai.com/settings/organization/limits). ChatGPT subscriptions and API billing are separate. No new key, paid plan, account funding or real-card payment was performed by this work. Do not create a new key to work around insufficient quota.

After the balance/limit is corrected, retry the same fixed verification operation. Confirm all three images, post-safety persistence, exactly one app credit, and replay without another image call before enabling cloud. Model token rates are documented; no exact per-request provider cost was measured because inference was blocked.

## Activation, deployment and rollback

Both `BETA_CLOUD_AI_ENABLED` and `VITE_CLOUD_ART_ENABLED` remain false. Device AI, owner Preview refill and TEST billing remain enabled. The TEST webhook targets this Preview. The operator check stays secret-gated with one fixed operation while the quota restriction is unresolved; disable its opt-in after verification completes.

All deployments made in this pass targeted Preview; main was not merged and no production promotion or live payment was performed. The observed production alias now resolves to `dpl_A6DVUsjwg2odRrno6tSuUEvxfn2f` with source `redeploy`, whereas an earlier report recorded `dpl_E3LFuW5MW3TWW2YerJs2oQBgKh2U`. This pass did not create that production deployment or change its aliases; it was left untouched.

Rollback uses the prior reviewed Preview or branch revert. If reverting the capacity patch, restore only the reviewed `pp_ai_reserve` definition and service-only grants. Never reset user ledgers/results or drop cron/shared extensions. Production promotion and destructive database changes require separate approval.

## Retained evidence

The release artifacts contain local logs, CI status, hosted GET/POST results, native capacity logs, mobile screenshots, and before/after preservation metadata. No private key, operator secret, bypass query, raw provider body or real user payload is included. See `TEMP-openai-migration-ledger.md` for the migration decisions and retained API behavior.
