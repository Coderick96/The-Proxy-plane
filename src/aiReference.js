// Keep the complete JSON request comfortably below hosted-function upload limits.
export const MAX_AI_REFERENCE_CHARS=2621440;
export async function prepareAIReference(source){
 if(typeof source!=='string'||source.length>20*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source))throw new Error('Choose a valid PNG, JPEG or WebP reference image. No credits were charged.');
 if(source.length<=MAX_AI_REFERENCE_CHARS)return source;
 const image=new Image(),canvas=document.createElement('canvas');
 try{
  image.src=source;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Invalid reference image.');
  const context=canvas.getContext('2d');if(!context)throw new Error('Image resizing is unavailable.');
  let scale=Math.min(1,1536/Math.max(image.naturalWidth,image.naturalHeight));
  for(let attempt=0;attempt<5;attempt++){
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   const result=canvas.toDataURL('image/jpeg',.9-attempt*.1);
   if(result.startsWith('data:image/jpeg;base64,')&&result.length<=MAX_AI_REFERENCE_CHARS)return result;
   scale*=.75;
  }
  throw new Error('Reference remains too large.');
 }catch{throw new Error('This reference could not be prepared for upload. Choose a smaller image. No credits were charged.');}
 finally{image.src='';canvas.width=0;canvas.height=0;}
}
