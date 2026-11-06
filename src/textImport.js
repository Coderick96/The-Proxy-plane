export const IMPORT_FIELDS=[['name','Card name'],['type','Type line'],['rules','Rules text'],['flavor','Flavor text'],['mana','Mana cost'],['stats','Power / toughness']];
export function importCardText(current,source,face=0,enabled=IMPORT_FIELDS.map(([id])=>id)){
 const chosen=source.card_faces?.[face]||source;
 const values={name:chosen.name||source.name||'',type:chosen.type_line??source.type_line??'',rules:chosen.oracle_text??source.oracle_text??'',flavor:chosen.flavor_text??'',mana:chosen.mana_cost??'',power:chosen.power??'',toughness:chosen.toughness??''};
 const next={...current};
 for(const field of enabled){if(field==='stats'){next.power=values.power;next.toughness=values.toughness;}else if(['name','type','rules','flavor','mana'].includes(field))next[field]=values[field];}
 // Those layouts display their rules using a dedicated text field.
 if(enabled.includes('rules')&&current.layout==='planeswalker')next.abilities=values.rules;
 if(enabled.includes('rules')&&current.layout==='saga')next.chapters=values.rules;
 return next;
}
