import {realpathSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const server=await createServer({root:new URL('../',import.meta.url).pathname,server:{host:'127.0.0.1',port:0,fs:{allow:[new URL('../',import.meta.url).pathname,realpathSync(new URL('../node_modules/',import.meta.url))]}}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';let generationCalls=0,popups=0;
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin&&url.pathname==='/src/backend.js')return route.fulfill({contentType:'application/javascript',body:`const session={user:{id:'ai-browser-owner',email:'fixture@example.invalid'},access_token:'mock-token'};export const backend={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})};`});
  if(url.origin===origin&&url.pathname==='/api/premium/access')return route.fulfill({json:{credits:10,policyVersion:30}});
  if(url.origin===origin&&url.pathname==='/api/ai/operations')return route.fulfill({json:{operations:[]}});
  if(url.origin===origin&&url.pathname==='/api/generate-art'){generationCalls++;const body=route.request().postDataJSON();return route.fulfill({json:{images:[image,image,image],creditsSpent:1,operationId:body.operationId}});}
  return url.origin===origin||url.protocol==='data:'||url.protocol==='blob:'?route.continue():route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('popup',()=>popups++);
 await page.goto(origin);await page.waitForFunction(()=>localStorage.getItem('pk-account:ai-browser-owner:projects')!==null);
 await page.locator('.plane-destination').filter({hasText:'AI Art Studio'}).click();
 const panel=page.locator('.integrated-art-studio');await panel.getByLabel('Describe your artwork').fill('A moonlit dragon over a mountain city');
 await panel.getByRole('button',{name:'Generate 3 choices · 1 credit',exact:true}).click();await panel.getByRole('button',{name:'Use option 2',exact:true}).waitFor();
 assert.equal(await panel.locator('.art-choice-grid img').count(),3);assert.equal(generationCalls,1);assert.equal(popups,0);
 await panel.getByRole('button',{name:'Use option 2',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('Selected artwork applied.'));
 assert.equal(popups,0);assert.equal(await panel.locator('.desktop-art-option').evaluate(el=>el.open),false);
 const scans=[];
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});const bounds=await panel.evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,right:el.getBoundingClientRect().right}));assert(bounds.scroll<=width+1);assert(bounds.right<=width+1);const axe=await new AxeBuilder({page}).include('.integrated-art-studio').analyze();assert.deepEqual(axe.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})),[]);scans.push({width,axeViolations:0});}
 assert.deepEqual(errors,[]);console.log('PASS actual App integrated artwork generation/three choices/apply without popups; 390/768/1440 overflow and scoped axe checks:',JSON.stringify({generationCalls,popups,scans,kind:'Mock auth and image API; no real provider or credits'}));
 await context.close();
}finally{await browser?.close();await server.close();}
