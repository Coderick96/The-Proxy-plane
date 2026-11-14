import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const server=await createServer({root:new URL('../',import.meta.url).pathname,server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),origin='http://127.0.0.1:'+server.httpServer.address().port,external=[],api=[];
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){external.push(u.href);return route.abort();}if(u.pathname.startsWith('/api/')){api.push(u.pathname);return route.abort();}if(u.pathname==='/selfcheck-fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Real device worker self-check</title>'});return route.continue();});
 await page.goto(origin+'/selfcheck-fixture');
 const result=await page.evaluate(async()=>{const worker=new Worker('/src/deviceAi.worker.js',{type:'module'});return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.terminate();reject(Error('Real GPU self-check timed out'));},30000);worker.onmessage=({data})=>{if(['error','self-test-complete'].includes(data.type)){clearTimeout(timer);worker.terminate();resolve(data)}};worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Worker startup failed'))};worker.postMessage({type:'self-test',id:'real-selfcheck'});});});
 assert.equal(api.length,0);assert.equal(external.length,0,'Self-check must not fetch model weights or use external AI');
 if(result.type==='self-test-complete'){assert.equal(result.runtimeVerified,true);assert.equal(result.modelDownloaded,false);assert.equal(result.creditsSpent,0);}else assert.match(result.message,/compatible GPU|GPU runtime/);
 console.log(JSON.stringify({realWorker:true,modelGenerationTested:false,externalRequests:external.length,creditRequests:api.length,result}));
}finally{await browser?.close();await server.close();}
