# Final service verification

Status: launch remains BLOCKED pending operational/physical evidence. This branch closes the serverless recovery code gap and adds actual Storage/confirmation testing.

| Gate | Status | Evidence |
| --- | --- | --- |
| Regression | PASS | npm test:33 groups, including independent reconciliation auth/method/config/batch/error checks. |
| Build | PASS | npm run build; existing chunk advisory remains. |
| Actual recovery API/database | PASS | Native GoTrue/PostgREST/app/SQL integration: timer-driven authenticated HTTP refunds an expired lease once while new AI is paused; duplicate ticks do not add credit; another account remains unchanged. Hosted scheduler installation is not established. |
| Independent recovery QA | PASS | Separate reviewer executed HTTP tests and reviewed route-before-beta mounting, bounded20 service RPC, timing-safe secret check, private/no-store and sanitized failures. |
| Full Storage/confirmation | NOT TESTED | New self-contained CLI3.1.0 stack test is being executed on the larger GitHub runner. No auth/storage tables are substituted in this test. |
| Hosted resource/configuration | BLOCKED | Read-only refresh confirms only existing real-data projects; staging Preview still lacks account/cloud/billing credentials. Only a Preview-specific recovery secret was added securely; no scheduler is claimed. |
| Genuine GPU and physical printing | NOT TESTED | Existing software Add/PDF evidence is narrower. A compatible physical device and actual printer still require validation. |

No main merge, production deployment, paid resource, live payment or real-user data mutation. Recovery configuration and acceptance instructions are in AI_RECOVERY_SETUP.md. Full-stack test creates only a random local Docker project and cleans it with explicit project-specific stop; no hosted URL/project is accepted.

## Confirmed Storage repair

The first actual Storage upload failed with DatabaseError. Reproduction with the real Storage `owner` column exposed an ambiguous PL/pgSQL variable in `pp_storage_fits`; the simplified old fixtures lacked that column. The SQL argument in `pp_usage_bytes` could also bind to the Storage column and miscount per-account usage. Fixed with a noncolliding local variable and positional SQL parameter. Regression fixtures now include owner/owner_id, null/mismatched legacy owners, foreign files and metadata updates. Lead and independent QA both executed the premium SQL suite successfully. The focused compatibility script changes only functions/grants, not user data; real Storage HTTP remains pending its rerun.
