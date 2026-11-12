# The Proxy Plane 2.6.5 — private-beta test candidate

Current setup: [BETA_SETUP.md](BETA_SETUP.md). Copy the tracked, nonsecret [environment template](config/beta.env.example) to an untracked `.env` and provide credentials securely. The user explicitly approved the focused existing-backend upgrade and protected beta connection; preexisting table fingerprints were preserved. Use disposable local/CI services for mutation-based fixtures, preserve real user data, and do not replay baseline setup. No new paid resource or production deployment is required.

Current credit policy: 10 introductory credits once, 200 per verified paid Premium month, and one credit for three artwork choices in either device or cloud mode. Existing purchased wallets and historical grants are preserved. Owner development refills are optional, server-authorized and disabled in production.

Browser-local artwork is available in the protected feature preview under **AI Art Studio → On this device**. It needs compatible WebGPU hardware and authenticated account-credit authorization, but no desktop companion or OpenAI key. See [DEVICE_AI.md](DEVICE_AI.md) for model download size, license and hardware limits. Actual pinned model graphs produced three images in CPU reference testing; native physical-device diffusion remains unverified. Hosted credentials, scheduled recovery and Stripe test prices/signature handling are verified, while genuine tester checkout fulfillment and external provider/device acceptance remain separate. Cloud mode stays unavailable until its existing provider key is supplied securely; a preview URL is not launch certification.

Use [the latest account-safety verification](docs/qa/launch-final/RESULTS.md) and [the connected-beta QA matrix](docs/qa/hosted-activation/RESULTS.md) and [the beta acceptance checklist](BETA_TEST_CHECKLIST.md). The source remains on a separate feature branch; main and production have not been updated. Earlier audit evidence is retained in [the release review](docs/qa/RELEASE-REVIEW.md).

## Historical release notes

The sections below preserve prior release history. Older credit amounts, image counts, setup paths and readiness statements are superseded by the current policy and setup guide above.

# The Proxy Plane 2.6 — Starter and monthly Premium credits

- Each signed-in account gets 15 starter AI credits once. No daily, weekly or
  monthly refill on Free. Legacy accounts get this one-time starter pool on
  adopting this policy; older purchased/granted wallet balances are retained.
- Premium includes 200 credits per verified paid monthly billing period. No
  rollover of unused monthly credits. A free trial or zero-payment invoice does
  not grant monthly credits; Studio Pass alone has no recurring allowance.
- One artwork request costs 1 credit: Free gets one image, Premium / Studio Pass
  gets three candidates and chooses one. Selecting an image costs nothing extra.
  Re-sketch also costs 1 credit for three choices. Cards/sets still cost 1 per
  card; rules review costs 1, using the same credit balance.
- New extra credit-pack purchases require Premium. Existing purchased credits
  carry forward, even after membership ends. Expiring monthly credits are spent
  before starter credits and purchased credits. Blocked/failed requests refund
  their exact original pools; expired monthly credits do not become fresh ones.

REQUIRED CLOUD UPGRADE: run supabase/credits.sql after evolution.sql. Missing
migration blocks server access instead of accidentally retaining daily refills.
See CREDITS_SETUP.md. No live account was migrated or charged here. Subscription
pricing stays unset; configure your own monthly Stripe price when ready.

Start: stop the old server, extract into a fresh folder, copy your configured
.env, and run START_THE_PROXY_PLANE.bat. Logo, real-card tools, print spacing,
live sheet preview and the targeted AI safeguards remain included.

---

# The Proxy Plane 2.5.9 — Live spacing view

Print Studio now shows a compact live sheet layout directly above the cutting
tool and spacing controls. Teal gutters make the gap changes easy to see, with
an updating millimeter value, row/column layout and cards-per-sheet count.
The map also works with an empty queue, clearly labeled as a sample layout.

The full artwork preview is labeled Live print sheet and has its own spacing
slider and exact-gap input. This lets users adjust spacing while viewing the
actual sheets on desktop or mobile, without scrolling back to the settings.
Both controls and the existing spacing presets stay synchronized. Calibration,
PDF and Direct Print continue to use the same gap and fixed card trim size.
The colored map is an on-screen aid and is not part of print/export capture.

No database migration is required. Run START_THE_PROXY_PLANE.bat after extracting.

---

# The Proxy Plane 2.5.8 — Print spacing presets

Print Studio → Spacing, guides & export lets users select a cutting tool
(scissors/craft knife, rotary cutter, guillotine/trimmer, die cutter or other).
Each tool offers guidance and an optional Apply suggestion button. Selecting a
tool does not overwrite a manually chosen gap. Enter any supported custom gap
(0–12.7 mm) or choose a shortcut. Card spacing offers:
- Close together: 0 mm gap.
- Medium spaced: 3 mm gap.
- Spaced for a die cutter: 6 mm gap.
- Custom spacing: use the existing millimeter input.

