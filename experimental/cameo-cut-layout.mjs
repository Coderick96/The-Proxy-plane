/**
 * Proxy Plane — experimental Silhouette cut-outline export.
 * SVG is imported into Silhouette Studio alongside matching artwork.
 * Registration marks MUST be generated inside Silhouette Studio.
 * Not a ready-to-cut, calibrated print-and-cut file.
 */
export const CARD = Object.freeze({ widthMm: 63.5, heightMm: 88.9, radiusMm: 3 });
export const PAPER = Object.freeze({
  letter: { widthMm: 215.9, heightMm: 279.4 },
  a4: { widthMm: 210, heightMm: 297 }
});
const esc = s => String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
/**
 * Layout is intentionally conservative (2x2), leaving a generous
 * margin for Studio's registration marks. Verify against the actual
 * registration-mark exclusion zones in Studio before printing.
 */
export function makeCutOutlineSvg({ paper = "letter", cornerRadiusMm = CARD.radiusMm,
  insetMm = 20, gapMm = 8, columns = 2, rows = 2 } = {}) {
  const page = PAPER[paper];
  if (!page) throw new Error("Unsupported paper size");
  if (![insetMm,gapMm,cornerRadiusMm].every(Number.isFinite) ||
      insetMm < 0 || gapMm < 0 || cornerRadiusMm < 0 || cornerRadiusMm > CARD.widthMm/2)
    throw new Error("Invalid layout measurements");
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1)
    throw new Error("Invalid grid");
  const w = columns * CARD.widthMm + (columns - 1) * gapMm;
  const h = rows * CARD.heightMm + (rows - 1) * gapMm;
  if (w + insetMm * 2 > page.widthMm || h + insetMm * 2 > page.heightMm)
    throw new Error("Grid does not fit paper with selected margins");
  const left = (page.widthMm - w) / 2, top = (page.heightMm - h) / 2;
  const shapes = [];
  for (let r=0;r<rows;r++) for(let c=0;c<columns;c++) {
    const x=left+c*(CARD.widthMm+gapMm), y=top+r*(CARD.heightMm+gapMm);
    shapes.push(`<rect x="${x}" y="${y}" width="${CARD.widthMm}" height="${CARD.heightMm}" rx="${cornerRadiusMm}" ry="${cornerRadiusMm}" fill="none" stroke="#ff0000" stroke-width="0.15" data-card="${r*columns+c+1}"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${page.widthMm}mm" height="${page.heightMm}mm" viewBox="0 0 ${page.widthMm} ${page.heightMm}">
<title>${esc("Proxy Plane cut outlines — register in Silhouette Studio")}</title>
<g id="cut-lines">${shapes.join("")}</g></svg>`;
}
