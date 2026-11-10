# Private-beta acceptance test — 2.6.5 candidate

Commit/branch: ____________________    URL: ____________________
Date: __________    Tester slot: ____    Tester: ____________________
Device/browser: ____________________    Printer/driver: ____________________

Use an isolated backend and keep a card backup. The existing real-data project is read-only. AI, billing and development refill start disabled. Mark each applicable check **PASS, FAIL, BLOCKED or NOT TESTED** and retain evidence; an unchecked box is not a pass. Provider/physical-device checks require actual execution, not simulated UI results.

## Setup and account access — before inviting all ten testers

- [ ] Follow current [BETA_SETUP.md](BETA_SETUP.md); use `config/beta.env.example` with securely supplied credentials from the same isolated backend.
- [ ] Run `npm run beta:check` after securely filling the isolated environment. Record its offline result separately; configuration PASS is not Auth/REST/Storage or launch verification.
- [ ] Confirm the exact feature commit is built; do not use old setup instructions or assume unpublished branches are available.
- [ ] Check `/api/beta/status` reports `enabled:true`. `/api/health` alone establishes no integration readiness.
- [ ] Owner signs in and sees ten tester slots separate from owner access.
- [ ] Approved account creates/confirms email and enters; record actual email delivery.
- [ ] Unapproved and unverified accounts cannot enter.
- [ ] If Google/Apple sign-in is offered, each configured provider completes its real redirect/session flow. Otherwise record it as blocked/unavailable.
- [ ] Slot eleven cannot be added; one email cannot occupy multiple slots.
- [ ] Remove a tester; refresh and retry API, REST and Storage access and confirm denial.
- [ ] Sign out/in as another account, then A → B → A during pending saves/generation; no prior account's private content appears or gets written to the new account.
- [ ] Tester cannot read the owner roster, another tester's feedback, private cards, receipts or private Storage objects through the UI **or direct API/REST requests**.
- [ ] Record signed URL expiry behavior; previously issued URLs may remain usable until expiry.

## Card catalog, editor, vault and community

- [ ] Browse the catalog; filter sets, colors and rarities, then sort price low/high and mana amount. Check empty/error and missing-price results.
- [ ] Find a real card; select alternate artwork and both faces of a double-faced card.
- [ ] Import text/mana/P/T without overwriting existing artwork/layout.
- [ ] Make a custom/full-art card; check classic/alternate frames, layers, mana/set symbols, text controls, P/T, zoom and previews.
- [ ] Upload original artwork; save locally, reload and edit again.
- [ ] Save privately to cloud, sign in on another device and reload the same card.
- [ ] Export a backup and import it twice without duplicate/broken entries.
- [ ] Import a deck list and supported public deck URL; verify quantities, commander/sideboard, queue totals and bad-URL recovery.
- [ ] Make a private collection; another tester cannot access its cards or artwork.
- [ ] Intentionally publish a card; another approved tester can view it, open the creator profile and follow/unfollow.
- [ ] Make card/collection private again; it disappears from the feed and unauthorized direct reads are denied.
- [ ] At mobile/tablet/desktop sizes, check touch targets, hamburger navigation, readable text, keyboard/focus, reduced motion and no horizontal clipping.

## Account credits and browser-device artwork — before enabling AI

- [ ] Fresh isolated account receives **10 introductory credits once**, with no automatic Free refill. Preserve historical grants/purchased wallet balances.
- [ ] Paused or unauthenticated generation cannot debit credits; insufficient balances fail without generation.
- [ ] On a compatible physical GPU/device, review model/license/download consent, then complete an actual three-image request. Record browser, hardware, download/cache behavior, inference duration and memory/error behavior.
- [ ] Confirm one request costs exactly **one credit** for three choices, with only a fingerprint/operation/model ID sent to the credit endpoint; apply a chosen image to the current card and save it.
- [ ] Setup/capability/download failure before authorization does not debit. Check unsupported phones display a useful error rather than silently using a paid fallback.
- [ ] Duplicate authorization, ambiguous response and same-request retry reuse one operation/charge; test real concurrent database connections, not only serialized SQL fixtures.
- [ ] Cancel or switch card/account/mode during generation; late results cannot apply to another context.
- [ ] After a confirmed debit, retry the same request without another charge; an owner-refunded receipt cannot be reused through the normal app. Do not promise automatic client-side refunds.
- [ ] Confirm app copy does not claim browser-controlled inference is tamper-proof monetization or universally supported on all phones.