The live sheet preview, PDF, Direct Print and calibration sheets all use the
selected gap. Extra space can reduce cards per sheet; trim size stays 2.5 × 3.5
inches. Die cutters vary, so 6 mm is a starting point to adjust for your equipment.
Existing Studio alignment profiles store both the gap and selected cutting tool. No migration is needed.
Start with START_THE_PROXY_PLANE.bat after extracting into a fresh folder.

---

# The Proxy Plane 2.5.7 — Targeted AI safety

Built on 2.5.6 with server-side input/output checks for child abuse/exploitation
and explicit pornography. Re-sketch reference images and all image choices are
checked too. Blocked prompts use no credits; blocked outputs refund reserved
credits. Safety-service failures stop the result instead of bypassing the checks.

The logo and existing features are retained. No paused store-compliance changes
are included. No database migration is needed. See AI_SAFETY.md for scope,
provider costs and testing limitations. Start with START_THE_PROXY_PLANE.bat.

---

# The Proxy Plane 2.5.6 — Mana-colored wordmark

PROXY PLANE lettering now uses the five mana colors. The stacked P letters
remain black, surrounded by the five mana symbols on the blue-green portal.
The header, favicon and touch icon use public/proxy-plane-icon-v4.png.
No database migration is required. Run START_THE_PROXY_PLANE.bat after extracting.

---

# The Proxy Plane 2.5.5 — Mana portal icon

Added the five colored mana symbols around the stacked black P letters and
PROXY PLANE wording. The header, favicon and touch icon now use
public/proxy-plane-icon-v3.png. Earlier icon versions are retained.
No database migration is required. Run START_THE_PROXY_PLANE.bat after extracting.

---

# The Proxy Plane 2.5.4 — Revised portal icon

The black P letters are smaller and more vertically stacked, with PROXY PLANE
written beneath them on the blue-green portal. Header, favicon and touch icon
now use public/proxy-plane-icon-v2.png. The original artwork is also retained.
No database migration is required. Run START_THE_PROXY_PLANE.bat after extracting.

---

# The Proxy Plane 2.5.3 — Portal icon

New original icon: staggered black P letters over a luminous blue-green portal.
Used in the app header, browser favicon and Apple touch/bookmark icon.
The full-resolution PNG is public/proxy-plane-icon.png.

Stop the old server, extract into a fresh folder, copy your configured .env,
and run START_THE_PROXY_PLANE.bat. No database migration is required from 2.5.2.
If your browser keeps the old icon, hard-refresh the page with Ctrl+Shift+R.

---

# The Proxy Plane 2.5.2 — Gathering Plane text update

Removed the “Bring your Proxxied” dropdown from Gathering Plane.
Its subtitle now reads exactly: “gather idea's and share your proxies here!”

Stop the old server, extract into a fresh folder, copy your configured .env,
and run START_THE_PROXY_PLANE.bat. No database migration is required from 2.5.1.
The backup import repairs and Print Studio remain included.

---

# The Proxy Plane 2.5.1 — Backup restore repairs

Fixes three independently reproduced bugs in 2.5:
- A pending file read is discarded on account/session changes, including A → B → A.
- The entire backup is validated before any state update. Invalid cards,
  collections, templates, revision history, print profiles or deck drafts reject
  the whole import with an error and leave the workspace unchanged.
- Restore merges by stable ID, with existing local records winning conflicts.
  Re-importing the same backup does not duplicate projects or queue copies.
  Distinct queue IDs retain their copy counts. To add extra copies, use the
  normal editor/library/deck-import actions.

The file input resets after selection so the same file can be retried. If you
select another file before a previous read finishes, only the newest selection
may import. Legacy backups may omit newer sections. Backup format remains v4.

Start: stop the old server, extract into a fresh folder, copy your configured
.env, and run START_THE_PROXY_PLANE.bat. Keep the same browser and address.
No database migration is required from 2.5. The 2.5 Print Studio is retained.

Validation includes all three reported reproductions against the actual App in
React/jsdom, A/B/A transitions, nested invalid records, repeat/conflicting
imports, single queue-entry removal, concurrent file reads and valid legacy
recovery. All supplied test commands and the production build pass. Live
providers, native print dialogs and physical printing remain unverified here.

---

# The Proxy Plane 2.5 — Print Studio

The Print page now combines collapsible settings with a large sheet preview,
page navigation and independent preview zoom. Start with centered Letter/A4
9-up or a spaced cutting preset, then refine the layout.

New print controls:
- Empty spacing between cards, separate from artwork bleed.
- Corner crop marks or full trim outlines, guide color, and front/back selection.
- 300, 600 or 1200 DPI capture, page ranges, preparation progress and cancel.
- Independent front/back alignment offsets and complete Studio alignment profiles.
- First-sheet test PDF plus an artwork-free calibration PDF/direct print:
  numbered fronts/backs, exact trim outlines, one-inch rulers and color swatches.

