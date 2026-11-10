# Scheduled cloud AI credit recovery

Cloud AI reservations persist before provider execution. An interrupted request can leave an expired lease awaiting reconciliation. New requests and recovery views reconcile on demand, and the continuous Node server runs reconciliation every minute. Serverless functions need a separate scheduler because their in-process timer is disabled.

The application provides `GET /api/internal/ai/reconcile`. It requires `Authorization: Bearer <CRON_SECRET>` and a configured server-only account database credential. Set a unique, randomly generated server secret of at least 32 visible ASCII characters (up to 512); keep it out of browser variables, repository files and scheduler logs. A missing or weak secret fails closed. This endpoint remains usable while new beta AI generation is paused, so disabling generation does not strand existing reservations.

Each request calls only the service-role `pp_ai_reconcile` RPC with a fixed batch size of 20. It accepts no client-selected owner, refund identifier or batch size. The result contains only an acknowledgement and reconciled count. Failures return a generic 503 with `Retry-After: 60`; no provider payload or database detail is returned. SQL reconciliation is repeat-safe and the endpoint does not start generation or create a charge.

## Continuous server

Keep `SERVERLESS_MODE` unset or `false` on a continuously running Node deployment. The existing one-minute server timer performs reconciliation. Verify that the process is supervised and that failures are observed; an unreferenced timer in a process that is not kept alive is not an operational scheduler.

## Serverless deployment

Configure an authenticated HTTP scheduler to invoke the exact HTTPS endpoint at least every five minutes; use a shorter interval if the refund latency target requires it. The SQL lease is ten minutes, so scheduler frequency adds to worst-case recovery latency. Repeatedly receiving the maximum count means more expired work may remain; alert and increase scheduling frequency/capacity rather than raising the public request's batch size.

Vercel Cron is an option only on a plan that supports the required frequency. Hobby frequency limits may permit only daily execution, which is insufficient for this recovery target. A five-minute example for a compatible plan is:

```json
{"crons":[{"path":"/api/internal/ai/reconcile","schedule":"*/5 * * * *"}]}
```

This example has deliberately **not** been added to `vercel.json`: doing so unconditionally could break Hobby deployments or imply authorization for a plan change. Vercel Cron runs on production deployments, not protected previews. Production deployment and paid infrastructure are not authorized by these instructions. An external scheduler can call a protected preview only when its deployment protection is separately and securely satisfied; never make the API public by removing protection just to pass a check.

## Acceptance before enabling cloud AI

1. Apply the reviewed credit and AI recovery SQL to the approved isolated backend.
2. Configure the secret securely on the server and scheduler, then verify unauthenticated/wrong-secret requests return 401 and non-GET requests return 405 without database work.
3. On disposable staging fixtures, create an expired reservation, run the authenticated endpoint, and verify one exact refund. Repeat the request and confirm it does not refund twice. Check account balances and that another account cannot inspect the operation.
4. Let the actual scheduler perform recovery without a user request or manual trigger. Record its timestamp, endpoint acknowledgement, database transition and balance. Confirm recovery continues while new AI generation is paused.
5. Only after recording this operational evidence, set the server-only `AI_RECOVERY_SCHEDULER_VERIFIED=true` attestation for `npm run beta:check`. This flag does not install or monitor a scheduler. Keep cloud AI disabled until the evidence exists. Unit tests and manual endpoint calls alone do not establish that a scheduler is installed or running.

Code-level checks: `node tests/ai-reconcile.mjs` runs real local HTTP requests with an explicitly mocked database boundary. It does not execute a hosted schedule, provider generation or real-user refund.
