import React from 'react';import {createRoot} from 'react-dom/client';import {toPng} from 'html-to-image';import {rasterPrintCard} from '../src/printRaster.js';import {capturePrintJob,addJobToPDF,printDocumentBlob} from '../src/printOutput.js';import {getLayout} from '../src/printSettings.js';import PrintSheet from '../src/PrintSheet.jsx';import CardRenderer from '../src/CardRenderer.jsx';import '../src/styles.css';import '../src/printWorkbench.css';import {jsPDF} from 'jspdf';
const canvas=document.createElement('canvas');canvas.width=750;canvas.height=1050;let ctx=canvas.getContext('2d');ctx.fillStyle='#cb2942';ctx.fillRect(0,0,750,1050);ctx.fillStyle='#2266bb';ctx.fillRect(30,30,690,990);ctx.fillStyle='white';ctx.font='80px serif';ctx.fillText('PRINT TEST',100,400);const art=canvas.toDataURL();
const layout=getLayout(8.5,11);const sheets=[{sheet:1,side:'front',cards:Array.from({length:9},(_,slot)=>({slot,card:{id:String(slot),image:art}}))}];
const settings={width:8.5,height:11,layout,guides:true};
const root=createRoot(document.getElementById('root'));root.render(<div className="print-canvas"><div className="print-sheets print-stage">{sheets.map(sheet=><div className="preview-page" style={{width:300}} key={sheet.sheet}><PrintSheet sheet={sheet} layout={layout} paperWidth={8.5} paperHeight={11} renderFront={c=><img src={c.image}/>}/></div>)}</div></div>);
window.runCapture=async()=>{const job=await capturePrintJob(document.querySelector('.print-sheets'),sheets,settings,toPng);window.job=job;const img=new Image();img.src=job.pages[0].cells[0].image;await img.decode();const out=document.createElement('canvas');out.width=img.width;out.height=img.height;out.getContext('2d').drawImage(img,0,0);return {width:img.width,height:img.height,center:[...out.getContext('2d').getImageData(img.width/2,img.height/2,1,1).data]};};

window.runNative=async()=>{const job=await capturePrintJob(document.querySelector(".print-sheets"),sheets,settings,rasterPrintCard);window.job=job;const img=new Image();img.src=job.pages[0].cells[0].image;await img.decode();const out=document.createElement("canvas");out.width=img.width;out.height=img.height;out.getContext("2d").drawImage(img,0,0);return {width:img.width,height:img.height,center:[...out.getContext("2d").getImageData(img.width/2,img.height/2,1,1).data]};};

window.renderCustom=async()=>{
  const custom={name:'Mobile Test Mage',mana:'{1}{U}',type:'Creature — Wizard',rules:'Draw a card.',power:'2',toughness:'2',art,color:'blue',frame:'modern',layers:{}};
  root.render(<div className="print-canvas"><div className="print-sheets print-stage"><div className="preview-page" style={{width:300}}><PrintSheet sheet={sheets[0]} layout={layout} paperWidth={8.5} paperHeight={11} renderFront={()=><CardRenderer card={custom}/>}/></div></div></div>);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
};
window.runFallback=async()=>{
  const white=document.createElement('canvas');white.width=750;white.height=1050;white.getContext('2d').fillStyle='white';white.getContext('2d').fillRect(0,0,750,1050);
  const job=await capturePrintJob(document.querySelector('.print-sheets'),sheets,settings,(node,opts)=>rasterPrintCard(node,opts,async()=>white.toDataURL()));
  window.job=job;return job.pages[0].cells.length;
};
window.makePDF=()=>{const pdf=addJobToPDF(new jsPDF({unit:'in',format:[8.5,11]}),window.job);return pdf.output('datauristring');};
window.makePrintURL=()=>URL.createObjectURL(printDocumentBlob(window.job));

window.renderBlankBack=async()=>{
 const sheet={sheet:1,side:'back',cards:[{slot:0,card:{id:'blank-back',name:'Intentional blank'},back:{mode:'none',image:''}}]};
 window.blankBackSheet=sheet;
 root.render(<div className="print-canvas"><div className="print-sheets print-stage"><div className="preview-page" style={{width:300}}><PrintSheet sheet={sheet} layout={layout} paperWidth={8.5} paperHeight={11} renderFront={()=>null}/></div></div></div>);
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
};
window.runBlankBack=async()=>{
 let domCaptures=0;
 const job=await capturePrintJob(document.querySelector('.print-sheets'),[window.blankBackSheet],settings,(node,opts)=>rasterPrintCard(node,opts,async()=>{domCaptures++;throw new Error('None backing must not use DOM capture');}));
 const image=new Image();image.src=job.pages[0].cells[0].image;await image.decode();
 const output=document.createElement('canvas');output.width=image.width;output.height=image.height;output.getContext('2d').drawImage(image,0,0);
 return {width:image.width,height:image.height,center:[...output.getContext('2d').getImageData(image.width/2,image.height/2,1,1).data],domCaptures};
};
