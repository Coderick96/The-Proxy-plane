# Catalog price and mana sorting

Always-visible Sort cards dropdown: newest first, USD nonfoil price ascending/descending, mana value ascending/descending. Changing sorting immediately queries the catalog using current name/set/color/rarity controls. Scryfall pagination retains its original URL and stale responses cannot overwrite newer sorts. Clear results restores newest first.

Card tiles show available USD nonfoil estimates and mana value. Missing prices are labeled unavailable. No prices are used for payments or credits; no min/max price predicates are introduced. Existing printings, editor and print queue actions are preserved.

PASS: card-search query/helper tests; all 15 actual component UI fixtures; targeted final App sorting fixture covering all four directions, filter preservation and reset; production build. These tests use mocked Scryfall responses, not live price feeds. Independent browser review pending. Native Safari is not tested.
