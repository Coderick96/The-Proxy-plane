# Independent QA1: durable AI recovery

Status: PASS for local durability after independent retest of integrated commit `bde63c6` on 2026-11-08. Hosted verification remains BLOCKED by read-only real-data policy.

Initially reviewed worker checkout, then independently retested `/workspace/proxy-plane-latest`: `server/aiRecovery.js`, `server/index.js`, `supabase/ai_recovery.sql`, credit spend/refund functions and database fixture. Supabase skill security checklist applied. No remote SQL, provider requests, payments, or user-data mutations performed.

| Acceptance | Result | Evidence |
|---|---|---|
| Atomic operation reservation + credit debit | PASS | Same SQL transaction; DB fixture executes spend/reserve and duplicate paths |
| Restart/expired lease refund | PASS | `durable-db.log`; fixture creates new recovery service |
| Refund failure remains retryable | PASS | DB trigger injects refund outage, removes it, retries |
| Stable UUID prevents repeated generation/debit | PASS | DB fixture completed duplicate invokes work once |
| Lost reserve acknowledgement | PASS simulated | Independently injected post-commit error: no provider work; persisted reservation expires/refunds |
| Lost completion acknowledgement | PASS simulated | Independently injected post-commit error: completed result preserved; subsequent retry returns it without new work |
| Completion cannot be refunded by failure handler | PASS | Terminal-state fixture and independent completion ack-loss simulation |
| Owner isolation/service-only SQL access | PASS local | Owner-scoped result selection, authenticated-role denial; SQL grants revoke public/anon/authenticated |
| Reconcile does not sweep historical charges | PASS | Legacy charge remains unrefunded in fixture |
| Startup, periodic, request recovery | PASS inspection | startup and 60-second timer plus run/results requests invoke reconcile |
| Result/list resource bounds | PASS repaired | Regression rejects >20 MiB payload, list contains no result key and includes hasResult; latest20 limit retained |
| True simultaneous PostgreSQL connections/deadlocks | NOT TESTED | PGlite fixture uses one engine connection; Promise.all is not production concurrency proof |
| Hosted Supabase/PostgREST schema/signatures | BLOCKED | Real project read-only; no recovery migration applied by reviewer |
| Provider success/crash behavior | NOT TESTED external | Local simulation only; no OpenAI calls |

Commands independently executed again from integrated checkout `/workspace/proxy-plane-latest`, exit 0:

```
node tests/ai-recovery-db.mjs
node docs/qa/qa-ai/ack-boundary-fixture.mjs
```

Raw logs: `qa-ai/durable-db.log`, `qa-ai/ack-boundary.log`. Independent ack fixture derives baseline database setup then injects errors after committed reserve/complete RPCs. Absolute paths intentionally identify the integrated checkout; it is a QA artifact, not a portable product test.

Security inspection: account locks precede operation/charge locks; functions use empty search_path and qualified database references. The private table has RLS enabled and no client grants; security-definer RPC access is service-role only. Server derives owner from authenticated user and never accepts caller-selected owner. A completed result is saved only after output moderation. Refund retries preserve existing credit pool accounting. Newly reserved operations alone participate in reconciliation.

Initial list/payload concern resolved: metadata-only latest20 list and explicit 20 MiB completion limit verified. Results intentionally persist until account deletion; storage growth needs operational capacity monitoring. Individual owner-authorized detail responses can still approach 20 MiB. Production PostgreSQL lock contention, timer health monitoring, migrations and provider behavior need staging evidence before release. Background reconcile errors are swallowed; operational monitoring should alert on pending/expired operations rather than assuming the timer succeeded.

Completion-response fail-closed validation inspected: absent/nonobject response or mismatched operationId raises a recoverable error rather than reporting unconfirmed success. Independent lost-completion acknowledgement probe re-executed successfully against integrated code. No confirmed local blocker remains in this scoped repair. This is not hosted/provider or release readiness certification.
