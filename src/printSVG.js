import {zipSync,strToU8} from 'fflate';
import {capturePrintJob,validatePrintJob} from './printOutput.js';
import {printMemoryLimits,checkPrintRasterBudget} from './printMemory.js';

const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function sheetStart(width,height,page){
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}in" height="${height}in" viewBox="0 0 ${width} ${height}"><title>${xml(`The Proxy Plane · Sheet ${page.sheet||1} · ${page.side||'front'}`)}</title><rect width="${width}" height="${height}" fill="#ffffff"/>`;
}
function imageSVG(cell){
 if(!/^data:image\/png;base64,[a-z\d+/=]+$/i.test(cell.image))throw new Error('A card could not be embedded in the SVG.');
 return `<image x="${cell.x}" y="${cell.y}" width="${cell.width}" height="${cell.height}" preserveAspectRatio="none" xlink:href="${cell.image}"/>`;
}
function sheetEnd(page){
 return `<g fill="none" stroke="${xml(page.guideColor||'#464646')}" stroke-width="0.005">${page.lines.map(l=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}"/>`).join('')}${page.circles.map(c=>`<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"/>`).join('')}${(page.rects||[]).map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${xml(r.fill||'none')}"/>`).join('')}</g>${(page.texts||[]).map(t=>`<text x="${t.x}" y="${t.y}" fill="#222222" font-size="0.1" font-family="sans-serif">${xml(t.text)}</text>`).join('')}</svg>`;
}
export function printSVGPages(job){
 validatePrintJob(job);
 return job.pages.map((page,i)=>({name:`the-proxy-plane-page-${i+1}-${page.side||'front'}.svg`,svg:sheetStart(job.width,job.height,page)+page.cells.map(imageSVG).join('')+sheetEnd(page)}));
}
export function svgDownload(pages){
 if(!pages.length)throw new Error('Choose at least one SVG page.');
 if(pages.length===1)return {blob:new Blob([pages[0].svg],{type:'image/svg+xml'}),name:pages[0].name};
 // One ZIP avoids multiple-download prompts on phones. Each SVG is a full-size sheet.
 const files=Object.fromEntries(pages.map(p=>[p.name,strToU8(p.svg)]));
 return {blob:new Blob([zipSync(files,{level:1})],{type:'application/zip'}),name:'the-proxy-plane-svg-sheets.zip'};
}
export async function capturePrintSVG(root,pages,settings,capture){
 const limits=settings.memoryLimits||printMemoryLimits();checkPrintRasterBudget(settings,limits);
 const indices=settings.pageIndices||pages.map((_,i)=>i),result=[];let parts=[],used=0,pageNumber=0;
 // SVG retains base64 PNGs. Leave room for the UTF-8/ZIP download buffers on mobile.
 const maxBytes=Math.floor(limits.maxRasterBytes*2/3);
 function append(part){used+=part.length;if(used>maxBytes)throw new Error('These SVG sheets are too large for safe export on this device. Export fewer pages using the page range, or choose 300 DPI. Your cards are unchanged.');parts.push(part);}
 try{
  const job=await capturePrintJob(root,pages,{...settings,memoryLimits:limits,
   onPageStart:geometry=>{validatePrintJob({width:settings.width,height:settings.height,pages:[geometry]});parts=[];append(sheetStart(settings.width,settings.height,pages[indices[pageNumber]]));},
   imageSink:cell=>append(imageSVG(cell)),
   onPageEnd:geometry=>{append(sheetEnd(geometry));result.push({name:`the-proxy-plane-page-${indices[pageNumber]+1}-${pages[indices[pageNumber]].side||'front'}.svg`,svg:parts.join('')});pageNumber++;parts=[];}
  },capture);
  settings.signal?.throwIfAborted();return {pages:result,qualityWarnings:job.qualityWarnings};
 }catch(error){parts.length=0;result.length=0;throw error;}
}
