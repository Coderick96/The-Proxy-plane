import {jsPDF} from 'jspdf';
import {addJobToPDF,capturePrintJob,validatePrintJob} from './printOutput.js';
import {printMemoryLimits,checkPrintRasterBudget} from './printMemory.js';

function newPDF(width,height){return new jsPDF({unit:'in',format:[width,height],orientation:width>height?'landscape':'portrait'});}
// Vector-only calibration and existing callers use the same physical geometry.
export function createPrintPDF(job){return addJobToPDF(newPDF(job.width,job.height),job);}
// Consume one lossless card at a time; never retain every page's PNGs beside the PDF.
export async function capturePrintPDF(root,pages,settings,capture){
 const limits=settings.memoryLimits||printMemoryLimits();checkPrintRasterBudget(settings,limits);
 let pdf=newPDF(settings.width,settings.height);let pageCount=0,rasterBytes=0;
 try{
  const job=await capturePrintJob(root,pages,{...settings,memoryLimits:limits,
   onPageStart:geometry=>{
    validatePrintJob({width:settings.width,height:settings.height,pages:[geometry]});
    if(pageCount++)pdf.addPage();
   },
   imageSink:cell=>{
    // Count encoded input rather than allocating an output Blob just to measure it.
    rasterBytes+=Math.ceil((cell.image.length-cell.image.indexOf(',')-1)*3/4);
    if(rasterBytes>limits.maxRasterBytes)throw new Error('This PDF is too large for safe export on this device. Export fewer pages using the page range, or choose 300 DPI. Your cards are unchanged.');
    settings.signal?.throwIfAborted();
    pdf.addImage(cell.image,'PNG',cell.x,cell.y,cell.width,cell.height,undefined,'FAST');
   },
   onPageEnd:geometry=>addJobToPDF(pdf,{width:settings.width,height:settings.height,pages:[{...geometry,cells:[]}]})
  },capture);
  settings.signal?.throwIfAborted();return {pdf,qualityWarnings:job.qualityWarnings};
 }catch(error){
  // Drop compressed image references promptly when canceling or exceeding a budget.
  // The partial document is never offered for download.
  pdf=null;throw error;
 }
}
