# Approved hosted activation

The user explicitly approved the reviewed data-preserving database upgrade and beta connection, lifting the previous read-only restriction for that work. No production deployment or live payments are authorized.

- Supabase target verified: existing Proxy plane project; no paid branch or plan created.
- Applied migration private_beta_credit_recovery_storage_compat successfully.
- PASS: fingerprints and counts of all 25 existing public/auth/storage tables match before/after. No existing card, account, credit or storage rows changed.
- PASS: new operation/refill/receipt tables have RLS and no anon/authenticated direct SELECT; privileged RPCs execute only for service_role. Owner status returns 10 introductory credits with policyVersion30.
- Existing Vercel project has correct public backend URL/key and owner identity, but its private credential uses the legacy name supabase. Added server-only compatibility: canonical credential takes precedence; only private service-role formats qualify under the legacy name; Supabase still validates the key remotely.
- Actual public Auth settings: Google/email enabled, Apple disabled. Preview-only provider flags prevent launching unavailable Apple sign-in.
- Cloud provider key is not configured. Preview cloud generation is explicitly unavailable; historical artwork recovery remains available. Device generation still requires supported WebGPU hardware, an authenticated account and one credit.
- Production environment values remain unchanged. New recovery/refill/provider variables target Preview only. Production keeps BETA_AI_ENABLED=false; Preview alone enables device AI. The protected Preview is READY with accountsConfigured=true. Authorized hosted recovery reaches the real service RPC (200, reconciled0); missing/wrong secrets return401 and POST405. No credit rows were changed.

Database migration/preservation artifacts and the proposed SQL rehearsal are retained outside Git; no credentials or real user rows are committed. This report is not proof of full GPU inference, real Google callback, external email delivery, Stripe webhook delivery or physical printing.


## Verified preview and quality gate

Code under test: b504cae25803563238273a2b362b37515dcc3d84. CI run42938903620 passed all four jobs (regression/build/audit, Postgres/accounts, real local Supabase Storage/email, browser/runtime/PDF). Independent QA reran account-config and all20 UI fixtures successfully. Hosted logged-out beta gate passed Chromium checks at390/768/1440px: no horizontal overflow or page errors, configured accounts, private-beta access denied to anonymous callers, unauthenticated device charge401. Vercel protection redirects unauthenticated access before the app. Screenshots and sanitized results are in the accompanying verification artifacts.

Preview deployment: dpl_7eys5mdSMHjft4YQfTwRzEEuKFBj. Production deployment remains dpl_E3LFuW5MW3TWW2YerJs2oQBgKh2U. No merge or production deployment occurred.

Recommendation: READY FOR CONTROLLED OWNER/TESTER VALIDATION; full private-beta release remains BLOCKED by unverified full GPU inference on real hardware, actual iPhone/AirPrint output, genuine provider OAuth/external email delivery, and Stripe test checkout/webhook delivery. Cloud generation remains disabled until provider credentials and a verified hosted recovery schedule are configured; purchases remain disabled. Do not represent simulated/local service tests as those external results.

## Rollback and deployment controls

Keep main unchanged. The previous Preview can be used if a UI regression appears. Disable Preview BETA_AI_ENABLED and DEV_CREDIT_TOPOFF_ENABLED before investigating any credit regression, then rebuild Preview. Do not reset the shared database or restore whole tables over newer user data. Review a forward repair against the saved pre-upgrade function definitions; schema backup is not a full data backup. Production promotion, live billing and destructive database changes require separate authorization.
