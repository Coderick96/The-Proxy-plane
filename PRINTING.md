# Printing in The Proxy Plane 2.5

Use the app's Print page and Direct Print or Export PDF. Both prepare the same
color card images at your selected 300 / 600 / 1200 DPI and use the selected paper's physical dimensions.
Card trim remains 2.5 × 3.5 inches. Bleed adds space outside trim and reduces
sheet capacity. Back offsets are applied only to back pages. Cut guides and
registration marks are drawn separately, rather than captured from the preview.

## First test

1. Add one card and choose paper size, orientation and margin to match the paper.
2. Click Direct Print and wait while artwork/fonts finish loading. Missing images
   stop the job with an error instead of silently printing an incomplete card.
3. In the browser/printer dialog select **Color**, matching paper and orientation,
   **Actual size / 100%**, one page per sheet, and turn off headers/footers.
   Do not use Fit to page or a second printer-driver scaling setting.
4. Print one test sheet and measure a card before printing a deck. For paired
   fronts/backs, select the same duplex edge in the app and printer settings.
   Test alignment and back direction with ordinary paper first.

If Direct Print is blocked by a browser, export PDF and print it at Actual size.
Direct Print uses an isolated document containing the card images, so app menus,
background preferences and old editor layout CSS cannot enter that job. The
print document stays available while the dialog is open; it is not removed on
a two-second timer. Color is embedded in the output. A grayscale/black-ink-only
printer-driver setting can still override it and must be changed in the dialog.
Paper/media selections in the app are advice; select the physical paper type
and quality in your printer driver too.

## Repairs and checks

Previous native print CSS accumulated fixed Letter and 3-by-3 rules alongside
variable paper/grid rules, and color rules covered an older card renderer.
These rules are now consolidated. Direct Print and PDF share capture, placement,
bleed, duplex offsets and marks. Both wait for fonts and image decoding.

Automated checks cover supported paper sizes, both orientations, three bleed
values, partial sheets, paired pages, trim dimensions, 300-DPI capture settings,
RGB PDF content, isolated print HTML and missing-image failures. The app's DOM
and production build also pass. This environment could not verify the native
print dialog or a physical printer. Test a single sheet on your machine.


## Print Studio controls

The settings column expands by category. The preview has its own scroll area,
page selector, Previous/Next navigation and 50–150% zoom. Zoom only changes the
screen; print dimensions stay fixed. All source sheets remain available while
viewing calibration sheets so a calibration preview cannot replace actual cards
in an export.

Starting presets choose centered Letter/A4 or Letter with cutting space. They
reset bleed and alignment offsets; they retain your queue, backs and artwork.
Spacing accepts 0–12.7 mm of blank space between cells. Bleed remains a separate
Studio setting that duplicates expanded artwork behind the trim-size card.
Both reduce sheet capacity when necessary. A smaller custom paper with no full
card capacity blocks export.

Guides can be short corner marks or full trim outlines, in your chosen color,
on fronts, backs or both. The Cutting guidelines switch enables/disables them.
PDF and Direct Print use the selected quality. Higher DPI improves rendering
of editable text; it does not add detail to low-resolution source art. 1200 DPI
uses much more memory and produces larger files. Use small page ranges for
large decks at high quality. Progress identifies the page/card; Cancel stops
between capture operations. Leaving Print or switching accounts cancels pending
preparation.

Leave Export page range blank for all pages, or use 1, 3-5. Numbers are one-based,
duplicates are removed and order remains ascending. Invalid/out-of-range entries
block normal export. A range can split a duplex pair, so include both front and
back page numbers. Test first sheet PDF ignores the range and includes that
sheet's paired back when enabled. It keeps empty back slots to preserve placement.

Calibration preview / Calibration PDF / Print calibration use the current paper,
spacing, bleed, duplex edge and allowed offsets without using your card artwork.
Front/back numbers correspond through the paper when flipped on the selected
edge. Measure a trim rectangle (2.5 × 3.5 inches) and its one-inch ruler. Check
color swatches and front/back alignment before a real deck. It can run with an
empty queue. Studio profiles now also remember front offsets, spacing, quality,
guide mode/color/sides and the guide toggle; old profiles use sensible defaults.

Reference workflows inspected: https://www.mtgproxy.net/printing-guide and
https://proxxied.com/app/ . Our implementation retains The Proxy Plane's theme
and existing card-size, backing and access choices.


## 2.5.8 spacing shortcuts

Card spacing offers Close together (0 mm), Medium spaced (3 mm), and Spaced
for a die cutter (6 mm), plus Custom. These set the same gap used by preview,
PDF, Direct Print and calibration. More spacing can reduce sheet capacity.
Check your die/cutter dimensions; the die-cutter preset is not a universal
hardware calibration. Use the millimeter input for an exact custom gap.

Select a Cutting tool to see advice and its suggested starting gap: scissors /
craft knife 0 mm, rotary cutter 2 mm, guillotine/trimmer 3 mm, die cutter 6 mm,
or Other / my own preference. Selecting a tool retains your chosen gap; use
“Use tool’s suggested spacing” to apply a suggestion. The numeric spacing input
always lets you set your own value, in 0.1 mm steps up to 12.7 mm. Studio profiles
retain both the gap and cutting-tool choice. Cutter suggestions do not control
hardware or guarantee that a particular die fits.