The preview and PDF/direct-print geometry share the same spacing and marks.
Existing 2.4 cards, deck imports and backs are retained. No new database migration
is needed from 2.4; upgrades from 2.3 still require evolution.sql for cloud/AI.
Print basics, spacing, guides, quality and calibration remain free. Bleed,
front/back offsets and saved alignment profiles use the existing Studio access.

Start: stop the old server, extract into a fresh folder, copy your configured
.env, and run START_THE_PROXY_PLANE.bat. Keep the same browser and local address.
Use Calibration PDF first, then print one real sheet at Color / Actual size.
See PRINTING.md for page ranges, duplex settings and testing details.

Validation: print geometry/ranges/DPI/calibration checks, App DOM tests, backing
tests and production build. Calibration PDF rendered and visually checked.
The cloud browser could not connect to the local server; the updated app UI,
native print dialog and physical printer output need checking on your machine.

---

# The Proxy Plane 2.4 — Gathering Plane, AI choices and print repairs

Start: stop the old server with Ctrl+C (answer Y if Windows asks to terminate the
batch job), extract this ZIP into a fresh folder, copy your configured .env,
and double-click START_THE_PROXY_PLANE.bat. It installs dependencies and starts
both servers. Keep the same browser and local address to retain device saves.
Back up projects before switching versions.

- Free signed-in accounts get **20 AI credits daily**, resetting at 00:00 UTC;
  unused daily credits do not stack. Premium currently gets the same daily limit.
  Purchased credits carry forward and are spent after the daily allowance.
- Free image prompts return one image for one credit. Premium / Studio Pass
  returns three choices for three credits, with selection and reference-image
  re-sketch (another three credits). Nothing replaces card text automatically.
- Premium emphasizes custom backs and AI. Paid frame overlays were removed;
  the regular frame editor remains free, and existing saved styles are preserved.
- Gathering Plane replaces Kingdom Collection. Its Proxxied import accepts
  your own / permission-cleared exported proxy images privately, with original
  creator/source credit. No community-wide catalog was copied.
- The welcome stack shows real Sol Ring, Command Tower and Arcane Signet cards,
  with artist credits and Scryfall links. The configured owner can later feature
  up to three public community creations.
- Premium Decks supports owner-uploaded ZIP/PDF deck lines, individual purchases
  and optional member access. No sale products or paid content are pre-populated.

**Print repair:** Direct Print now opens an isolated document with 300-DPI color
card images. PDF and Direct Print share physical geometry, cut guides, bleed,
back alignment and page order. Images/fonts must finish loading first. Old
conflicting Letter/3-by-3 print CSS was consolidated. See PRINTING.md.

Cloud upgrade: run supabase/evolution.sql after schema.sql, community.sql and
premium.sql. Existing 2.3 installations need evolution.sql only. Set server-only
OWNER_USER_ID to your Supabase auth UUID to enable deck publishing and home
features. Follow PREMIUM_SETUP.md. Local editing and printing need no database.

Validation: automated DOM, SQL, HTTP, print geometry and production-build checks.
No physical printer, native browser print dialog, live billing or live AI provider
was tested in this environment. Please test one sheet before a full deck.

The older release notes below describe earlier versions; this section and the
current setup guide define 2.4 behavior.

---

# The Proxy Plane 2.3 — Import a whole deck

New free **Deck Import** area: paste a decklist, load a plain-text deck file, or
read a supported public deck URL. Review Scryfall matches, quantities and exact
printings, select commander/main/sideboard/maybeboard/token sections, and append
copies to your print queue. Unmatched cards are flagged for correction.

URL adapters: public Moxfield, Archidekt, TappedOut and MTGGoldfish decks. Private
or blocked decks can be imported from an exported text list. See DECK_IMPORT.md
for supported formats, limits, live-check coverage and usage.

Start with START_THE_PROXY_PLANE.bat. Existing device data and Premium features
are retained; no database migration is needed for the deck importer.

---

# The Proxy Plane 2.2 — Premium studio, packs and AI

New: three original design packs (six backs + three frame overlays), reusable
style templates, batch styling, local/account revision history, themed creator
profiles/showcases/badges, bleed and saved alignment profiles, larger cloud
vaults, AI cards/sets/lore/illustrations/review, and Stripe checkout/portal/webhooks.

**Start:** stop the old server, extract this ZIP, copy your .env if configured,
and double-click START_THE_PROXY_PLANE.bat. This starts both the editor and app
server. Keep your previous browser/address for existing device saves.

**Free remains usable.** The standard backing, editor, ordinary exports and
community sharing remain free. Premium access, cloud limits and AI credits come
from the account backend. Purchases and AI are inactive until you configure them.
No live account, prices, keys, payment or deployment was created.

**Read PREMIUM_SETUP.md** for migrations, Stripe test products, owner access,
credit grants, keys, feature locations, operating limits and final verification.
Community/Auth setup is in COMMUNITY_SETUP.md. Previous release notes follow.

---

# The Proxy Plane 2.1 — Optional card backs

