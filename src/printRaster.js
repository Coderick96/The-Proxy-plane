import {toPng,toCanvas} from 'html-to-image';

// Full card images do not need a DOM screenshot. Draw decoded pixels directly;
// this avoids SVG foreignObject rasterization entirely for imports and backs.
export async function rasterPrintCard(node,options,captureDOM=toPng) {
  // An explicitly selected None backing is deliberately white, unlike a failed card capture.
  if(node.dataset?.printBlankBack==='true'){
    const canvas=node.ownerDocument.createElement('canvas');
    canvas.width=Math.round(options.width*options.pixelRatio);
    canvas.height=Math.round(options.height*options.pixelRatio);
    const context=canvas.getContext('2d');
    if(!context)throw new Error('The browser could not prepare blank backing pixels.');
    context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
    const image=canvas.toDataURL('image/png');canvas.width=canvas.height=1;return image;
  }
  const trim=node.querySelector('.sheet-card');
  const fullImage=trim?.querySelector(':scope > img, :scope > .card-back > img');
  if(!fullImage){
    let png,blank;
    if(captureDOM===toPng){
      const canvas=await toCanvas(node,options);
      try{blank=isBlankCanvas(canvas,node.ownerDocument);if(!blank)png=canvas.toDataURL('image/png');}
      finally{canvas.width=canvas.height=1;}
    }else{png=await captureDOM(node,options);blank=await isBlankRaster(png,node.ownerDocument);}
    if(blank){
      // Some mobile engines decode a foreignObject SVG without painting it.
      // Fall back to a DOM renderer that paints directly onto canvas.
      const {default:html2canvas}=await import('html2canvas');
      const descendants=[node,...node.querySelectorAll('*')];
      const fonts=descendants.map(el=>{const style=getComputedStyle(el);return {fontSize:style.fontSize,lineHeight:style.lineHeight};});
      const canvas=await html2canvas(node,{
        backgroundColor:'#ffffff',scale:options.pixelRatio,width:options.width,height:options.height,
        useCORS:true,logging:false,ignoreElements:el=>el.hasAttribute('data-print-control'),
        onclone:(_doc,clone)=>{
          [clone,...clone.querySelectorAll('*')].forEach((el,i)=>{if(fonts[i])Object.assign(el.style,fonts[i]);});
          Object.assign(clone.style,options.style);
        }
      });
      try{
        if(isBlankCanvas(canvas,node.ownerDocument))throw new Error('This browser produced a blank custom card. Open this site in Safari or Chrome and retry.');
        png=canvas.toDataURL('image/png');
      }finally{canvas.width=canvas.height=1;}
    }
    return png;
  }
  const image=new Image();image.src=fullImage.currentSrc||fullImage.src;
  let canvas;try{
  await image.decode();
  if(!image.naturalWidth)throw new Error('Card artwork could not be decoded for printing.');
  canvas=node.ownerDocument.createElement('canvas');
  canvas.width=Math.round(options.width*options.pixelRatio);
  canvas.height=Math.round(options.height*options.pixelRatio);
  const context=canvas.getContext('2d');
  if(!context)throw new Error('The browser could not prepare card pixels.');
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
  const outer=node.getBoundingClientRect(),box=trim.getBoundingClientRect();
  const x=(box.left-outer.left)/outer.width*canvas.width,y=(box.top-outer.top)/outer.height*canvas.height;
  const w=box.width/outer.width*canvas.width,h=box.height/outer.height*canvas.height;
  // Bleed is an enlarged copy behind the trim, matching the preview.
  if(node.querySelector('.bleed-art'))context.drawImage(image,0,0,canvas.width,canvas.height);
  context.save();context.beginPath();context.rect(x,y,w,h);context.clip();
  if(fullImage.parentElement.classList.contains('card-back')){
    const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);
    const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
    context.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
  }else context.drawImage(image,x,y,w,h);
  context.restore();
  const result=canvas.toDataURL('image/png');
  return result;
  }finally{if(canvas)canvas.width=canvas.height=1;image.src='';}
}

function isBlankCanvas(image,doc){
 const sample=doc.createElement('canvas');sample.width=sample.height=64;
 try{
  const ctx=sample.getContext('2d');ctx.drawImage(image,0,0,64,64);
  const data=ctx.getImageData(0,0,64,64).data;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>16&&(data[i]<248||data[i+1]<248||data[i+2]<248))return false;
  return true;
 }finally{sample.width=sample.height=1;}
}
async function isBlankRaster(png,doc){
 const img=new Image();
 try{img.src=png;await img.decode();return isBlankCanvas(img,doc);}
 finally{img.src='';}
}
