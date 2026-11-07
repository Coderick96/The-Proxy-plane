// Independent QA browser checks. Uses isolated test tooling via NODE_PATH, never live services.
import {createRequire} from 'node:module';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=new URL('../',import.meta.url).pathname;
const out=new URL('../docs/qa/screenshots/',import.meta.url);
await mkdir(out,{recursive:true});
const results={kind:'Automated Chromium browser checks, not real-device or printer verification',viewports:[],flows:[],axe:[],errors:[]};
const server=await createServer({root,server:{port:0,host:'127.0.0.1'}});
await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 // All remote resources blocked: these checks must not call Scryfall, Stripe, AI, or Supabase.
 await context.route('**/*',route=>{
  const url=route.request().url();
  return url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:')?route.continue():route.abort();
 });
 await context.addInitScript(()=>{
  if(!localStorage.getItem('qa-print-fixture')){
   localStorage.setItem('qa-print-fixture','1');
   const canvas=document.createElement('canvas');canvas.width=750;canvas.height=1050;
   const c=canvas.getContext('2d');c.fillStyle='#2266bb';c.fillRect(0,0,750,1050);
   localStorage.setItem('pk-print-queue',JSON.stringify([{id:'qa-card',kind:'original',name:'Independent QA card',image:canvas.toDataURL('image/png')}]))
  }
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>results.errors.push(e.message));
 const goHome=async()=>{await page.goto(origin);await page.locator('#plane-title').waitFor();};
 const navigate=async(label)=>{await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();await page.locator('#main-navigation button').filter({hasText:label}).click();};
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:900});await goHome();
  await page.locator('.plane-showcase-card img').last().waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.plane-showcase-card img')].every(i=>i.complete&&i.naturalWidth>0));
  const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,images:[...document.querySelectorAll('.plane-showcase-card img')].every(i=>i.complete&&i.naturalWidth>0),actions:[...document.querySelectorAll('.plane-primary-actions button')].map(b=>({text:b.textContent.trim(),height:b.getBoundingClientRect().height})),motion:matchMedia('(prefers-reduced-motion: reduce)').matches}));
  assert(state.scroll<=width+1,`horizontal overflow ${width}: ${state.scroll}`);assert(state.images,'showcase assets load');assert(state.actions.every(a=>a.height>=44),'primary targets >=44px');assert(state.motion);
  await page.screenshot({path:new URL(`home-${width}.png`,out).pathname,fullPage:true});
  results.viewports.push({...state,screenshot:`screenshots/home-${width}.png`,status:'PASS'});
  const axe=await new AxeBuilder({page}).analyze();
  results.axe.push({width,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))});
 }
 await page.setViewportSize({width:390,height:844});await goHome();
 // Keyboard menu trap and Escape restore focus to the trigger.
 const menu=page.getByRole('button',{name:'Open navigation menu',exact:true});await menu.focus();await page.keyboard.press('Enter');
 assert.equal(await menu.getAttribute('aria-expanded'),'true');
 assert(await page.evaluate(()=>document.querySelector('#main-navigation').contains(document.activeElement)));
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'♧Premium Decks');
 await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert(await menu.evaluate(el=>document.activeElement===el));
 results.flows.push({name:'mobile menu keyboard focus, Tab cycle, Escape and return focus',status:'PASS'});
 for(const [button,heading] of [['Search Cards','Card Library'],['Create a Card','Custom Card Studio'],['Print Proxies','Print Studio']]){
  await goHome();await page.getByRole('button',{name:button,exact:true}).click();await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  const metrics=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,classes:typeof el.className==='string'?el.className:'',text:el.textContent?.slice(0,70),left:r.left,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth};}).filter(el=>el.right>innerWidth+1||el.left< -1).slice(0,30)}));
  results.flows.push({name:`home ${button} → ${heading}`,status:'PASS',responsive:metrics,statusResponsive:metrics.scroll<=metrics.viewport+1?'PASS':'FAIL'});
  const routeAxe=await new AxeBuilder({page}).analyze();results.axe.push({route:heading,width:390,violations:routeAxe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))});
 }
 for(const [label,expected] of [['My Vault','My collections'],['Gathering Plane','Gathering Plane'],['Premium','Build your signature style.']]){
  await goHome();await page.locator('.plane-destination').filter({hasText:label}).click();
  await page.getByRole('heading',{name:expected,exact:true}).waitFor();
  assert.equal(await page.locator('main#main-content').count(),1,'skip-link resolves to actual route main');
  assert.equal(await page.locator('main#main-content').getAttribute('tabindex'),'-1','route main receives programmatic focus');
  results.flows.push({name:`quick access ${label}`,status:'PASS'});
 }
 await goHome();await page.locator('.plane-destination').filter({hasText:'AI Art Studio'}).click();
 await page.getByRole('heading',{name:'Custom Card Studio',exact:true}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('details.editor-category')].some(el=>el.querySelector('summary')?.textContent.includes('10 · AI artwork')&&el.open),null,{timeout:15000});
 results.flows.push({name:'AI quick access opens actual artwork editor category',status:'PASS'});
 await goHome();await page.getByRole('button',{name:'Print Proxies',exact:true}).click();
 const direct=page.getByRole('button',{name:'Direct print',exact:true}),ready=page.getByRole('link',{name:'Open print sheets',exact:true});
 const prepare=async(phase)=>{
  results.phase=phase;
  try{
   await direct.click();
   await page.waitForFunction(()=>document.querySelector('.print-ready-panel a')||document.querySelector('.statusline')?.textContent.includes('Print preparation failed:'),null,{timeout:60000});
   if(!await ready.count())throw new Error(await page.locator('.statusline').innerText());
   const info=await ready.evaluate(async a=>{const r=await fetch(a.href),b=await r.blob();return{type:b.type,header:await b.slice(0,5).text(),size:b.size};});
   assert.equal(info.type,'application/pdf');assert.equal(info.header,'%PDF-');assert(info.size>1000);
   results.flows.push({name:`PDF preparation: ${phase}`,status:'PASS',...info});return info;
  }catch(error){
   results.preparationFailure={phase,status:await page.locator('.statusline').innerText().catch(()=>''),cells:await page.locator('.print-cell').count(),paper:await page.getByLabel('Paper size',{exact:true}).inputValue(),error:error.message};
   await page.screenshot({path:new URL('print-preparation-failure.png',out).pathname,fullPage:true}).catch(()=>{});
   throw error;
  }
 };
 const firstPDF=await prepare('initial direct print');results.flows.push({name:'Direct print creates real PDF through lazy capture/export imports',status:'PASS',...firstPDF});
 await page.getByLabel('Paper size',{exact:true}).selectOption('a4');assert.equal(await ready.count(),0);await prepare('A4 paper');
 await page.getByLabel('Paper size',{exact:true}).selectOption('custom');assert.equal(await ready.count(),0);await prepare('custom paper');
 await page.getByLabel('Width (in)',{exact:true}).fill('9');assert.equal(await ready.count(),0);await prepare('custom width9in');
 await page.locator('summary').filter({hasText:'03 ·'}).evaluate(el=>{el.parentElement.open=true;});
 await page.getByRole('combobox',{name:/^Export quality/}).selectOption('600');assert.equal(await ready.count(),0);
 await page.getByRole('combobox',{name:/^Export quality/}).selectOption('300');await prepare('reset DPI300 after600 invalidation');
 await page.getByLabel('Guide color',{exact:true}).fill('#ff0000');assert.equal(await ready.count(),0);await prepare('red cut guides');
 await page.locator('summary').filter({hasText:'02 · Card backs'}).evaluate(el=>{el.parentElement.open=true;});
 await page.getByRole('combobox',{name:/^Pages to print/}).selectOption('both');assert.equal(await ready.count(),0);await prepare('duplex both with explicit None backing');
 results.flows.push({name:'prepared PDF invalidated after paper, custom dimensions, DPI, guide color, and duplex settings changes',status:'PASS'});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'the-proxy-plane-sheets.pdf');
 results.flows.push({name:'Export PDF downloads expected filename',status:'PASS'});
 assert.deepEqual(results.errors,[]);
 results.summary='PASS browser layout/navigation/export assertions; inspect recorded axe violations separately';
 console.log(JSON.stringify(results,null,2));
} catch(error){results.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{await writeFile(new URL('../docs/qa/qa-mobile-print-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');await browser?.close();await server.close();}