- Custom Studio → **11 · Optional card backing**: choose the classic-inspired
  Proxy Plane backing, leave blank, or inherit the sheet setting.
  Your choice is saved with the card and included in backups and account saves.
- Print → **Optional card backs**: choose a default for the whole queue, including
  Scryfall printings. Individual card choices override this default.
- Choose Fronts only, Fronts + paired backs, or Backs only. The default remains
  Fronts only. Additional back designs and custom-back uploads are not included
  in this free release; Premium purchases/entitlements are not implemented yet.
- For paired pages, enable duplex printing and match Long edge / Short edge in
  the printer dialog. The layout mirrors positions, not artwork, including on
  incomplete sheets. Back-only pages support a manual second pass; paper loading
  and page order depend on your printer. Test one sheet before printing a batch.
- Backs are 2.5 × 3.5 inches. Use Actual size / 100%, no fit-to-page.
- The included back is an original vector design with retro fantasy styling and
  The Proxy Plane branding. It is not the official Magic card back.
- The print-sheet default is temporary and resets when switching accounts or
  restarting. Choose a per-card back and save the card to retain it.
- PNG export and community snapshots still show the card front. Existing saved
  cards and old backups inherit the print-sheet setting.

Stop the previous server, extract into a new folder, copy your .env if configured,
and double-click START_THE_PROXY_PLANE.bat. Use the same browser and address for
existing device saves. Community setup remains in COMMUNITY_SETUP.md.

Validation: npm run build; npm run test:backs; npm run test:community.
Physical duplex alignment still needs a test print on your printer.

---

# The Proxy Plane 2.0.1 — Your cards. Your art. Your world.

Formerly Proxy Kingdom. This release updates the app branding, card identification,
export filenames and launcher. Kingdom Collection and Cardsmiths remain.

Existing device/account storage identifiers are retained for compatibility. Keep
your previous .env settings and use the same browser and address to access saves.
The domain has not been purchased and the app has not been deployed.

The 2.0 update adds a new Home screen, Cardsmith profiles, following, the Kingdom
Collection feed, and My Vault with public/private collections and individual
card visibility. The existing editor, import tools and printing remain.

## Start locally

Back up your work, stop the old server, extract this ZIP into a new folder,
then double-click START_THE_PROXY_PLANE.bat inside the-proxy-plane. Keep your usual
browser address (localhost or 127.0.0.1) to access older device saves.

Home and the device vault work immediately. Real multi-user profiles, follows,
account sync and public posting require your Supabase project and the included
community migration. Read COMMUNITY_SETUP.md; no backend was provisioned or
connected as part of creating this ZIP. The app shows an honest connection
state rather than sample posts or fake Cardsmiths.

## Included

- Home: Kingdom welcome, original concept-card decoration, workshop/library/
  community shortcuts and real recent work from your local vault.
- My Vault: create collections, move cards, search/filter, individual privacy,
  account save, and explicit artwork/proxy snapshot publishing.
- Cardsmith profiles: unique username, display name, emblem, bio, public/private
  profile setting; browse creators and their visible public collections.
- Kingdom Collection: Explore, Following and Cardsmith search. Follow/unfollow
  creators; refresh or load more public creations.
- Privacy: new work is private. Public posts require public card + public
  collection if assigned + public profile. Only rendered PNGs are shared;
  editable project JSON and source artwork remain owner-only.
- Separate account-local vaults. Copy device-only work explicitly after signing
  in; old guest work is retained. Backups now include collections.

Account saves and community publishing are explicit, not continuous sync.
Visibility changes for already-published work need the owning account. Shared
snapshots update when republished. Removing a device card hides its account
publication but retains a private account copy. Already-downloaded images
cannot be recalled.

## Validation and limits

npm run test:community passes embedded PostgreSQL RLS/storage/ownership tests,
simulated UI flows, publish failure checks, guest-copy tests and actual App
account-switch hydration tests. npm run build passes. npm audit reported zero
vulnerabilities during this update. Tests use an in-memory database and mock
browser DOM; they do not contact your Supabase account.

Native browser visual checks, real Auth/Storage publishing and multi-user live
verification against a configured Supabase project remain pending. The frontend
was not hosted or deployed. The Cardsmith feed refreshes on navigation/Refresh;
notifications, comments, likes, follow requests and editable remixes are not part
of this version. Historical-frame limitations from earlier builds still apply.

---

# Milestone 1.9 — Import text into the existing design

The Imported frame reference editor category has been replaced with Import text.
Search Scryfall inside the studio, choose a result and a card face if applicable,
then click Import selected text. Checkboxes choose card name, type line, rules,
flavor, mana cost and power/toughness. Uncheck Card name to keep a custom alias.
Missing mana or P/T clears those checked fields so old creature stats do not
remain when importing a land or noncreature spell. Search supports Scryfall
queries and loading further result pages.

