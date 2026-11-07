// Physical trim dimensions never depend on paper, preview zoom or DPI.
export const CARD_WIDTH_IN=2.5;
export const CARD_HEIGHT_IN=3.5;
const mm = (n) => n / 25.4;
const iso = (prefix, sizes) => sizes.map(([w,h], i) => ({id:`${prefix}${i}`,label:`${prefix.toUpperCase()}${i} · ${w} × ${h} mm`,width:mm(w),height:mm(h)}));
export const PAPERS = [
  {id:'letter',label:'US Letter · 8.5 × 11 in',width:8.5,height:11},
  {id:'legal',label:'US Legal · 8.5 × 14 in',width:8.5,height:14},
  {id:'tabloid',label:'Tabloid / Ledger · 11 × 17 in',width:11,height:17},
  {id:'executive',label:'Executive · 7.25 × 10.5 in',width:7.25,height:10.5},
  {id:'statement',label:'Statement / Half Letter · 5.5 × 8.5 in',width:5.5,height:8.5},
  ...iso('a',[[841,1189],[594,841],[420,594],[297,420],[210,297],[148,210],[105,148],[74,105]]),
  ...iso('b',[[1000,1414],[707,1000],[500,707],[353,500],[250,353],[176,250],[125,176],[88,125]]),
  ...[[257,364,'b4'],[182,257,'b5'],[128,182,'b6']].map(([w,h,id])=>({id:`jis-${id}`,label:`JIS ${id.toUpperCase()} · ${w} × ${h} mm`,width:mm(w),height:mm(h)})),
  ...[[3.5,5],[4,6],[5,7],[6,8],[8,10],[8.5,13],[11,14],[12,12],[12,18],[13,19],[17,22]].map(([w,h])=>({id:`inch-${w}-${h}`,label:`${w} × ${h} in${w===13&&h===19?' · Super B / A3+':''}`,width:w,height:h})),
  {id:'custom',label:'Custom dimensions',width:8.5,height:11},
];
export const MEDIA = [
  ['plain','Plain paper','Choose Plain Paper in the driver.'],
  ['matte','Matte paper','Choose the matching matte-paper setting.'],
  ['premium-matte','Premium matte paper','Choose the matching premium matte setting.'],
  ['gloss','Glossy paper','Choose the matching glossy-paper setting.'],
  ['premium-gloss','Premium glossy paper','Choose the matching premium glossy setting.'],
  ['cardstock','Uncoated cardstock','Use a supported cardstock/heavy-paper setting and feed path.'],
  ['cardstock-matte','Matte cardstock','Choose a supported matte cardstock setting.'],
  ['cardstock-premium-matte','Premium matte cardstock','Choose the manufacturer’s matching matte/heavy media setting.'],
  ['cardstock-gloss','Glossy cardstock','Choose a supported coated/glossy cardstock setting.'],
  ['cardstock-premium-gloss','Premium glossy cardstock','Choose the manufacturer’s matching glossy/heavy media setting.'],
  ['photo-matte','Matte photo paper','Choose Matte Photo Paper or the package’s recommended setting.'],
  ['photo-premium-matte','Premium matte photo paper','Choose the package’s recommended premium matte photo setting.'],
  ['photo-gloss','Glossy photo paper','Choose Glossy Photo Paper or the package’s recommended setting.'],
  ['photo-premium-gloss','Premium glossy photo paper','Choose the package’s recommended premium glossy photo setting.'],
  ['photo-semigloss','Semi-gloss photo paper','Choose the matching semi-gloss photo setting.'],
  ['photo-luster','Luster / satin photo paper','Choose the matching luster/satin photo setting.'],
].map(([id,label,advice])=>({id,label,advice}));

export function getLayout(width,height,margin=0.25,bleed=0,gap=0){
  if (![width,height,margin,bleed,gap].every(Number.isFinite)||width<=0||height<=0||margin<0||bleed<0||bleed>.125||gap<0||gap>.5) return {cols:0,rows:0,capacity:0,gridWidth:0,gridHeight:0,stepWidth:CARD_WIDTH_IN,stepHeight:CARD_HEIGHT_IN};
  const stepWidth=CARD_WIDTH_IN+2*bleed,stepHeight=CARD_HEIGHT_IN+2*bleed;
  const cols=Math.max(0,Math.floor((width-2*margin+gap+1e-8)/(stepWidth+gap)));
  const rows=Math.max(0,Math.floor((height-2*margin+gap+1e-8)/(stepHeight+gap)));
  return {cols,rows,capacity:cols*rows,gridWidth:cols*stepWidth+Math.max(0,cols-1)*gap,gridHeight:rows*stepHeight+Math.max(0,rows-1)*gap,stepWidth,stepHeight,gap};
}

export const SPACING_PRESETS=[
 {id:'close',label:'Close together · 0 mm',mm:0},
 {id:'medium',label:'Medium spaced · 3 mm',mm:3},
 {id:'die',label:'Spaced for a die cutter · 6 mm',mm:6},
];

export const CUTTING_TOOLS=[
 {id:'scissors',label:'Scissors / craft knife',mm:0,advice:'Close spacing keeps straight cuts efficient. Add room if you prefer individual outlines.'},
 {id:'rotary',label:'Rotary paper cutter',mm:2,advice:'A small gutter gives room to line up straight cuts.'},
 {id:'guillotine',label:'Guillotine / paper trimmer',mm:3,advice:'A medium gutter leaves room to align the blade and trim.'},
 {id:'die',label:'Die cutter',mm:6,advice:'Match the gap to the actual die pitch, outer edge and cutting mat. The suggested gap is only a starting point.'},
 {id:'custom',label:'Other tool / my own preference',mm:null,advice:'Set any supported gap in millimeters below and check one test sheet first.'},
];
