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

export const CARD_SORTS=[
 {id:'released-desc',label:'Newest first',order:'released',dir:'desc'},
 {id:'price-asc',label:'Price: low to high',order:'usd',dir:'asc'},
 {id:'price-desc',label:'Price: high to low',order:'usd',dir:'desc'},
 {id:'mana-asc',label:'Mana value: low to high',order:'cmc',dir:'asc'},
 {id:'mana-desc',label:'Mana value: high to low',order:'cmc',dir:'desc'}
];
export function cardSearchUrl(query,filters,sortId='released-desc'){
 const sort=CARD_SORTS.find(s=>s.id===sortId)||CARD_SORTS[0];
 const q=buildCardSearch(query,filters)||'game:paper';
 return `https://api.scryfall.com/cards/search?${new URLSearchParams({q,unique:'cards',order:sort.order,dir:sort.dir})}`;
}

export function cardPriceLabel(card){const value=card.prices?.usd;return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?`$${Number(value).toFixed(2)} USD`:'USD price unavailable';}