This importer updates a strict text/stat-field allowlist. It does not change
card ID, artwork, frame, colors, symbols, rarity, set/collector/artist details,
layout, stats visibility, custom layers, layer positions, artwork pan/zoom or
unknown project data. For an existing planeswalker/saga layout, checked rules
are also copied into its displayed abilities/chapters text field; its layout
and loyalty/defense values remain unchanged. Search does not import anything
until you click the import button. The existing Card Library workflow remains.

Validation: production build passes. Simulated DOM and model tests cover text
field limits, full preservation of other design fields, face selection, absent
mana/P-T clearing, import checkboxes and preservation of newer design edits made
while searching. Browser visual and physical print verification is pending.

Run: stop the old server, extract into a new folder, then double-click
START_THE_PROXY_PLANE.bat inside the-proxy-plane. Use your previous browser address
(localhost or 127.0.0.1) to access its existing device saves. Back up projects
before updating.

---

# Milestone 1.8 — MTG and original set-symbol picker

Expand Type line & set symbol. Choose Magic sets for the searchable catalog,
or The Proxy Plane original symbols for eight original vector icons: Kingdom
Crown, Portal Gate, Prism Crystal, Arcane Spark, Twin Moons, Dragon Eye,
Knight Shield and Spellbook. Custom image uploads and symbol text remain.

The bundled catalog contains all 1,063 entries returned by Scryfall /sets on
2026-10-30, including promos, Commander products and other set categories.
These are set entries, not 1,063 unique icons; some products share symbols.
Search by name/code, filter by set category, and use Refresh set catalog to
retrieve new entries. Catalog refresh is explicit; no background polling.
Source: https://api.scryfall.com/sets and each entry's icon_svg_uri.

An official symbol downloads when selected. Its supported SVG geometry is
stored in the card, so it stays with saved projects, backups and exports.
The selected set also updates the editable set code. Scryfall card imports
without a custom symbol automatically try to load the imported set's symbol.
A failed download leaves the previous selection intact and displays an error;
original symbols work offline. The catalog and selected icon downloads are
cached in this browser where storage is available.

Fetched SVG is parsed into a small allowlist of geometry and attributes;
script, external images, event handlers and markup injection are excluded.
Symbols requiring SVG constructs outside this geometry subset may need an
uploaded raster version. Vector fill follows rarity (common/uncommon/rare/mythic)
or the symbol layer's color override. Uploaded raster colors stay unchanged.

Validation: live catalog download and an actual set SVG fetch succeeded.
Production build and simulated DOM checks pass for catalog validation,
search, original/official selection, safe SVG geometry, saved rendering and
cancellation of obsolete requests. Native browser visual and print/PDF
verification remains pending.

Run: stop the old server, extract to a new folder, then double-click
START_THE_PROXY_PLANE.bat inside the-proxy-plane. It opens 127.0.0.1:5173. If your
saved cards are at localhost:5173, open that original address in the same
browser to retain access to its device storage. Back up projects before updates.

---

# Milestone 1.7 — Mana picker and interactive preview

WINDOWS: stop the old server, extract this ZIP into a new folder and double-click
START_THE_PROXY_PLANE.bat inside the-proxy-plane. It installs dependencies and opens
the app at http://127.0.0.1:5173/. Node.js must already be installed. Keep the
window open. To stop, press Ctrl+C and answer Y if prompted. The launcher uses
strict port 5173 so it will report an old server instead of opening the wrong build.

If your existing saves are under http://localhost:5173/, open that exact URL
instead; 127.0.0.1 and localhost have separate browser storage. Back up existing
projects before switching. Manual startup remains npm install then npm run dev.

Mana: expand Name & mana cost. Choose a symbol category, symbol/number and
repeat count, then Add symbol. Generic 0–100 and 1,000,000; colored/colorless/snow;
variables; infinity/half; hybrid, colorless hybrid, Phyrexian/hybrid Phyrexian;
half-color and tap/untap/energy/ticket/chaos/acorn options are available. Typed
entry remains editable. Remove last removes the final braced symbol; Clear
empties the cost. Larger generic numbers use a numeric circle where the font
has no glyph. The picker covers its listed symbols, not a promise of all future
symbols. Unrecognized typed tokens remain visible as text.

Preview: select/move/resize mode lets you drag text, art windows and custom
layers. Drag the selected lower-right handle to resize its box. Arrow keys
nudge; Shift increases movement. Toolbar selection is synchronized with the
layer designer. Text-size and rotation controls apply to the selected layer.
Resizing a text box changes its dimensions; use text size to resize the letters.
Rotation uses a top-left origin so handles track the rendered layer.

Artwork mode pans the illustration inside the artwork window; the artwork
zoom slider changes its scale. View zoom only enlarges the workspace. Clean
preview removes selection guides; guides never enter PNG/PDF/print output.
PNG export targets 750×1050 pixels regardless of workspace zoom. Preview-only
settings are not saved; card layer changes are included in projects/backups.

Text color: use a color wheel, system color picker or hex input for global or
individual layer text color. The wheel controls hue and saturation; the slider
controls brightness. Arrow keys on the wheel control hue/saturation. Explicit
layer colors override the global default. Text outlines remain separately editable.

