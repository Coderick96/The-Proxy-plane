# Beta 2.6.2 print hotfix

Captures now pin card dimensions before rasterizing and embed downloaded artwork explicitly. Failed artwork downloads stop export instead of silently producing blank cards. Direct print opens a separate window during the original click, waits for assets, and retains the document until you close it. A Print sheets button lets you retry when automatic printing is blocked.

Extract this package into a new folder, install dependencies and start as usual. For hosted installs, rebuild and redeploy. Existing browser saves require the same site origin.

Start with Test first sheet PDF and check that every image appears. Print one sheet using matching paper, Actual size / 100%, headers and footers off. Keep the print window open until the job finishes. If the complete PDF also prints only the top strip, check printer paper-size settings and the print queue/driver. Physical printer output was not verified in this environment.

The queue is now expanded by default, with preview Remove buttons on fronts and backs, move up/down, add another copy, clear queue, and a link to choose other printings. Removing a preview card removes its queued copy and paired back and repacks sheets. Controls are excluded from raster export and browser printing.

## Beta 2.6.3 — true-size output
All paper formats use shared physical trim constants of 2.5 × 3.5 inches. Paper changes capacity, never card size. PDFs request PrintScaling None and paper selection by PDF page size. Automated checks verify the actual PDF card image transforms are 180 × 252 points for every supported paper and orientation. Print Studio displays size and calibration instructions prominently. Viewer preferences are advisory: choose Actual size / 100% in the viewer/driver, disable Fit/Shrink and borderless expansion, and match the loaded paper. Verify the calibration ruler is exactly 25.4 mm before a full deck run.

## Beta 2.6.4 — blank mobile exports and waiting print windows
Imported full-card images and backs now render directly from decoded image pixels into a canvas rather than an SVG DOM screenshot. Custom cards detect blank screenshot output and try a canvas DOM renderer; a second blank result stops the export with an error. Artwork downloads time out after 30 seconds. Direct print finishes preparing in the current tab and displays Open print sheets; the completed document has a user-activated Print sheets button and iPhone Share → Print instructions. No placeholder tab is opened during preparation.

Validation: real Chromium at a 390px viewport, nine image cards with checked nonwhite output pixels at 750 × 1050, PDF rendering inspected for all nine imported cards and all nine custom fallback cards, completed print document image loading/button click, and full app Direct print/link plus Export PDF download flows. PDF geometry and build checks also pass. Actual iPhone/WebKit and hardware printer verification remain outstanding.

## Beta 2.6.5 — direct print uses PDF physical dimensions
Direct print and PDF download now use the same createPrintPDF function. Direct print opens an application/pdf document instead of an HTML sheet subject to browser print layout. Card trim remains fixed at 2.5 × 3.5 inches across paper sizes; PDF viewer preferences request no scaling. Paper changes sheet capacity only. Actual iPhone/AirPrint output remains to be confirmed; native print scaling cannot be forced by web code.

Size guards also reject any layout, PDF or HTML card cell whose trim is smaller or larger than 63.5 × 88.9 mm. Bleed is excluded from trim measurement. Jobs that cannot fit the full-size cells on the selected paper are rejected rather than scaled down. Regression tests exercise undersized and oversized cells and accepted bleed layouts.
