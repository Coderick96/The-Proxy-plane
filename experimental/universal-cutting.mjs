/**
 * Experimental machine-neutral cut geometry for The Proxy Plane.
 * This does NOT produce proprietary registration marks or native cutter files.
 */
export const MACHINE_PROFILES = Object.freeze({
  "silhouette-cameo": { label:"Silhouette Cameo / Portrait", formats:["svg","dxf"], workflow:"silhouette-studio", marks:"studio" },
  "cricut": { label:"Cricut Explore / Maker / Joy Xtra", formats:["svg"], workflow:"design-space", marks:"design-space" },
  "brother-scanncut": { label:"Brother ScanNCut", formats:["svg"], workflow:"canvasworkspace", marks:"machine-dependent" },
  "siser": { label:"Siser Juliet / Romeo", formats:["svg"], workflow:"leonardo", marks:"software-dependent" },
  "generic": { label:"Other SVG/DXF cutters", formats:["svg","dxf"], workflow:"vendor-software", marks:"vendor-dependent" }
});
export const PAPER_SIZES = Object.freeze({
  letter: { width:215.9,height:279.4 },
  a4: { width:210,height:297 },
  a3: { width:297,height:420 },
  tabloid: { width:279.4,height:431.8 }
});
export const MTG_CARD = Object.freeze({ width:63.5,height:88.9,cornerRadius:3 });
function validateNumber(n, min, max) { return Number.isFinite(n) && n>=min && n<=max; }
export function buildCutLayout({machine="generic",paper="letter",columns=2,rows=2,margin=20,gap=8,radius=3}={}) {
  if (!MACHINE_PROFILES[machine]) throw Error("Unsupported machine profile");
  const p=PAPER_SIZES[paper]; if(!p) throw Error("Unsupported paper");
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||columns*rows>100) throw Error("Invalid grid");
  if(!validateNumber(margin,0,100)||!validateNumber(gap,0,100)||!validateNumber(radius,0,31.75)) throw Error("Invalid dimensions");
  const w=columns*MTG_CARD.width+(columns-1)*gap;
  const h=rows*MTG_CARD.height+(rows-1)*gap;
  if(w+margin*2>p.width || h+margin*2>p.height) throw Error("Layout exceeds paper");
  const cards=[];
  const left=(p.width-w)/2,top=(p.height-h)/2;
  for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) cards.push({
    x:left+x*(MTG_CARD.width+gap),y:top+y*(MTG_CARD.height+gap),
    width:MTG_CARD.width,height:MTG_CARD.height,radius
  });
  return {machine,paper,page:p,cards,requiresRegistrationSetup:true,
    warning:"Verify registration exclusion zones, scale and mat settings in vendor software before cutting."};
}
export function exportCutSvg(layout) {
  const {page,cards}=layout;
  if(!page||!Array.isArray(cards)) throw Error("Invalid layout");
  const rects=cards.map(c=>`<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="${c.radius}" ry="${c.radius}" fill="none" stroke="#ff0000" stroke-width="0.15"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}mm" height="${page.height}mm" viewBox="0 0 ${page.width} ${page.height}"><g id="cut-lines">${rects}</g></svg>`;
}
/** Basic DXF R12-style POLYLINE export with segmented rounded corners. */
export function exportCutDxf(layout) {
  if(!layout?.cards) throw Error("Invalid layout");
  const lines=["0","SECTION","2","ENTITIES"];
  for(const c of layout.cards) {
    const r=c.radius, n=8, pts=[];
    for(const [cx,cy,start] of [
      [c.x+c.width-r,c.y+r,-90],[c.x+c.width-r,c.y+c.height-r,0],
      [c.x+r,c.y+c.height-r,90],[c.x+r,c.y+r,180]
    ]) for(let i=0;i<=n;i++) {
      const a=(start+i*90/n)*Math.PI/180;
      pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);
    }
    lines.push("0","POLYLINE","8","CUT","66","1","70","1");
    for(const [x,y] of pts) lines.push("0","VERTEX","8","CUT","10",String(x),"20",String(-y),"30","0");
    lines.push("0","SEQEND");
  }
  lines.push("0","ENDSEC","0","EOF");
  return lines.join("\n");
}