Validation: production build passes. JSDOM interaction checks cover mana picker
and typed entry, drag, resize, artwork pan, wheel color, clean view and isolation
of the export ref from editing overlays. Pure checks cover every listed picker
glyph, hex/HSV round trips and rotated-resize geometry. Browser visual checks,
native pointer-capture behavior and actual PNG/PDF downloads were not verified
in a browser because the remote browser cannot reach this workspace server.
Windows launcher was inspected but not executed on Windows.

Historical frame/template limitations from 1.6 still apply.

---

# Milestone 1.6 — Full art and free layer composition

Choose Frame, border & card layout → Borderless / full art. That selection
sets border width to zero, removes global text panels and uses white text with
black outlines. Artwork fills the canvas. Text boxes are optional per layer.
You can re-enable the global panels or individual layer backgrounds later.
Existing explicit layer overrides are retained when changing frame presets.

All layers → select a layer → Optional background box lets you independently
set fill, transparency, border thickness/color and corner rounding. Other
submenus control position, size, rotation, visibility, opacity, stacking,
font, size, weight, italic, line/letter spacing, wrapping, alignment, outline
and shadow. Text is manually fitted; automatic text fitting is not implemented.

Add custom text (including symbols/subtitles), image (frame pieces/icons) or
shape (panels/lines) layers. Custom layers are retained in saved projects and
backup JSON, and use the same renderer as preview, PNG export and printing.
They can be named, hidden, removed, and independently styled. Image layers
accept PNG/JPG/WebP up to 20 MB; use transparent PNG for frame components.
Stack order controls which element appears in front. Uploaded full-card frame
overlays sit above art and below text. Card proxy identification stays visible.
Artwork controls also include brightness, contrast, saturation, hue and blur.

This provides flexible composition, not a finished catalog of EVERY historical
MTG frame or special layout. Exact templates, uploaded fonts, automatic text
fitting, drag handles and special multi-face/split/adventure template editing
are still incomplete. No faithful historical-frame asset library is bundled.
Scryfall frame metadata identifies a treatment; it is not a frame-image asset.
The supplied example image is a visual reference and is not bundled.

Validation: production build passes. Targeted rendered-markup/model checks
cover box-free full-art defaults, outlines, image coverage, optional box alpha,
rotation, custom text layers, mana and text updates. Browser visual/interaction
and PNG capture testing remains blocked because the remote test browser cannot
reach this workspace’s loopback server. Physical print verification is pending.
The PDF dependency was updated in this build series; npm audit reported zero
vulnerabilities. The experimental renderer is removed.

Update: back up projects, stop the old server with Ctrl+C, extract into a NEW
folder, run npm install and npm run dev from its the-proxy-plane folder. Open
the displayed localhost URL. Keep the same browser and origin for device saves.

---

# Milestone 1.5 — Layer editor and shared preview

The experimental mtg-card preview and dependency are removed. CardRenderer now
renders the main studio preview, custom-card queue sheets, PNG exports and PDF
capture. The previous main and print renderers were separate and inconsistent.

Ten expandable categories organize frame/layout, name/mana, artwork, type and
symbols, rules/typography, stats/abilities, artist/collector, layer geometry,
source-frame reference, and AI art. Each category contains labelled controls
and dropdown selections. Eleven independently positioned layers cover name,
mana, artwork, type, rules, flavor, symbol, footer, statistics, watermark and
stamp. Position, size, visibility and text size can be overridden independently.

Built-in frames remain original approximations, not faithful historical MTG
frame assets. Uploaded transparent frame overlays, decorative stamps,
watermarks and set symbols are supported. Watermark/stamp layers default to
hidden; show them in Layer positions after uploading. Proxy identification is
always visible. Set a zero border and transparent text panels when using a
full-card frame overlay that already includes those elements.

Standard, textless, planeswalker-ability and saga-chapter arrangements are
supported. This is NOT a complete implementation of every historical frame or
special card layout. Split, adventure, leveler, double-faced editing, precise
showcase families and exact historical assets remain unfinished. The layer
architecture is ready to extend without adding another preview renderer.
Long text requires manual font/box adjustment; automatic text fitting is pending.

Scryfall imports now use artwork crops (when available), selected-face text,
and preserve frame, frame_effects, border and layout metadata. Metadata chooses
the closest built-in treatment, not an exact frame reconstruction. Original
printing images appear in a separate reference dropdown. Data definitions:
https://scryfall.com/docs/api/frames
https://github.com/scryfall/api-types/blob/main/src/objects/Card/CardFields.ts

jsPDF updated to 4.2.1. npm audit reported zero vulnerabilities at validation.
Build, server-rendered text/symbol updates, frame mapping, layer overrides,
visibility and PDF image embedding checks pass. Browser visual/interaction and
PNG capture tests could not be completed: the remote browser could not reach
the workspace's local preview server. Physical printing still needs calibration.

