import {createRequire} from 'node:module';
import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=await createServer({root:new URL('../',import.meta.url).pathname,server:{port:0,host:'127.0.0.1'}});
await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.PRINT_BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/print-browser.html`);
 await page.waitForFunction(()=>window.runNative&&document.querySelectorAll('.print-cell').length===9);
 const pixels=await page.evaluate(()=>window.runNative());assert.deepEqual(pixels,{width:750,height:1050,center:[34,102,187,255]});
 const pdf=await page.evaluate(()=>window.makePDF());await mkdir('/tmp/proxy-print-qa',{recursive:true});await writeFile('/tmp/proxy-print-qa/imports.pdf',Buffer.from(pdf.split(',')[1],'base64'));
 const url=await page.evaluate(()=>window.makePrintURL());await page.goto(url);
 assert.equal(await page.locator('.sheet > img').count(),9);assert.equal(await page.locator('button').innerText(),'Print sheets');
 await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth===750));
 await page.evaluate(()=>{window.print=()=>window.printCalled=true;});await page.locator('button').click();assert.equal(await page.evaluate(()=>window.printCalled),true);
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/print-browser.html`);await page.waitForFunction(()=>window.renderCustom);await page.evaluate(()=>window.renderCustom());
 assert.equal(await page.evaluate(()=>window.runFallback()),9);
 const customPDF=await page.evaluate(()=>window.makePDF());await writeFile('/tmp/proxy-print-qa/custom-fallback.pdf',Buffer.from(customPDF.split(',')[1],'base64'));
 // Exercise the app buttons with a queued image, without signing into an account.
 await page.evaluate(()=>localStorage.setItem('pk-print-queue',JSON.stringify([{id:'test-copy',kind:'original',name:'Browser QA',image:window.job.pages[0].cells[0].image}])));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.locator('.main-nav button').filter({hasText:'Print'}).click();
 await page.getByRole('button',{name:'Direct print',exact:true}).click();
 await page.getByRole('link',{name:'Open print sheets',exact:true}).waitFor();
 const popupEvent=page.waitForEvent('popup');await page.getByRole('link',{name:'Open print sheets',exact:true}).click();const popup=await popupEvent;
 const type=await page.evaluate(async()=>{const r=await fetch(document.querySelector('.print-ready-panel a').href);const blob=await r.blob();return {type:blob.type,header:await blob.slice(0,5).text()};});assert.deepEqual(type,{type:'application/pdf',header:'%PDF-'});await popup.close();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'the-proxy-plane-sheets.pdf');
 assert.deepEqual(errors,[]);
 console.log('Browser pixels verified at 390px viewport: 9 imported cards at 750×1050, populated print document and clickable print button, custom-card fallback with 9 rendered cards. PDFs saved for rendered-page inspection.');
}finally{await browser?.close();await server.close();}
