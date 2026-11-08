import {createRequire} from 'node:module';
import {createServer} from 'vite';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=await createServer({root:new URL('../',import.meta.url).pathname,server:{port:0,host:'127.0.0.1'}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await page.goto(origin);await page.getByRole('button',{name:'Create a Card',exact:true}).click();await page.getByRole('heading',{name:'Custom Card Studio',exact:true}).waitFor();
 console.log(JSON.stringify(await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{tag:el.tagName,classes:typeof el.className==='string'?el.className:'',text:el.textContent?.slice(0,70),left:r.left,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth,minWidth:s.minWidth,padding:s.padding,overflow:s.overflow};}).filter(el=>el.right>innerWidth+1||el.left< -1).slice(0,50)})),null,2));
}finally{await browser?.close();await server.close();}