## Optional owner development refill

- [ ] Enable only on the isolated development/Preview backend after reviewed optional SQL; provide the refill code securely in server-only settings.
- [ ] Owner's confirmed redemption adds **100 wallet credits** without Stripe or payment; retry the same operation and verify it adds nothing extra.
- [ ] Wrong code, non-owner, missing setup and production requests cannot grant credits. Knowing the code alone is insufficient.
- [ ] Switch accounts while refill is pending; no stale success, code or balance appears in the new account.
- [ ] Existing purchased balances remain unchanged apart from the explicit additive grant. Disable the feature after verification if not needed.

## Optional cloud AI and Stripe TEST-mode billing

- [ ] Before cloud AI, install reviewed durable recovery SQL and verify safety/model/provider access with an actual isolated request; do not expose the provider key.
- [ ] Cloud artwork delivers three choices for **one credit**. Provider errors/refunds, crash leases, lost acknowledgements, stored-result recovery and storage/privacy limits work as specified.
- [ ] Verify idle cloud refund reconciliation; serverless hosting requires a scheduler beyond request-triggered recovery.
- [ ] Keep checkout unavailable until distinct TEST prices, signed webhook and customer portal are configured. Never use live keys or real payment cards.
- [ ] Execute actual Stripe TEST Checkout → signed webhook → database fulfillment; verify purchased credits persist and duplicate events do not grant twice.
- [ ] Premium grants **200 credits per verified paid monthly period**, no duplicate invoice grant or rollover; verify renewal, cancellation, expired access, refunds and replay behavior.
- [ ] Invalid signatures/live-mode events cannot reach fulfillment. If billing remains disabled, label billing NOT TESTED rather than PASS.

## Physical printing — one sheet before a full deck

- [ ] Use real iPhone Safari and desktop browsers; record actual PDF rendering/download, direct print and native printer dialogs.
- [ ] Choose loaded Letter/A4 paper and orientation. Queue nine standard cards; check spacing/guides and a partial final sheet, including optional backs.
- [ ] Move spacing close → medium → custom; map and artwork preview agree without clipping or missing art.
- [ ] Export a color PDF; verify colors, card artwork, cut guides and page dimensions.
- [ ] Print at **Actual Size/100%**, matching paper, with browser headers/footers off and fit/shrink/borderless expansion disabled.
- [ ] Measure card trim **63.5 × 88.9 mm (2.5 × 3.5 inches)** and calibration ruler **25.4 mm**. Record actual results; software geometry is not physical proof.
- [ ] Compare direct print/PDF and check duplex/back alignment on the actual printer/media.

Measured card: ______ × ______ mm. Calibration ruler: ______ mm.
Spacing: ______ mm. Scale: ______ %. Paper/media: ____________________
Front/back offset: ____________________. PDF/direct-print differences: ____________________

## Closeout and release decision

- [ ] Submit repeatable failures with expected/actual behavior through Beta desk; owner can update report status, other testers cannot read private reports.
- [ ] Retain exact automated commands/logs plus real integration/device evidence. [PR8 runtime/credit QA](docs/qa/runtime-credit-fix/QA-MATRIX.md) distinguishes mocks, native runtime checks and untested hardware.
- [ ] Export a backup and verify rollback uses reviewed code artifacts while preserving user data and billing ledgers.
- [ ] List remaining P0/P1/P2/P3 issues and recommend BLOCKED or PRIVATE BETA READY based on evidence. Do not declare readiness with missing required gates.
- [ ] Obtain explicit approval before main merge, production deployment or any real-data change. Stop local servers with Ctrl+C when finished.
