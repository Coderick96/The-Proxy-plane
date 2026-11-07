# Starter allowance schema compatibility

Historical installations can retain a 15-credit starter CHECK despite running a newer `CREATE TABLE IF NOT EXISTS`. This prevented creation of the new 10-credit starter allowance.

`credits.sql` now compares canonical PostgreSQL CHECK expressions against exact reference expressions. It replaces only the known 10/15 entitlement checks with a check accepting both amounts. The existing spending function still grants exactly 10 to new accounts. Historical 15-credit rows, used remaining balances, paid wallets and receipts are not rewritten. Premium requirements remain unchanged. RLS and service-only mutation grants remain intact.

An exclusive table lock serializes reconciliation with writes. DDL and subsequent setup share the existing transaction. Unknown CHECK expressions cause an actionable exception; rollback preserves all custom constraints and data. This deliberately conservative behavior may require manual review for benign custom constraints. It never removes them automatically. Operators should inspect the reported constraint and review compatibility in a staging copy before applying changes. No remote database was modified in this work.

## Executed verification

- PASS `node tests/credits-compat.mjs`: fresh and reconstructed historical schema; 15-credit legacy allowance with 7 remaining; paid wallet of 80; setup twice; unchanged existing rows; new account spends 3 of its 10 credits; unknown conflicting custom CHECK aborts setup and remains present after rollback.
- PASS `node tests/credits-db.mjs`: existing credit spending, exhaustion, premium periods, wallet preservation, exact refunds and RLS regressions.
- BLOCKED `node tests/beta-server.mjs`: sandbox disallows localhost listening (`EPERM 127.0.0.1`). Added metadata regression covers restricted and standard test keys, live keys, disabled test billing and malformed keys; requires execution in an environment permitting local HTTP.

Beta metadata uses the same `testBillingAllowed` predicate as billing authorization, including restricted test keys. This changes availability reporting only; no Stripe calls or payment activation occurred.

Supabase skill and current RLS documentation reviewed. Changelog fetch returned no content in this environment. Verification uses local embedded PostgreSQL (PGlite), not a hosted Supabase instance; remote application, concurrency under production load and real provider integration remain unverified.
