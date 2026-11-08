# Editor, imports, printing and local Art Studio audit

Authoritative source: `Proxy-Plane-2.6.5-Local-Art.zip`, source commit `1707c3f`.
Reviewer: independent editor/print specialist (`/root/editor_print_audit`).

## Confirmed bugs

| Priority | Finding | Evidence | Resolution |
| --- | --- | --- | --- |
| P1 | Enabling Studio bleed crashes the Print page | `src/LiveSpacingPreview.jsx` computed empty-cell geometry without passing `bleed`; immutable trim guard in `printGeometry` rejects the resulting mismatch at both 1/16 and 1/8 inch bleed | Fixed by forwarding bleed. New `tests/print-spacing.jsx` renders empty and populated queues at all three supported bleed values and asserts 2.5 × 3.5 inch trim rectangles. |
| P2 | Library cannot select the reverse face of double-faced cards | Original `App.jsx` has `face` state but only ever calls `setFace(0)`; selected-card panel has no face selector. Deck import already supports explicit faces. | Reported to integration lead, who owns App changes and regression. |
| P2 | Prepared direct-print PDF can become stale after changing settings | Original `App.jsx` readyPrint reset effect omits custom paper dimensions, guides, export quality, backing/output selection and alignment offsets. Existing link can retain older settings. | Reported to integration lead for full settings invalidation and regression. |

No application files outside `src/LiveSpacingPreview.jsx` were edited by this reviewer.

## Executed tests

| Check | Status | Command / actual evidence |
| --- | --- | --- |
| Print geometry and PDF output | PASS (automated) | `node tests/print-output.mjs`: supported papers/orientations/bleed, duplex slots, ranges, calibration ruler, cancellation, asset errors, PDF 180 × 252 point cards, no-scaling preferences and boundary guards all passed. |
| Card backing layout | PASS (automated) | `node tests/card-backs.mjs`: inheritance, overrides, locked-backing rejection, edge mapping and page order passed. |
| Bleed crash regression | PASS (automated DOM simulation) | Bundle `tests/print-spacing.jsx` with esbuild (platform node, CJS, externals react/react-dom/client/node:assert/strict), then `node -r ./tests/setup.cjs node_modules/.cache/print-spacing-tests.cjs`: empty/populated queues with no bleed, 1/16 and 1/8 inch bleed all rendered; exact trim asserted. |
| Local Art Studio editor integration | PASS (simulated fixtures) | `node tests/local-art-web.mjs`: three fixture candidates, streamed NDJSON chunks, untrusted origin/source rejection, selection and popup cleanup passed. No image model or external API is invoked. |
| Deck import suite | BLOCKED in default sandbox | `node tests/deck-import.mjs` completed prior parsing/batching/DFC fixture assertions but its real local HTTP server failed with `listen EPERM: operation not permitted 127.0.0.1`. Overall suite must not be called passed from this run. Lead may have an approved execution route and report a separate run. |
| Python syntax/input guards | PASS (automated, ad hoc) | `ast.parse` both Python modules; `CardArtRenderer.generate` rejects null/empty/overlong prompts and unsupported layout before model loading. |
| Python request guards | PASS (simulated handler requests) | Instantiated Handler with BytesIO request/response and generator fixture: host/origin 403, MIME 415, size/invalid JSON/prompt 400, 3 candidates plus done, busy lock 409. This does not prove real HTTP behavior. |
| Local companion real HTTP | BLOCKED in default sandbox | Attempt to bind ThreadingHTTPServer to 127.0.0.1 failed `PermissionError: [Errno 1] Operation not permitted`. Extra-network retry was aborted before completion and supplies no pass evidence. |
| Actual SDXL generation | NOT TESTED | Requires PyTorch/model installation, multi-GB weights and adequate compute. Model loading and three actual images were not executed. |
| External Scryfall searches/alternate art | NOT TESTED by this reviewer | Fixture resolution is covered by code/tests; live upstream availability/terms/rate behavior needs separate network verification. |
| Physical print dimensions | NOT TESTED | PDF coordinates are exactly 2.5 × 3.5 inches (63.5 × 88.9 mm). Print calibration at Actual Size/100%, disable fit/shrink/borderless expansion, measure 25.4 mm ruler and both card edges on each target printer/paper. |
| iPhone Safari/AirPrint | NOT TESTED | Desktop/browser emulation cannot certify iOS PDF viewer, Share → Print, device memory behavior, printer driver scaling or physical output. Real iPhone + AirPrint validation is required. |

## Preserved capabilities and limits

The inspected source retains original card import, editor layers, frame families, typography/mana/set symbols, preview zoom/panning, queue management, PDF and direct-print workflows. This is an inspection finding, not a blanket claim that every UI interaction has been exercised. Built-in frames are documented approximations rather than exact licensed historical templates. Default Letter/A4 layouts fit nine cards with no bleed and default margin; bleed/spacing and smaller media legitimately reduce capacity while trim stays fixed.

Local Art Studio runs on the user's own `127.0.0.1:8765` desktop companion and is separate from billed cloud artwork. It cannot be assumed to work on an iPhone without a compatible local renderer. No model/API credentials were read, no paid requests made, no deployment performed.

Release recommendation from this scope: **BLOCKED** pending integration-lead resolutions, complete browser regressions, live service checks and real-device/physical printer acceptance. Passing geometry tests alone does not establish launch readiness.
