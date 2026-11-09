# Card Library browse filters

The Card Library supports browsing by set, card colors and rarity without requiring a card name. Filters use a native collapsed disclosure so cards remain visible before opening the controls. The catalog loads automatically the first time the Card Library opens and shows one entry per card. Existing Scryfall query syntax, alternate printings, editor imports and print queue actions remain available.

This change is isolated to card discovery. It does not configure hosted accounts, AI, billing or database access. Full private beta readiness remains blocked by the previously recorded service configuration and real-device verification requirements.

## Acceptance criteria

- Browse by a set name/code, color, or rarity with an empty card-name field.
- Combine filters with a card name or grouped advanced Scryfall query.
- Clearly label how multiple colors and rarities match.
- Reset filters/results and prevent previous in-flight responses from restoring cleared results.
- Preserve paginated query results, deduplicate cards and prevent stale page responses from mixing searches.
- Preserve alternate printings, reverse-face editor import and print queue workflows.
- Provide keyboard-accessible, touch-friendly controls without horizontal overflow at 390, 768 and 1440 pixels.

## Evidence

- PASS: `npm test` — 22 groups, including query-builder and actual App filter/pagination/race regressions. Log: `npm-test.log`.
- PASS: `npm run build` — Vite build completed; existing >500 kB chunk advisory remains. Log: `build.log`.
- PASS: `git -c core.whitespace=cr-at-eol diff --check` — preserves existing App.jsx CRLF.
- PASS: final `npm run test:ui` — 15 actual component fixtures, including collapsed disclosure, automatic catalog, filters, clear/reset and stale pagination. Log: `ui-final.log`.
- PASS: final `npm run build` after collapsed-filter improvement.
- PASS: Chromium 390px initial catalog renders without horizontal overflow or runtime errors, using mocked card data.
- Independent expanded browser review pending.

Automated integration/browser tests use mocked Scryfall responses; they do not prove external API availability or native iPhone behavior.
