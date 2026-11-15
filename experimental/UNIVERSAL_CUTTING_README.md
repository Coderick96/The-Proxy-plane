# Universal Cutting Studio — experimental foundation

Supported **workflow profiles**: Cricut Design Space, Silhouette Studio, Brother CanvasWorkspace/ScanNCut, Siser Leonardo, and generic SVG/DXF software.

The module `universal-cutting.mjs` provides:
- Real-size 63.5 × 88.9 mm MTG card cut geometry, with adjustable corner radius.
- Letter, A4, A3, tabloid paper bounds.
- Validated grids and machine-neutral SVG / segmented rounded-corner DXF exports.
- Explicit warnings that registration marks and print-and-cut alignment must be configured in each vendor's software.

## Critical limitations
- This is **not yet wired into the Proxy Plane application**. Main repo currently holds a source ZIP, not unpacked app files.
- Profiles are workflow labels, not validated machine-specific cut-area guarantees.
- Cricut Print Then Cut must be created inside Design Space; an imported SVG alone cannot provide its registration system.
- Silhouette SVG import may require paid Silhouette Studio; DXF can be used as an alternative.
- Brother may need CanvasWorkspace conversion to FCM.
- Siser requires confirmation of the Leonardo import and registration workflow.
- Generic PDF print layouts and cut SVGs must be paired at exact scale; this prototype does not export artwork or generate proprietary marks.
- DXF uses millimeter coordinates; confirm units and Y orientation on import.
- A 2×2 layout is the conservative default; actual usable areas depend on software marks and machine settings.

## Validation plan
Unpack latest app source; implement UI and artwork placement; add printer-safe export; create per-machine integration tests; physically calibrate and cut 12 mil stock on each supported family. Keep this branch experimental until verified.