Update: stop the old server with Ctrl+C; extract this ZIP into a NEW folder;
open its the-proxy-plane folder, run npm install, then npm run dev. Use the same
browser and origin to keep device data available; export a backup first. Old
projects load with default values for newly added fields.

---

# Milestone 1.4 — Paper sizes and media

Print & Projects now offers 36 size choices including custom dimensions:
US Letter, Legal, Tabloid/Ledger, Executive, Statement; ISO A0–A7 and B0–B7;
JIS B4–B6; common photo and wide-format sizes including 4×6, 5×7, 8×10,
12×12 and 13×19. Choose portrait or landscape. Custom dimensions use inches.

Media options include plain, matte, premium matte, glossy, premium glossy,
uncoated/matte/glossy cardstock (including premium finishes), matte/glossy
photo paper (including premium finishes), semi-gloss and luster/satin photo.
Optional gsm entry records your selection on screen; it does not validate
printer compatibility or change the printer driver. Paper, orientation and
media selections are remembered on this browser. Margin and custom sizes
reset on reload.

Preview, PDF export and direct print use a calculated grid with fixed
2.5×3.5-inch cards. Minimum margin now changes capacity. Cards stay upright
in the selected page orientation. Zero-capacity settings disable export/print.
Select the matching driver media and paper size; use Actual size / 100%.
The dropdown is a format catalog, not a claim that a chosen printer supports
that size, coating, thickness or weight.

Validation: layout geometry checked for every preset in both orientations;
Letter=9, 4×6=1, Tabloid=16 at 0.25-inch margins. Production build passes.
Browser/PDF visual checks and physical print calibration are still pending.

Run: npm install, then npm run dev. Open the displayed localhost URL.

---

# Integration test build — Milestone 1.3

Changes: bundled Mana symbol rendering in editor rules/cost and print rules;
optional lazy-loaded mtg-card SVG preview in the studio; Letter/A4 PDF export
at 2.5 × 3.5 inches with optional perimeter cutting marks. Export PDF from the
Print page after adding cards. Print using Actual size (100%).

Validation: Vite production build passes. Browser rendering, remote-image PDF
export and physical print calibration require user testing. PDF export reports
image/CORS errors rather than exporting silently. Image quality remains limited
by source images; rasterization does not create additional detail.

The SVG renderer is an experiment only: it does not replace the main preview,
PNG export or print renderer. Large renderer assets are loaded on demand.
Proxxied source code has not been copied. Adjustable bleed and drag-and-drop
are deferred pending a closer source/license review. The supplied Python tool
has not been integrated yet. Existing saved projects remain compatible.

