// Optional browser smoke test: requires Playwright and an installed Chromium.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const {createApp}=await import('../server/index.js');
 const server=createApp({env:{SERVE_WEB:'true'}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://127.0.0.1:8790/health',route=>route.fulfill({json:{ready:true,hardware:{name:'Test GPU'},profile:{model:'sdxl',width:832,height:1216},message:'Hardware fixture; no actual inference.'}}));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:/Enter the workshop/}).click();
  await page.locator('summary').filter({hasText:'10 · AI artwork'}).click();
  await page.getByText('AI Art Studio',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Check this computer'}).click();
  await page.getByText(/Test GPU · SDXL/).waitFor();
  await page.getByPlaceholder('A moonlit elven ranger on a cliff above an ancient forest, painterly fantasy illustration…').fill('A moonlit mountain');
  await page.getByRole('button',{name:'Generate artwork · 1 credit',exact:true}).click();
  await page.getByText('Sign in to your Cardsmith account first.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Passed Chromium studio rendering, hardware-status UI and signed-out generation gate (hardware fixture; no inference).');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
