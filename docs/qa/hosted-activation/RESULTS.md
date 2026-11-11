# Approved hosted activation

The user explicitly approved the reviewed data-preserving database upgrade and beta connection, lifting the previous read-only restriction for that work. No production deployment or live payments are authorized.

- Supabase target verified: existing Proxy plane project; no paid branch or plan created.
- Applied migration private_beta_credit_recovery_storage_compat successfully.
- PASS: fingerprints and counts of all25 existing public/auth/storage tables match before/after. No existing card, account, credit or storage rows changed.
- PASS: new operation/refill/receipt tables have RLS and no anon/authenticated direct SELECT; privileged RPCs execute only for service_role. Owner status returns10 introductory credits with policyVersion30.
- Existing Vercel project has correct public backend URL/key and owner identity, but its private credential uses the legacy name supabase. Added server-only compatibility: canonical credential takes precedence; only private service-role formats qualify under the legacy name; Supabase still validates the key remotely.
- Actual public Auth settings: Google/email enabled, Apple disabled. Preview-only provider flags prevent launching unavailable Apple sign-in.
- Cloud provider key is not configured. Preview cloud generation is explicitly unavailable; historical artwork recovery remains available. Device generation still requires supported WebGPU hardware, an authenticated account and one credit.
- Production environment values remain unchanged. New recovery/refill/provider variables target Preview only. Hosted credential validity and connected UI checks are pending deployment.

Database migration/preservation artifacts and the proposed SQL rehearsal are retained outside Git; no credentials or real user rows are committed. This report is not proof of full GPU inference, real Google callback, external email delivery, Stripe webhook delivery or physical printing.
