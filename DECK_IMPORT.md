# Deck import — The Proxy Plane 2.3

Open **Deck Import** in the navigation. This feature is free and does not require
Premium, an account, Stripe or an AI key.

## Paste a list

Use Pasted list, enter a deck, then click Find cards. For example:

    Commander
    1 Your Commander

    Deck
    1 Sol Ring
    1 Command Tower
    10 Forest

    Sideboard
    2 Negate

Accepted card lines:

- 1 Card Name
- 1x Card Name
- Card Name (defaults to one copy)
- 1 Card Name (SET) 123 — specific set and collector number
- 1 Card Name [SET:123]

Arena/MTGO-style Deck, Commander, Companion, Sideboard, Maybeboard and Tokens
headers are recognized. Commander/companion cards and the main deck are selected
by default. Sideboards, maybeboards and tokens are initially excluded. Common
foil/commander markers and category comments are handled. Split card names such
as Fire // Ice remain intact. Load a .txt or plain-text .dec export if preferred;
XML deck files and CSV are not supported in this version.

## Import a URL

Switch to Deck URL and paste a public deck link from:

- https://moxfield.com/decks/DECK_ID
- https://archidekt.com/decks/DECK_ID/deck-name
- https://tappedout.net/mtg-decks/deck-slug/
- https://www.mtggoldfish.com/deck/DECK_ID#paper

Start the app using START_THE_PROXY_PLANE.bat so the app server runs alongside
the editor. URL imports go through this server; pasted-list resolution calls
Scryfall directly and only needs the editor plus internet access.

Only these providers' fixed deck endpoints are fetched. Arbitrary URLs, custom
ports, credential-bearing URLs, non-HTTPS addresses and redirects are rejected.
No site sign-in or private deck credentials are used. If a deck is private,
removed or blocked, export its text yourself and use Pasted list. These providers'
public endpoints can change independently of this app. No bot protections are
bypassed and no repeated retry loop is used for blocked requests.

Live checks were completed against sample public Archidekt, Moxfield, TappedOut
and MTGGoldfish decks, plus Scryfall lookup. The Moxfield sample contained one
stale/digital printing that remained unmatched for explicit review. These checks
do not guarantee every public URL will remain accessible.

## Review before printing

The review shows quantities, section and matched set/collector number. Enable
thumbnails if desired. Choose which sections to include and uncheck individual
cards you do not want. An imported list does not enforce a particular format's
legality or deck size.

Missing cards, mismatched printing identifiers and invalid lines are shown rather
than silently dropped. Correct unmatched names and use Retry unmatched names.
Use default printings for unmatched explicitly clears their requested printing
and searches by name instead. Exact requested printings are otherwise preserved.

For double-faced cards, select the face to print. The actual reverse face is not
automatically paired as a backing; backing options on the Print page are separate.
Open any matched card in the editor to create a custom version of it.

Click Add N matched copies to print. Copies get separate queue IDs and append to
your existing queue. Nothing is automatically saved to an account or published.
Unmatched/invalid lines are not added. Up to 1,000 copies can be added per import,
and the deck importer stops if the resulting print queue would exceed 2,000.

Your pasted source/URL draft is saved on this device in the current account's
workspace and included in project backups. Resolved review results are temporary;
return to Deck Import and resolve the saved source again if necessary. Existing
editor designs, privacy settings and printed cards are not replaced by an import.

## Verification

    npm run test:decks
    npm run test:community
    npm run build

Tests cover common list formats, printing IDs/leading zeros, section selection,
quantity preservation, request batching/deduplication, missing/out-of-order card
matches, double faces, URL adapters, URL safety, free HTTP import, actual React
list/URL-to-queue workflows and account-scoped source drafts in a simulated DOM.
Native-browser visual and physical print verification remain pending.
