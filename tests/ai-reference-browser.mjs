import {realpathSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const server=await createServer({root:new URL('../',import.meta.url).pathname,server:{host:'127.0.0.1',port:0,fs:{allow:[new URL('../',import.meta.url).pathname,realpathSync(new URL('../node_modules/',import.meta.url))]}}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin);
 const result=await page.evaluate(async()=>{
  const {prepareAIReference,MAX_AI_REFERENCE_CHARS}=await import('/src/aiReference.js');
  const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1200;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(2000,1200);
  for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=(i*13)%251;pixels.data[i+1]=(i*37+i%97)%253;pixels.data[i+2]=(i*41+i%113)%255;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);let source=canvas.toDataURL('image/png');
  // Padding the decoded PNG with trailing zero bytes keeps it decodable but forces the upload-size branch.
  if(source.length<=MAX_AI_REFERENCE_CHARS){const raw=atob(source.split(',')[1]);source='data:image/png;base64,'+btoa(raw+'\0'.repeat(3*1024*1024));}
  const compressed=await prepareAIReference(source),image=new Image();image.src=compressed;await image.decode();
  const broken='data:image/png;base64,'+'A'.repeat(MAX_AI_REFERENCE_CHARS+100);let error='';try{await prepareAIReference(broken)}catch(e){error=e.message}
  return {before:source.length,after:compressed.length,limit:MAX_AI_REFERENCE_CHARS,type:compressed.slice(0,23),width:image.naturalWidth,height:image.naturalHeight,error};
 });
 assert(result.before>result.limit);assert(result.after<=result.limit);assert(result.type.startsWith('data:image/jpeg;base64,'));assert(result.width<=1536&&result.height<=1536);assert(Math.abs(result.width/result.height-5/3)<.01);assert.match(result.error,/No credits were charged/);
 console.log('PASS actual Chromium AI reference resize, upload bound, aspect preservation and decode failure:',JSON.stringify(result));
 await context.close();
}finally{await browser?.close();await server.close();}
