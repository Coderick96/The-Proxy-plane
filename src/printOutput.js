import {CARD_WIDTH_IN,CARD_HEIGHT_IN} from './printSettings.js';
import {backSlot} from './cardBacks.js';
// One color capture and physical geometry for PDF and the isolated browser print job.
export async function waitForPrintAssets(root, timeout=30000) {
  let timer;
  try {
    await Promise.race([
      (async()=>{
        await root.ownerDocument.fonts?.ready;
        await Promise.all([...root.querySelectorAll('img')].map(async img=>{
          if(img.decode) {try{await img.decode();}catch{throw new Error('A card image could not load. Reload it before printing.');}}
          else if(!img.complete) await new Promise((resolve,reject)=>{
            img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});
          });
          if(!img.naturalWidth) throw new Error('A card image could not load. Reload it before printing.');
        }));
      })(),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Card images or fonts are still loading. Try again once they appear.')),timeout);})
    ]);
  } finally { clearTimeout(timer); }
}
export function printGeometry({width,height,layout,bleed=0,guides=false,registration=false,backX=0,backY=0,frontX=0,frontY=0,guideStyle='corners',guideSides='both',guideColor='#464646'},sheet) {
  if(![width,height,layout.cols,layout.stepWidth,layout.stepHeight,layout.gridWidth,layout.gridHeight,bleed,backX,backY,frontX,frontY].every(Number.isFinite)||width<=0||height<=0||layout.cols<1) throw new Error('Invalid print dimensions.');
  if(Math.abs(layout.stepWidth-2*bleed-CARD_WIDTH_IN)>1e-8||Math.abs(layout.stepHeight-2*bleed-CARD_HEIGHT_IN)>1e-8)throw new Error('Card trim must be exactly 63.5 × 88.9 mm. Cards cannot be resized to fit paper.');
  const left=(width-layout.gridWidth)/2+(sheet.side==='back'?backX:frontX),top=(height-layout.gridHeight)/2+(sheet.side==='back'?backY:frontY);
  const cells=sheet.cards.map(({slot})=>({slot,x:left+(slot%layout.cols)*(layout.stepWidth+(layout.gap||0)),y:top+Math.floor(slot/layout.cols)*(layout.stepHeight+(layout.gap||0)),width:layout.stepWidth,height:layout.stepHeight}));
  const lines=[],circles=[];
  if(guides&&(guideSides==='both'||guideSides===(sheet.side==='back'?'backs':'fronts'))) for(const cell of cells){const x=cell.x+bleed,y=cell.y+bleed;
    if(guideStyle==='full'){lines.push([x,y,x+CARD_WIDTH_IN,y],[x,y+CARD_HEIGHT_IN,x+CARD_WIDTH_IN,y+CARD_HEIGHT_IN],[x,y,x,y+CARD_HEIGHT_IN],[x+CARD_WIDTH_IN,y,x+CARD_WIDTH_IN,y+CARD_HEIGHT_IN]);continue;}
    for(const cx of [x,x+CARD_WIDTH_IN]) lines.push([cx,y-.06,cx,y],[cx,y+CARD_HEIGHT_IN,cx,y+CARD_HEIGHT_IN+.06]);
    for(const cy of [y,y+CARD_HEIGHT_IN]) lines.push([x-.06,cy,x,cy],[x+CARD_WIDTH_IN,cy,x+CARD_WIDTH_IN+.06,cy]);
  }
  if(registration) for(const [x,y] of [[.2,.2],[width-.2,.2],[.2,height-.2],[width-.2,height-.2]]){circles.push([x,y,.055]);lines.push([x-.1,y,x+.1,y],[x,y-.1,x,y+.1]);}
  return {cells,lines,circles,bleed,trimWidth:CARD_WIDTH_IN,trimHeight:CARD_HEIGHT_IN,guideColor:/^#[a-f\d]{6}$/i.test(guideColor)?guideColor:'#464646'};
}
// html-to-image otherwise suppresses failed remote-image fetches and exports blanks.
async function embedPrintImages(node,cache) {
  const restores=[];
  try {
    for(const img of node.querySelectorAll('img')) {
      const src=img.currentSrc||img.src;
      if(!src||src.startsWith('data:'))continue;
      if(!cache.has(src)) cache.set(src,(async()=>{
        const response=await fetch(src,{signal:AbortSignal.timeout(30000)});
        if(!response.ok)throw new Error(`Card artwork could not download (${response.status}). Reload the card and retry.`);
        const blob=await response.blob();
        return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Card artwork could not be read.'));reader.readAsDataURL(blob);});
      })());
      const data=await cache.get(src),original=img.getAttribute('src'),srcset=img.getAttribute('srcset');
      restores.push(()=>{if(original===null)img.removeAttribute('src');else img.setAttribute('src',original);if(srcset!==null)img.setAttribute('srcset',srcset);});
      img.removeAttribute('srcset');img.src=data;
    }
    await waitForPrintAssets(node);
    return ()=>restores.reverse().forEach(restore=>restore());
  }catch(error){restores.reverse().forEach(restore=>restore());throw error;}
}
export async function capturePrintJob(root,pages,settings,capture) {
  if(!root) throw new Error('Open the print page before exporting.');
  const sheets=[...root.querySelectorAll('.paper')];
  if(!pages.length||sheets.length!==pages.length) throw new Error('The print preview changed. Try again.');
  const indices=settings.pageIndices||pages.map((_,i)=>i);
  if(!indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=pages.length))throw new Error('Choose valid export pages.');
  const dpi=[300,600,1200].includes(settings.dpi)?settings.dpi:300;
  const result=[],imageCache=new Map();let done=0;const total=indices.reduce((n,i)=>n+pages[i].cards.length,0);
  for(const i of indices) {
    settings.signal?.throwIfAborted();await waitForPrintAssets(sheets[i]);
    const geometry=printGeometry(settings,pages[i]),nodes=[...sheets[i].querySelectorAll('.print-cell')];
    if(nodes.length!==geometry.cells.length) throw new Error('The print preview changed. Try again.');
    const cells=[];
    for(const cell of geometry.cells){
      const node=nodes.find(n=>Number(n.dataset.slot)===cell.slot),rect=node?.getBoundingClientRect();
      if(!rect?.width||!rect.height) throw new Error('A print card has no visible size. Reopen Print and try again.');
      settings.signal?.throwIfAborted();
      // Pin the capture root: percentage sizing must not depend on the preview grid
      // after html-to-image moves the clone into its SVG foreignObject.
      const restore=await embedPrintImages(node,imageCache);
      let image;
      try{image=await capture(node,{width:rect.width,height:rect.height,
        pixelRatio:dpi*cell.width/rect.width,backgroundColor:'#ffffff',
        style:{width:`${rect.width}px`,height:`${rect.height}px`,margin:'0',transform:'none',gridColumn:'auto',gridRow:'auto'},
        filter:n=>!n.classList?.contains('crop')&&!n.hasAttribute?.('data-print-control')});}finally{restore();}
      if(!/^data:image\/png;base64,[a-z\d+/=]+$/i.test(image)) throw new Error('A card could not be rendered for printing.');
      settings.signal?.throwIfAborted();cells.push({...cell,image});
      settings.onProgress?.({done:++done,total,page:i+1});
    }
    result.push({...geometry,cells});
  }
  return {width:settings.width,height:settings.height,pages:result};
}
// Last guard at both output boundaries: paper size must never shrink card trim.
export function validatePrintJob(job){
  if(!Number.isFinite(job.width)||!Number.isFinite(job.height)||job.width<=0||job.height<=0)throw new Error('Invalid paper size.');
  for(const page of job.pages){
    const bleed=page.bleed??0;
    if(!Number.isFinite(bleed)||bleed<0)throw new Error('Invalid print bleed.');
    for(const cell of page.cells){
      if(![cell.x,cell.y,cell.width,cell.height].every(Number.isFinite)||
        Math.abs(cell.width-2*bleed-CARD_WIDTH_IN)>1e-8||
        Math.abs(cell.height-2*bleed-CARD_HEIGHT_IN)>1e-8)
        throw new Error('Card trim must be exactly 63.5 × 88.9 mm. Export stopped to prevent incorrect sizing.');
      if(cell.x< -1e-8||cell.y< -1e-8||cell.x+cell.width>job.width+1e-8||cell.y+cell.height>job.height+1e-8)
        throw new Error('Full-size cards do not fit this paper. Choose larger paper or fewer cards per sheet.');
    }
  }
  return job;
}
export function printHTML(job) {
  validatePrintJob(job);
  const {width,height}=job;
  const pages=job.pages.map(page=>`<section class="sheet">${page.cells.map(c=>`<img alt="" src="${c.image}" style="left:${c.x}in;top:${c.y}in;width:${c.width}in;height:${c.height}in">`).join('')}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="stroke:${page.guideColor||'#464646'}">${page.lines.map(l=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}"/>`).join('')}${page.circles.map(c=>`<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"/>`).join('')}${(page.rects||[]).map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${r.fill||'none'}"/>`).join('')}${(page.texts||[]).map(t=>`<text x="${t.x}" y="${t.y}" fill="#222" stroke="none" font-size=".1" font-family="sans-serif">${escapeHTML(t.text)}</text>`).join('')}</svg></section>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>The Proxy Plane — Print</title><style>@page{size:${width}in ${height}in;margin:0}*{box-sizing:border-box;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}html,body{margin:0;padding:0;background:white;color:black}.sheet{position:relative;width:${width}in;height:${height}in;overflow:hidden;break-inside:avoid;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet>img{position:absolute;display:block;max-width:none}.sheet>svg{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#464646;stroke-width:.005;pointer-events:none}</style></head><body>${pages}</body></html>`;
}
export function addJobToPDF(pdf,job) {
  validatePrintJob(job);
  // Request 100% printing in viewers that honor PDF viewer preferences.
  pdf.viewerPreferences?.({PrintScaling:'None',PickTrayByPDFSize:true});
  job.pages.forEach((page,i)=>{
    if(i)pdf.addPage();
    for(const cell of page.cells)pdf.addImage(cell.image,'PNG',cell.x,cell.y,cell.width,cell.height);
    const color=page.guideColor||'#464646';pdf.setDrawColor(color);pdf.setLineWidth(.005);
    for(const l of page.lines)pdf.line(...l);
    for(const c of page.circles)pdf.circle(...c);
    for(const r of page.rects||[]){if(r.fill)pdf.setFillColor(r.fill);pdf.rect(r.x,r.y,r.width,r.height,r.fill?'FD':'S');}
    if(page.texts?.length){pdf.setTextColor('#222222');pdf.setFontSize(7.2);for(const t of page.texts)pdf.text(t.text,t.x,t.y);}
  });
  return pdf;
}
// Prepare in the active app tab. Opening a placeholder tab first can suspend
// the work that is supposed to fill it on mobile browsers.
export function printDocumentBlob(job) {
  const html=printHTML(job).replace('</style>',
    '.print-actions{padding:16px;font:16px sans-serif}.print-actions button{padding:12px;font:inherit}@media print{.print-actions{display:none!important}}</style>')
    .replace('<body>','<body><div class="print-actions"><button onclick="window.print()">Print sheets</button><p>Choose matching paper, Actual size / 100%, and headers and footers off. On iPhone you can also use Share → Print. Keep this window open until printing finishes.</p></div>');
  return new Blob([html],{type:'text/html'});
}

