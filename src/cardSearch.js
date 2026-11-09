export const CARD_COLORS=[['w','White'],['u','Blue'],['b','Black'],['r','Red'],['g','Green'],['c','Colorless']];
export const CARD_RARITIES=[['common','Common'],['uncommon','Uncommon'],['rare','Rare'],['mythic','Mythic rare'],['special','Special'],['bonus','Bonus']];
export const EMPTY_CARD_FILTERS={set:'',colors:[],rarities:[]};
export function buildCardSearch(query='',filters=EMPTY_CARD_FILTERS){
 const parts=[];
 if(query.trim())parts.push(`(${query.trim()})`);
 if(/^[a-z0-9]+$/i.test(filters.set||''))parts.push(`set:${filters.set.toLowerCase()}`);
 const colors=CARD_COLORS.map(([id])=>id).filter(id=>filters.colors?.includes(id));
 const rarities=CARD_RARITIES.map(([id])=>id).filter(id=>filters.rarities?.includes(id));
 if(colors.length)parts.push(`(${colors.map(id=>`c:${id}`).join(' or ')})`);
 if(rarities.length)parts.push(`(${rarities.map(id=>`r:${id}`).join(' or ')})`);
 return parts.join(' ');
}
export function matchingSets(sets,query){const q=query.trim().toLowerCase();return sets.filter(s=>!q||s.name.toLowerCase().includes(q)||s.code.toLowerCase().includes(q)).sort((a,b)=>(b.released_at||'').localeCompare(a.released_at||'')||a.name.localeCompare(b.name));}
