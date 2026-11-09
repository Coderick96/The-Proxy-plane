import {jsPDF} from 'jspdf';
import {addJobToPDF} from './printOutput.js';

// Direct print and download share exactly the same physical PDF page/card boxes.
export function createPrintPDF(job){
  const pdf=new jsPDF({unit:'in',format:[job.width,job.height],orientation:job.width>job.height?'landscape':'portrait'});
  return addJobToPDF(pdf,job);
}
