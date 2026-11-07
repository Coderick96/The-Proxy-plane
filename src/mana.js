export const PAIRS=['W/U','W/B','U/B','U/R','B/R','B/G','R/G','R/W','G/W','G/U'];
const colors=[['W','White'],['U','Blue'],['B','Black'],['R','Red'],['G','Green']];
export const MANA_GROUPS=[
 ['numbers','Generic numbers',Array.from({length:101},(_,n)=>[String(n),String(n)]).concat([['1000000','1,000,000']])],
 ['colors','Colored, colorless & snow',[...colors,['C','Colorless'],['S','Snow']]],
 ['variables','Variable & special costs',[['X','X'],['Y','Y'],['Z','Z'],['∞','Infinity'],['½','One-half']]],
 ['hybrid','Two-color hybrid',PAIRS.map(x=>[x,x])],
 ['mono','Two generic / color',colors.map(([x,label])=>[`2/${x}`,`2 / ${label}`])],
 ['colorless','Colorless hybrid',colors.map(([x,label])=>[`C/${x}`,`Colorless / ${label}`])],
 ['phyrexian','Phyrexian',[...colors.map(([x,label])=>[`${x}/P`,`${label} Phyrexian`]),['P','Phyrexian']]],
 ['hybrid-phyrexian','Hybrid Phyrexian',PAIRS.map(x=>[`${x}/P`,`${x} Phyrexian`])],
 ['half','Half-colored mana',colors.map(([x,label])=>[`H${x}`,`Half ${label}`])],
 ['actions','Rules symbols (tap, energy, etc.)',[['T','Tap'],['Q','Untap'],['E','Energy'],['TK','Ticket'],['CHAOS','Chaos'],['A','Acorn'],['P','Phyrexian']]],
];
export function appendMana(cost,token,count=1){return String(cost||'')+`{${token}}`.repeat(Math.max(1,Math.min(20,Number(count)||1)));}
export function removeLastMana(cost){return String(cost||'').replace(/\{[^{}]+\}\s*$/,'');}
export function symbolClass(token){
 const t=token.toLowerCase();
 if(/^\d+$/.test(t))return +t<=20||['100','1000000'].includes(t)?t:null;
 const aliases={t:'tap',q:'untap','∞':'infinity','infinity':'infinity','½':'1-2','1/2':'1-2',a:'acorn',tk:'ticket',chaos:'chaos'};
 if(aliases[t])return aliases[t];
 if(/^[wubrgcsxyzep]$/.test(t))return t;
 if(/^(?:[wubrg]\/p|2\/[wubrg]|c\/[wubrg])$/.test(t))return t.replace('/','');
 const phy=t.endsWith('/p');const pair=phy?t.slice(0,-2):t;
 const canonical=PAIRS.find(x=>x.toLowerCase()===pair||x.toLowerCase().split('/').reverse().join('/')===pair);
 return canonical?canonical.toLowerCase().replace('/','')+(phy?'p':''):null;
}
