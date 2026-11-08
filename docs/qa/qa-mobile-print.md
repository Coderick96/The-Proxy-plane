# Independent QA 3 — mobile and printing

Reviewer: `/root/qa_mobile_print`, independent from homepage and print implementers. Source: authoritative Local Art 2.6.5 feature branch.

**Final result: PASS for the executed automated checks below. Native iPhone/AirPrint and physical printer validation remain NOT TESTED. This does not certify an overall launch.**

## Evidence and exact commands

| Check | Result | Evidence |
| --- | --- | --- |
| Homepage at 390, 768 and 1440 CSS pixels | PASS | `qa-mobile-print-results.json`; all local showcase images loaded, document width equals viewport, primary targets at least 44px, reduced-motion emulation enabled |
| Visual homepage review | PASS | Independently opened `screenshots/home-390.png`, `home-768.png`, `home-1440.png`; restored gutters, unclipped tablet art/credits, readable supporting text, single footer |
| Browser accessibility scan | PASS | Six axe runs: homepage at all three widths plus initial Library, Studio and Print pages at 390px; zero reported violations |
| Keyboard navigation | PASS | Mobile menu focus entry, Tab cycle, Escape dismissal and trigger focus restoration |
| Existing route integration | PASS | Search/Create/Print hero actions; Vault/Gathering/Premium quick actions; AI opens actual artwork category; quick routes have focusable `main-content` skip-link targets |
| Mobile editor/print document width | PASS | Library, Studio and Print each have 390px document width at 390px viewport. The zoom canvas can exceed its own viewport and scroll internally without widening the page |
| Real PDF preparation/download | PASS | Initial, A4, custom paper, custom width 9in, reset 300 DPI after 600 setting change, red cut guides and duplex None backing all produced actual `application/pdf` blobs starting `%PDF-`; final download filename correct |
| Stale PDF invalidation | PASS | Prepared-link disappearance asserted after paper, custom dimensions, DPI, guide color and duplex settings changes, followed by new preparation |
| Print geometry | PASS | `node tests/print-output.mjs`; raw log `qa-mobile-print-geometry.txt` |
| Bleed preview regression | PASS, simulated DOM | Independently bundled and executed `tests/print-spacing.jsx`: empty/populated queues at 0, 1/16, 1/8 inch bleed, unchanged 2.5 × 3.5 inch trim |
| Intentional blank reverse raster path | PASS, simulated canvas + actual browser | `node tests/qa-mobile-print-blank.mjs` verifies white fill/full 750 × 1050 dimensions and unmarked-content capture protection; actual browser duplex PDF is 4,729,451 bytes |

Browser command executed by lead because child sandbox could not bind local server; assertions were independently authored here, and I independently inspected the actual generated JSON/screenshots:

```sh
NODE_PATH=/tmp/proxy-browser-tools/node_modules node tests/qa-mobile-print.mjs
```

The browser script uses `/usr/bin/chromium`, a local Vite server, local fixture PNGs and isolated tooling outside repository manifests. All external HTTP resources are blocked. It records 19 passing flow entries, three passing viewport entries, six axe scans, no JavaScript page errors and no failure. It does not contact Scryfall, Supabase, Stripe or AI providers.

Other executed commands:

```sh
node --check tests/qa-mobile-print.mjs
node tests/print-output.mjs
node tests/qa-mobile-print-blank.mjs
node -r ./tests/setup.cjs node_modules/.cache/qa-spacing-independent.cjs
```

The last command used an independently built esbuild bundle from `tests/print-spacing.jsx`. Separate direct assertions of `getLayout` and `printGeometry` confirmed standard Letter/A4 capacity 9 and `(cell.width - 2*bleed)*25.4 = 63.5 mm`, `(cell.height - 2*bleed)*25.4 = 88.9 mm` for bleed 0, 0.0625, 0.125 in. Print tests also cover PDF boxes 180 × 252 points, no-scaling viewer preference, duplex slots, supported paper/orientations, guides/ranges/calibration, cancellation and explicit asset/size failures.

## Defects found and repairs independently checked

- **Tablet content clipping/gutters:** `.page-wrap` overrode homepage padding, clipping tablet art/credits. Implementer strengthened homepage selector and stacks hero through 900px. Refreshed screenshots visually accepted.
- **Mobile Studio overflow:** initial 390px page expanded to 444px due grid min-content sizing around fixed zoom canvas. Lead constrained grid/container min widths; final actual browser document 390px verified. Zoom remains usable inside its own scroll viewport.
- **Duplex None backing export failure:** an intentionally blank back entered custom-card blank-raster rejection and incorrectly told the user to change browsers. Independently traced `printPages` → `CardBack` → `rasterPrintCard`; root diagnostic logged the exact failure. Lead added explicit `data-print-blank-back` only for None reverse entries, painting opaque white without weakening missing/locked/custom capture checks. Independent stub unit and actual duplex browser export now pass.
- **Broken skip link on component routes:** independently reported missing `main-content` targets in Vault/Community/Premium/Premium Decks/Deck Import. Inspected all five repaired source roots; final browser quick-route assertions pass.

Test-harness corrections are distinct from app defects: assertions now match actual existing Vault/Premium headings, details panels are opened deterministically, implicit-label comboboxes use prefix accessible-name matching, and AI category checks wait for the next render/animation frame. Failed runs exposed these test assumptions; the final run completed all checks. Preparation failures now record phase, exact status text, cell count, paper and screenshot for useful future diagnostics.

## Limits and printer acceptance

- **NOT TESTED:** real iPhone Safari, iOS PDF viewer, Share → Print/AirPrint. 390px Chromium is responsive browser coverage, not Safari/device certification.
- **NOT TESTED:** physical output, printer-driver scaling, paper feed, duplex registration and ruler/caliper measurements.
- **NOT TESTED by this isolated browser script:** live Scryfall, hosted Supabase accounts/RLS/storage, Stripe test-account lifecycle or actual AI generation. Other reviewers cover local mocks/SQL; those are separate evidence.
- Axe success covers the scanned initial page states and cannot certify all interaction states or replace manual assistive-technology testing.

Software/PDF geometry correctness is **not** proof a printer outputs exact dimensions. Before private-beta print acceptance, print calibration at Actual size/100%, matching selected paper, with Fit/Shrink and borderless enlargement disabled. Measure the 25.4 mm ruler and 63.5 × 88.9 mm trim using the actual desktop and iPhone/AirPrint workflows. No deployment, live payment or external database operation was performed during this QA pass.

Final integrated rerun: `final/results.json` records18 browser flow entries and six zero-violation axe scans, plus native-randomUUID-disabled compatibility. This final JSON is authoritative for current counts; earlier review snapshots above are retained.