Dependencies: mana-font 1.18.0 (https://github.com/andrewgioia/mana),
mtg-card 0.1.1 (https://github.com/FeSens/mtg-card), jsPDF 3.0.4
(https://github.com/parallax/jsPDF). Preserve upstream notices. Mana font and
CSS use their upstream OFL/MIT terms; mtg-card and jsPDF declare MIT. Code
licensing does not establish permission for external artwork, templates or fonts.
Review asset provenance before production distribution.

---

# The Proxy Plane — three-page starter

A Vite + React web app with three connected pages:

1. **Card Library** — Scryfall search with unique printings, art previews, import to editor, and add-to-print-queue actions.
2. **Custom Card Studio** — live custom card editor, distinct frame treatments, image upload/zoom, optional server-side AI artwork generation, PNG export, device saving, and add-to-print-sheet.
3. **Print & Projects** — print queue, 3×3 layout, 2.5×3.5 inch card target, cut guides, direct browser printing, JSON backup/restore, and optional Supabase cloud project sync.

## Requirements
- Node.js 20+ recommended
- npm

## Run it
1. Extract the ZIP and open the `the-proxy-plane` folder in VS Code.
2. In the VS Code terminal run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. For AI image generation, copy `.env.example` to `.env`, add your OpenAI API key to `OPENAI_API_KEY`, then in a second terminal run `npm run server`. The key stays on the server and is not exposed to the browser. AI image generation incurs usage charges and depends on API access.

## Device and account saving
- Device saving is on by default using local browser storage. Browser storage is not a substitute for backup; use **Backup projects** to export JSON.
- To enable account sign-in and cloud project sync, create a Supabase project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, run `supabase/schema.sql` in the Supabase SQL editor, then restart Vite. Configure email auth in Supabase. For production use, add a proper storage bucket and upload large artwork files there; this starter keeps project JSON and small data URLs together, so very large art files should be moved to object storage.
- If Vite does not forward `/api` requests to the AI server automatically, add a proxy in `vite.config.js` (included below) or configure the client URL. This project includes a Vite proxy config.

## Print notes
- The sheet is intended for US Letter or A4. Browser print scaling can change physical dimensions. In the print dialog, choose **100% / Actual size**, disable **Fit to page**, and confirm paper size. Check the first sheet with a ruler before printing a full batch.
- A standard Magic card is nominally 2.5 × 3.5 inches (63.5 × 88.9 mm). Printer margins and feed tolerances vary; this is not a calibrated press workflow. Use the crop marks as guides.
- Exported PNG is rendered from the live preview. Browser image/CORS policies may affect remote-image exports; imported original images are left unmodified in the library and print queue.

## Important scope notes
- This is a runnable MVP starter, not a deployed hosted service. Accounts and cross-device cloud storage require your own Supabase project credentials.
- Scryfall availability, printing data, image availability, and rate limits are controlled by Scryfall.
- Frame layouts are custom interpretations, not official Wizards templates. Keep The Proxy Plane identification on custom cards and do not represent proxies as genuine tournament-legal cards.


## Dark fantasy interface and accounts
The top-left hamburger menu switches between Card Library, Custom Studio, and Print & Projects.
The Kingdom Night theme uses dark violet, ink black, and antique gold.

### Enable email/password accounts
1. Create a Supabase project at https://supabase.com and open Project Settings → API.
2. Copy `.env.example` to `.env`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the project URL and publishable/anon key. Never put the service-role key here.
3. In Supabase SQL Editor, execute `supabase/schema.sql`.
4. Under Authentication → Providers → Email, enable email/password signups and email confirmation.
5. Configure Authentication → URL Configuration with the deployed site URL and allowed redirect URLs. For local testing, add your Vite local origin (typically http://localhost:5173).
6. Restart `npm run dev`. Click **Account / Sync** → **Create account**, verify the email, sign in, then choose **Save to account** in the studio. On another device sign in and choose **Load cloud projects**.

Accounts require a running Supabase backend and will not work from a standalone HTML file. The frontend does not store passwords. Cloud artwork bucket settings are in the SQL file; review its public access before deploying.

### Printing note
Nine 2.5 × 3.5-inch cards occupy 7.5 × 10.5 inches on US Letter paper. The print CSS centers the grid with 0.5-inch left/right and 0.25-inch top/bottom margins. Browser printing must use Actual Size / 100%, not Fit to Page. A physical test sheet is essential.

### Cloud artwork privacy
The storage bucket is private. Cloud project data stores an artwork path and loads a temporary signed URL on sign-in. Signed URLs expire; reload cloud projects to renew them. Do not publish your Supabase service-role key.

## Core milestone additions
- Printer selection and saved local profile, with searchable sample models and generic fallback. The catalog is a starter, **not** an exhaustive or independently verified printer compatibility database. Confirm paper weights, driver options, and printable margins in the manufacturer's documentation. Browsers cannot force driver settings.
- Google and Apple OAuth sign-in buttons. Configure and enable both providers in Supabase Auth and register correct redirect URLs with Google and Apple; the buttons alone do not make OAuth functional.
- Free account quota: 1,000 cloud projects, enforced by a database trigger (run the updated schema in Supabase); local saves also have a client-side 1,000-card limit. This is not a full artwork-byte quota or subscription billing system.
- Premium Art Studio, subscriptions, and extended storage are deferred.

## Known work before production
- The print CSS uses physical inches but needs physical printer testing; crop marks, nonprintable margins, and image quality must be validated on representative devices.
- The current custom-card print rendering is a simplified preview and is not equivalent to the full-resolution Studio export. High-resolution print rendering is a remaining core task.
- Scryfall search currently returns a page of results; complete pagination and multi-face card handling need more work.
- Supabase credentials, provider setup, and hosted deployment are not included.

## Milestone 1.1 — re-run and validation notes
- Updated print sheets to center a **fixed 7.5 × 10.5 inch grid** on either Letter or A4 paper, without shrinking cards. The preview-margin slider does not change physical print sizing.
- Disabled the print action when the queue is empty.
- This package was checked for JSX/JavaScript syntax using TypeScript's parser, but **npm dependency installation and a full Vite production build could not be completed in the current execution environment**. Do not treat it as a verified production build.
- On your PC: install Node.js 20+, run `npm install` and `npm run build` inside the `the-proxy-plane` folder. If the build fails, share the terminal output for a targeted fix.
- OAuth sign-in and cloud saving require Supabase credentials/provider setup; these are not live by default.


## Milestone 1.2 — Scryfall pagination and print QA
- Search and individual-printing browsing now offer **Load more printings** when Scryfall has another page. This prevents missing alternate arts beyond the first 175 results.
- Each print sheet targets **2.5 × 3.5 inches per card** at **100% / Actual Size**. Test on plain paper and measure before using cardstock.
- Browser print dialogs can override CSS sizes; disable headers/footers and Fit-to-Page. Printer profiles offer recommendations, not automatic driver changes.
- Google/Apple login needs configured Supabase OAuth providers and redirect URLs. No live account functionality without those credentials.
- Validation: run `npm install`, `npm run build`, `npm run dev`. If the install cannot complete, do not assume the app is verified.

## Local Art Studio

See [local Art Studio setup](local-art-studio/README.md) to install and start the renderer. In the card editor, use **Generate 3 images locally** and select an image in the picker to apply it to the active card.
