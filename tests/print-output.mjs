import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {jsPDF} from 'jspdf';
import {PAPERS,getLayout} from '../src/printSettings.js';
import {printPages} from '../src/cardBacks.js';
import {printGeometry,printHTML,capturePrintJob,addJobToPDF,waitForPrintAssets} from '../src/printOutput.js';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGM8oRHAwMDAxMDAwMDAAAAPogFEuLMs/wAAAABJRU5ErkJggg==';
for(const paper of PAPERS.filter(p=>p.id!=='custom'))for(const landscape of [false,true])for(const bleed of [0,.0625,.125]) {
 const width=landscape?paper.height:paper.width,height=landscape?paper.width:paper.height,layout=getLayout(width,height,.25,bleed);if(!layout.capacity)continue;
 const cards=Array.from({length:layout.capacity+1},(_,i)=>({id:String(i)}));
 const pages=printPages(cards,layout,{output:'both',back:{mode:'standard'},landscape});
 const settings={width,height,layout,bleed,guides:true,registration:true,backX:.02,backY:-.01};
 const geometries=pages.map(p=>printGeometry(settings,p));
 assert.equal(pages.length,4);assert.equal(geometries[2].cells.length,1);
 for(const g of geometries)for(const c of g.cells){assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=width&&c.y+c.height<=height);assert.ok(Math.abs(c.width-2*bleed-2.5)<1e-9);assert.ok(Math.abs(c.height-2*bleed-3.5)<1e-9);}
 assert.equal(geometries[0].lines.length,layout.capacity*8+8);
}
const dom=new JSDOM('<div id="root"><div class="paper"><div class="print-cell" data-slot="0"></div></div></div>');
const root=dom.window.document.querySelector('#root'),cell=root.querySelector('.print-cell');cell.getBoundingClientRect=()=>({width:125,height:175});
const settings={width:8.5,height:11,layout:getLayout(8.5,11),guides:true},pages=[{side:'front',cards:[{slot:0}]}];
let options;const job=await capturePrintJob(root,pages,settings,async(n,o)=>{options=o;return png;});
assert.equal(options.pixelRatio,6);assert.equal(options.backgroundColor,'#ffffff');assert.equal(options.filter({classList:{contains:x=>x==='crop'}}),false);
const html=printHTML(job);assert.match(html,/size:8.5in 11in/);assert.match(html,/print-color-adjust:exact!important/);assert.match(html,/<img alt="" src="data:image\/png/);assert.doesNotMatch(html,/app-shell|stylesheet|<script/);
assert.match(html,/width:2.5in;height:3.5in/);
const actual=new jsPDF({unit:'in',format:[8.5,11]});
const pdf=addJobToPDF(actual,{...job,pages:[...job.pages,...job.pages]});
assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-8.5)<1e-9);assert.equal(pdf.getNumberOfPages(),2);assert.match(pdf.output(),/612\. 792\./);assert.match(pdf.output(),/\/DeviceRGB/);
let calls=[];addJobToPDF({addPage(){calls.push('page')},addImage(...a){calls.push(a)},setDrawColor(){},setLineWidth(){},line(){},circle(){}},{...job,pages:[...job.pages,...job.pages]});
assert.equal(calls[0][2],.5);assert.equal(calls[0][3],.25);assert.equal(calls[1],'page');
await assert.rejects(capturePrintJob(root,[],settings,async()=>png),/preview changed/);
await assert.rejects(capturePrintJob(root,pages,settings,async()=>'<script>bad</script>'),/could not be rendered/);
const img=dom.window.document.createElement('img');root.append(img);Object.defineProperty(img,'complete',{value:true});await assert.rejects(waitForPrintAssets(root,20),/could not load/);
console.log('Print regression checks passed: all papers/orientations/bleed, duplex slots, 300 DPI, exact PDF geometry, color document, asset failures.');

const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');assert.equal((css.match(/@media print/g)||[]).length,1);assert.doesNotMatch(css,/width:7\.5in!important/);

// Spacing is outside capture cells, separate from bleed; all geometry remains centered.
const spaced=getLayout(8.5,11,.25,.0625,.04);
assert.equal(spaced.capacity,6);assert.equal(spaced.stepWidth,2.625);
assert.equal(spaced.gridWidth,3*2.625+2*.04);
const front={side:'front',cards:[{slot:0},{slot:1}]};
const positions=printGeometry({...settings,layout:spaced,bleed:.0625,frontX:.02,frontY:-.01},front);
assert.ok(Math.abs(positions.cells[1].x-positions.cells[0].x-2.665)<1e-8);
assert.ok(Math.abs(positions.cells[0].x-((8.5-spaced.gridWidth)/2+.02))<1e-8);
assert.equal(printGeometry({...settings,guideStyle:'full'},pages[0]).lines.length,4);
assert.equal(printGeometry({...settings,guideSides:'backs'},pages[0]).lines.length,0);
assert.equal(printGeometry({...settings,guideColor:'<bad>'},pages[0]).guideColor,'#464646');
const {parsePageRange,calibrationJob}=await import('../src/printOutput.js');
assert.deepEqual(parsePageRange('3, 1-2,2',4),[0,1,2]);assert.deepEqual(parsePageRange('',2),[0,1]);
for(const bad of ['0','2-1','3','1,,2','1.5'])assert.throws(()=>parsePageRange(bad,2));
const cal=calibrationJob(settings,'long',true);assert.equal(cal.pages.length,2);
assert.equal(cal.pages[0].rects.length,45);assert.equal(cal.pages[0].texts[0].text,'FRONT 1');assert.equal(cal.pages[1].texts[0].text,'BACK 1');
assert.equal(cal.pages[1].rects[0].x,5.5);assert.equal(cal.pages[0].rects[0].x,.5);
const calibrationPDF=addJobToPDF(new jsPDF({unit:'in',format:[8.5,11]}),cal);assert.equal(calibrationPDF.getNumberOfPages(),2);assert.match(calibrationPDF.output(),/FRONT 1/);assert.match(printHTML(cal),/Measure line: 1 inch/);
root.querySelector('img').remove();
const paper2=root.firstElementChild.cloneNode(true);paper2.querySelector('.print-cell').getBoundingClientRect=()=>({width:125,height:175});root.append(paper2);
let progress;await capturePrintJob(root,[...pages,...pages],{...settings,dpi:1200,pageIndices:[1],onProgress:v=>progress=v},async(n,o)=>{assert.equal(n,paper2.querySelector('.print-cell'));assert.equal(o.pixelRatio,24);return png;});
assert.deepEqual(progress,{done:1,total:1,page:2});
const controller=new AbortController();controller.abort();await assert.rejects(capturePrintJob(root,[...pages,...pages],{...settings,signal:controller.signal},async()=>png),{name:'AbortError'});
console.log('Print Studio checks passed: spacing vs bleed, front offsets, guide modes, ranges, calibration numbering/ruler/color, 1200 DPI, selected-page capture, cancellation.');

