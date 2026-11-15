# Silhouette Cameo 4 cutting mode — prototype

This is an **experimental cut-outline generator**, not a finished integration with the app. The main branch currently contains only a ZIP archive, so the app source must be unpacked before a UI integration can be built and tested.

## What it does
- Exports SVG outlines for true 63.5 × 88.9 mm MTG-size cards.
- Uses configurable rounded corners (default 3 mm).
- Defaults to four cards (2 × 2) on US Letter with generous margins; A4 is supported.
- Throws on grids that exceed page bounds.

## What it does NOT do
- It does not generate Silhouette's registration marks.
- It does not embed card artwork or ensure the printed image matches the outlines.
- It does not guarantee the 2 × 2 grid clears every Silhouette Studio registration exclusion area.
- It has not been physically tested on a Cameo 4.

## How to prototype
1. Use `makeCutOutlineSvg()` from `cameo-cut-layout.mjs` and save the returned string as an SVG file.
2. Import the SVG into Silhouette Studio (SVG import may require a paid Studio edition; DXF is an alternative for Basic).
3. In Studio, set US Letter, cutting mat, and registration marks. Verify every cut line is outside the no-print/no-cut zones.
4. Place corresponding card artwork behind the outlines at precisely matching positions; print from Studio at 100% scale.
5. Load the printed sheet on a 12 × 12 mat and perform a test cut with scrap 12 mil cardstock.
6. Measure cut cards with calipers and adjust calibration and blade settings before production.

## Next integration steps
Unpack the latest Proxy Plane source; connect this generator to the print-sheet editor, add artwork placement and proper print-and-cut workflow, export SVG/DXF as appropriate, and test printed output against real cuts.
