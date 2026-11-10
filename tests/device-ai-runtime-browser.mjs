import {createServer} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname,server=await createServer({root,server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const origin='http://127.0.0.1:'+server.httpServer.address().port;
 const results=[];
 for(const broken of [true,false]){
  const context=await browser.newContext();await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/runtime-probe')return r.fulfill({contentType:'text/html',body:'<!doctype html><title>Runtime regression</title>'});return r.continue()});
  const page=await context.newPage();await page.goto(origin+'/runtime-probe');const result=await page.evaluate(async broken=>(await import('/tests/fixtures/device-runtime-probe.js')).probeRuntime(broken),broken);results.push({broken,...result});await context.close();
 }
 assert(!results.some(r=>r.blocked),'A real browser adapter is required for this runtime regression');assert.equal(results[0].ok,false);assert.match(results[0].error,/webgpuInit is not a function/);assert.equal(results[1].ok,true,JSON.stringify(results[1]));assert.equal(results[1].expectedOutput,3.5);
 console.log('PASS genuine ORT/WebGPU initialization regression: old JSEP reproduces reported webgpuInit failure; matched Asyncify executes ONNX Add =3.5 using a real software GPU backend. This is not diffusion/physical-GPU validation.',JSON.stringify(results));
}finally{await browser?.close();await server.close()}