// A remote image must fail explicitly, never silently become a blank PDF card.
const remote=dom.window.document.createElement('img');cell.append(remote);remote.src='https://example.invalid/card.png';
Object.defineProperty(remote,'naturalWidth',{value:100});remote.decode=async()=>{};
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status:503});
try{await assert.rejects(capturePrintJob(root,[...pages,...pages],settings,async()=>png),/could not download/);}finally{globalThis.fetch=originalFetch;remote.remove();}
assert.equal(options.width,125);assert.equal(options.height,175);assert.equal(options.style.height,'175px');
const {printDocumentBlob}=await import('../src/printOutput.js');
const prepared=printDocumentBlob(cal);assert.equal(prepared.type,'text/html');
const preparedText=await prepared.text();assert.match(preparedText,/onclick="window.print\(\)"/);
assert.doesNotMatch(preparedText,/Preparing your cards/);
console.log('Mobile print document checks passed: complete document with user-activated print button and no waiting popup.');

// Verify actual PDF page boxes and card drawing sizes across all supported paper.
for(const paper of PAPERS.filter(p=>p.id!=='custom'))for(const landscape of [false,true]){
 const width=landscape?paper.height:paper.width,height=landscape?paper.width:paper.height;
 const layout=getLayout(width,height);if(!layout.capacity)continue;
 const g=printGeometry({width,height,layout},{side:'front',cards:[{slot:0}]});
 const doc=addJobToPDF(new jsPDF({unit:'in',format:[width,height],orientation:landscape?'landscape':'portrait'}),{width,height,pages:[{...g,cells:g.cells.map(c=>({...c,image:png}))}]});
 assert.ok(Math.abs(doc.internal.pageSize.getWidth()-width)<.001);
 assert.ok(Math.abs(doc.internal.pageSize.getHeight()-height)<.001);
 assert.equal(g.cells[0].width,2.5);assert.equal(g.cells[0].height,3.5);
 assert.match(doc.output(),/\/PrintScaling \/None/);assert.match(doc.output(),/\/PickTrayByPDFSize true/);
 assert.match(doc.output(),/180\. 0 0 252\./); // 2.5 × 3.5 inches in PDF points
}
assert.equal(getLayout(2,3).capacity,0);
console.log('True-size PDF checks passed across every supported paper/orientation: fixed 180 × 252 point cards and no-scaling preference; undersized paper cannot shrink cards.');

const {createPrintPDF}=await import('../src/printPDF.js');
const directPDF=createPrintPDF(job);
assert.ok(Math.abs(directPDF.internal.pageSize.getWidth()-8.5)<1e-9);
assert.match(directPDF.output(),/180\. 0 0 252\./);
assert.equal(directPDF.output('blob').type,'application/pdf');
console.log('Direct print uses a physical-size PDF, with the same fixed card boxes as downloaded PDFs.');

// Reject undersized/oversized card jobs at both public output boundaries.
const {validatePrintJob}=await import('../src/printOutput.js');
for(const [w,h] of [[2.49,3.5],[2.5,3.49],[2.51,3.5],[2.5,3.51]]){
 const invalid={...job,pages:[{...job.pages[0],cells:[{...job.pages[0].cells[0],width:w,height:h}]}]};
 assert.throws(()=>printHTML(invalid),/63.5 × 88.9/);
 assert.throws(()=>createPrintPDF(invalid),/63.5 × 88.9/);
}
assert.throws(()=>printGeometry({...settings,layout:{...settings.layout,stepWidth:2.4}},pages[0]),/63.5 × 88.9/);
const bleedLayout=getLayout(8.5,11,.25,.125);
const bleedGeometry=printGeometry({...settings,layout:bleedLayout,bleed:.125},pages[0]);
assert.doesNotThrow(()=>validatePrintJob({...job,pages:[{...bleedGeometry,cells:bleedGeometry.cells.map(c=>({...c,image:png}))}]}));
console.log('Hard size guard passed: undersized/oversized jobs refused at layout, PDF and HTML boundaries; bleed preserves exact trim.');
