import {CARD_WIDTH_IN,CARD_HEIGHT_IN} from './printSettings.js';
export function sourceDpi(pixelWidth,pixelHeight,widthIn,heightIn){
 if(![pixelWidth,pixelHeight,widthIn,heightIn].every(n=>Number.isFinite(n)&&n>0))return null;
 return Math.floor(Math.min(pixelWidth/widthIn,pixelHeight/heightIn));
}
// Measure the actual image box inside the locked physical trim, including crop/zoom.
export function inspectPrintQuality(cell){
 const trim=cell.querySelector('.sheet-card'),bounds=trim?.getBoundingClientRect();
 if(!bounds?.width||!bounds.height)return [];
 return [...trim.querySelectorAll('img')].flatMap(image=>{
  const src=image.currentSrc||image.src||'';
  if(src.startsWith('data:image/svg+xml')||/\.svg(?:[?#]|$)/i.test(src))return [];
  const box=image.getBoundingClientRect();
  const dpi=sourceDpi(image.naturalWidth,image.naturalHeight,box.width/bounds.width*CARD_WIDTH_IN,box.height/bounds.height*CARD_HEIGHT_IN);
  return dpi!==null&&dpi<300?[{label:image.alt||'Card artwork',dpi,pixelWidth:image.naturalWidth,pixelHeight:image.naturalHeight}]:[];
 });
}
