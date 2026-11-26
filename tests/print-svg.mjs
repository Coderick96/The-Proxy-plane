import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {unzipSync,strFromU8} from 'fflate';
import {capturePrintSVG,printSVGPages,svgDownload} from '../src/printSVG.js';
import {printMemoryLimits} from '../src/printMemory.js';
import {getLayout} from '../src/printSettings.js';
import {printGeometry} from '../src/printOutput.js';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGM8oRHAwMDAxMDAwMDAAAAPogFEuLMs/wAAAABJRU5ErkJggg==';
const limits=printMemoryLimits({navigator:{userAgent:'iPhone'}});
const settings={width:8.5,height:11,layout:getLayout(8.5,11),dpi:600,guides:true,memoryLimits:limits};
const pages=[{sheet:1,side:'front',cards:[{slot:0}]},{sheet:1,side:'back',cards:[{slot:2}]},{sheet:2,side:'front',cards:[{slot:0}]}];
const dom=new JSDOM('<div id="root">'+pages.map(p=>`<div class="paper"><div class="print-cell" data-slot="${p.cards[0].slot}"></div></div>`).join('')+'</div>');
const root=dom.window.document.querySelector('#root');for(const el of root.querySelectorAll('.print-cell'))el.getBoundingClientRect=()=>({width:125,height:175});
const result=await capturePrintSVG(root,pages,{...settings,pageIndices:[1,2]},async()=>png);
assert.deepEqual(result.pages.map(p=>p.name),['the-proxy-plane-page-2-back.svg','the-proxy-plane-page-3-front.svg']);
function parse(svg){const doc=new JSDOM(svg,{contentType:'image/svg+xml'}).window.document;assert.equal(doc.documentElement.getAttribute('width'),'8.5in');assert.equal(doc.documentElement.getAttribute('height'),'11in');assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 8.5 11');return doc;}
const back=parse(result.pages[0].svg),image=back.querySelector('image');assert.equal(image.getAttribute('width'),'2.5');assert.equal(image.getAttribute('height'),'3.5');assert.equal(image.getAttribute('xlink:href'),png);assert.equal(Number(image.getAttribute('x')),printGeometry(settings,pages[1]).cells[0].x);assert(back.querySelectorAll('line').length>0);assert.equal(back.querySelectorAll('script,foreignObject,button').length,0);
const one=svgDownload([result.pages[0]]);assert.equal(one.blob.type,'image/svg+xml');parse(await one.blob.text());
const multi=svgDownload(result.pages);assert.equal(multi.name,'the-proxy-plane-svg-sheets.zip');const zip=unzipSync(new Uint8Array(await multi.blob.arrayBuffer()));assert.deepEqual(Object.keys(zip),result.pages.map(p=>p.name));assert.equal(strFromU8(zip[result.pages[1].name]),result.pages[1].svg);
const calibration={...printGeometry(settings,pages[0]),cells:[],texts:[{x:1,y:1,text:'A&B <print> "safe"'}]};assert.equal(parse(printSVGPages({width:8.5,height:11,pages:[calibration]})[0].svg).querySelector('text').textContent,'A&B <print> "safe"');
for(const [width,height] of [[8.27,11.69],[11,8.5]]){
 const bleed=.125,layout=getLayout(width,height,.25,bleed,.04),geometry=printGeometry({width,height,layout,bleed,backX:.02,backY:-.02,guides:true,registration:true},pages[1]);
 const svg=printSVGPages({width,height,pages:[{...geometry,side:'back',cells:geometry.cells.map(c=>({...c,image:png}))}]})[0].svg;
 const doc=new JSDOM(svg,{contentType:'image/svg+xml'}).window.document;assert.equal(doc.documentElement.getAttribute('width'),`${width}in`);assert.equal(doc.documentElement.getAttribute('height'),`${height}in`);assert.equal(doc.querySelector('image').getAttribute('width'),'2.75');assert.equal(doc.querySelector('image').getAttribute('height'),'3.75');assert.equal(doc.querySelector('image').getAttribute('x'),String(geometry.cells[0].x));assert.equal(doc.querySelectorAll('circle').length,4);
}
assert.throws(()=>printSVGPages({width:8.5,height:11,pages:[{...calibration,cells:[{x:0,y:0,width:1,height:1,image:png}]}]}),/exactly/);
await assert.rejects(capturePrintSVG(root,pages,{...settings,dpi:1200},()=>assert.fail('Unsafe canvas must not render')),/too much memory/);
await assert.rejects(capturePrintSVG(root,pages,{...settings,memoryLimits:{...limits,maxRasterBytes:1}},async()=>png),/Export fewer pages/);
const controller=new AbortController();controller.abort();await assert.rejects(capturePrintSVG(root,pages,{...settings,signal:controller.signal},()=>assert.fail('Canceled capture must not run')),{name:'AbortError'});
await assert.rejects(capturePrintSVG(root,pages,{...settings,pageIndices:[8]},async()=>png),/valid export pages/);
console.log('PASS SVG print export: standalone physical-size XML, self-contained lossless images, vector guides, backing slots, page selection, ZIP round trip, escaping, exact trim guard, mobile memory limits and cancellation.');
