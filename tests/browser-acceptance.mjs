import assert from 'node:assert/strict';
export function assertBrowserAcceptance(results){
 assert.equal(results.axe.length,6,'All six route/viewport accessibility scans must complete.');
 assert.deepEqual(results.axe.filter(scan=>scan.violations.length),[],'Accessibility violations must fail browser QA.');
 const routes=results.flows.filter(flow=>flow.responsive);
 assert.equal(routes.length,3,'All three primary routes must have responsive measurements.');
 assert(routes.every(flow=>flow.statusResponsive==='PASS'&&flow.responsive.scroll<=flow.responsive.viewport+1),'Route overflow must fail browser QA.');
 assert.deepEqual(results.errors,[],'Browser page errors must fail QA.');
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const good={axe:Array.from({length:6},()=>({violations:[]})),flows:Array.from({length:3},()=>({responsive:{scroll:390,viewport:390},statusResponsive:'PASS'})),errors:[]};
 assertBrowserAcceptance(good);
 const broken=mutate=>{const value=structuredClone(good);mutate(value);assert.throws(()=>assertBrowserAcceptance(value))};
 broken(v=>v.axe[0].violations.push({id:'button-name'}));
 broken(v=>v.axe.pop());
 broken(v=>v.flows[0].responsive.scroll=450);
 broken(v=>v.flows[0].statusResponsive='FAIL');
 broken(v=>v.flows.pop());
 broken(v=>v.errors.push('Uncaught rendering error'));
 console.log('PASS browser QA gate rejects accessibility findings, incomplete scans, route overflow and page errors instead of recording a false pass.');
}
