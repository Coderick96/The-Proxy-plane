const path=d=>({tag:'path',attrs:{d}});
const circle=(cx,cy,r)=>({tag:'circle',attrs:{cx,cy,r}});
export const GENERIC_SYMBOLS=[
 {id:'pk-crown',name:'Kingdom Crown',viewBox:'0 0 100 100',nodes:[path('M8 22L30 43 50 12 70 43 92 22 82 76H18ZM18 82H82V91H18Z')]},
 {id:'pk-gate',name:'Portal Gate',viewBox:'0 0 100 100',nodes:[path('M12 90V48C12 0 88 0 88 48V90H68V48C68 25 32 25 32 48V90ZM36 87L50 57 64 87Z')]},
 {id:'pk-crystal',name:'Prism Crystal',viewBox:'0 0 100 100',nodes:[path('M50 3L83 27 92 60 50 97 8 60 17 27ZM50 17L31 31 50 77 69 31ZM24 39L20 57 39 75ZM76 39L61 75 80 57Z')]},
 {id:'pk-spark',name:'Arcane Spark',viewBox:'0 0 100 100',nodes:[path('M50 2L60 35 92 16 70 45 98 55 65 64 78 94 50 74 22 94 35 64 2 55 30 45 8 16 40 35Z')]},
 {id:'pk-moons',name:'Twin Moons',viewBox:'0 0 100 100',nodes:[path('M39 6C1 7 1 70 39 72 18 55 18 23 39 6ZM61 28C99 29 99 92 61 94 82 77 82 45 61 28Z'),circle(52,23,8),circle(48,77,8)]},
 {id:'pk-eye',name:'Dragon Eye',viewBox:'0 0 100 100',nodes:[path('M2 50Q50 0 98 50Q50 100 2 50ZM15 50Q50 17 85 50Q50 83 15 50ZM50 23L61 50 50 77 39 50Z')]},
 {id:'pk-shield',name:'Knight Shield',viewBox:'0 0 100 100',nodes:[path('M50 4L90 20V53Q90 79 50 98Q10 79 10 53V20ZM50 20L26 30V53Q26 68 50 81V20Z')]},
 {id:'pk-book',name:'Spellbook',viewBox:'0 0 100 100',nodes:[path('M6 18Q28 7 47 24V91Q27 75 6 84ZM94 18Q72 7 53 24V91Q73 75 94 84ZM17 33V39Q30 37 38 45V39Q30 31 17 33ZM83 33Q70 31 62 39V45Q70 37 83 39Z')]},
];
export function normalizeSets(data){
 if(!Array.isArray(data))throw new Error('Invalid set catalog.');
 return data.filter(s=>s&&typeof s.code==='string'&&typeof s.name==='string'&&/^https:\/\/svgs\.scryfall\.io\/sets\/[a-z0-9_-]+\.svg(?:\?[^\s]*)?$/i.test(s.icon_svg_uri||'')).map(s=>({id:s.id,code:s.code,name:s.name,icon_svg_uri:s.icon_svg_uri,set_type:s.set_type||'other',released_at:s.released_at||''})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function filterSets(sets,query='',type='all'){
 const q=query.trim().toLowerCase();return sets.filter(s=>(type==='all'||s.set_type===type)&&(!q||`${s.name} ${s.code}`.toLowerCase().includes(q)));
}
export const RARITY_COLORS={common:'#252525',uncommon:'#82909c',rare:'#bc963a',mythic:'#d76827'};