function escapeHTML(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function parsePageRange(value,count){
 if(!value.trim())return Array.from({length:count},(_,i)=>i);
 const result=new Set();
 for(const token of value.split(',')){
  const match=/^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(token);
  if(!match)throw new Error('Use page numbers like 1, 3-5.');
  const a=Number(match[1]),b=Number(match[2]||a);
  if(a<1||b<a||b>count)throw new Error(`Choose pages from 1 to ${count}.`);
  for(let i=a;i<=b;i++)result.add(i-1);
 }
 return [...result].sort((a,b)=>a-b);
}
export function calibrationJob(settings,flip='long',duplex=true){
 const {width,height,layout,bleed=0}=settings;
 if(!layout.capacity)throw new Error('Choose paper that fits at least one card.');
 const cards=Array.from({length:layout.capacity},(_,slot)=>({slot}));
 const sheets=[{side:'front',cards}];
 if(duplex)sheets.push({side:'back',cards:cards.map((c)=>({slot:backSlot(c.slot,layout.cols,layout.rows,flip,width>height),frontSlot:c.slot}))});
 return {width,height,pages:sheets.map(sheet=>{
  const g=printGeometry({...settings,guides:true,guideSides:'both'},sheet),rects=[],texts=[];
  g.cells.forEach((c,i)=>{const x=c.x+bleed,y=c.y+bleed;rects.push({x,y,width:CARD_WIDTH_IN,height:CARD_HEIGHT_IN});
   texts.push({x:x+.15,y:y+.3,text:`${sheet.side==='front'?'FRONT':'BACK'} ${(sheet.cards[i].frontSlot??sheet.cards[i].slot)+1}`},{x:x+.15,y:y+.5,text:'Trim: 2.5 x 3.5 in / 63.5 x 88.9 mm'});
   g.lines.push([x+.3,y+.9,x+1.3,y+.9],[x+.3,y+.84,x+.3,y+.96],[x+1.3,y+.84,x+1.3,y+.96]);
   texts.push({x:x+.15,y:y+1.15,text:'Measure line: 1 inch / 25.4 mm'});
   for(const [j,fill] of ['#00a6c8','#d43b8d','#efc900','#222222'].entries())rects.push({x:x+.2+j*.45,y:y+1.5,width:.35,height:.25,fill});
   texts.push({x:x+.15,y:y+2.1,text:'Color - Actual size / 100%'},{x:x+.15,y:y+2.3,text:'Duplex: match numbers through paper'});
  });return {...g,cells:[],rects,texts};
 })};
}
