# Catalog price and mana sorting

Always-visible Sort cards dropdown: newest first, USD nonfoil price ascending/descending, mana value ascending/descending. Changing sorting immediately queries the catalog using current name/set/color/rarity controls. Scryfall pagination retains its original URL and stale responses cannot overwrite newer sorts. Clear results restores newest first.

Card tiles show available USD nonfoil estimates and mana value. Missing prices are labeled unavailable. No prices are used for payments or credits; no min/max price predicates are introduced. Existing printings, editor and print queue actions are preserved.

PASS: card-search query/helper tests; all 15 actual component UI fixtures; targeted final App sorting fixture covering all four directions, filter preservation and reset; production build. These tests use mocked Scryfall responses, not live price feeds. Independent source review PASS: whitelisted USD/CMC directions, explicit sort override, no hidden price restrictions. Reviewer execution was blocked by the permission flow; browser results below were executed by the lead agent using the independently authored harness.

PASS: final Chromium browser smoke selected each of the four new sort options and verified outgoing order/direction. At 390, 768 and 1440 pixels there was no horizontal overflow, no runtime error, and zero axe violations across the full main content. Mock card data only; not live price verification. The scan found card metadata contrast of 4.18:1; increasing contrast and text size fixed it, then all three scans passed. Logs: browser-final.log and build-final.log. Native Safari is not tested.
