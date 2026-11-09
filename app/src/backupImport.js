// Validate before any React state update. Legacy backups may omit newer sections.
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=path=>{throw new Error(`Invalid backup: ${path}. No data was imported.`)};
const optional=(v,key,type,path)=>{if(v[key]!==undefined&&v[key]!==null&&typeof v[key]!==type)fail(`${path}.${key} must be ${type}`)};
function jsonTree(value,path='backup',depth=0){
 if(depth>40)fail(`${path} is nested too deeply`);
 if(value===null||['string','boolean'].includes(typeof value))return;
 if(typeof value==='number'){if(!Number.isFinite(value))fail(path);return;}
 if(Array.isArray(value)){value.forEach((v,i)=>jsonTree(v,`${path}[${i}]`,depth+1));return;}
 if(!object(value))fail(path);
 for(const [key,v] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))fail(`${path} contains a reserved key`);jsonTree(v,`${path}.${key}`,depth+1);}
}
function record(v,path){if(!object(v)||typeof v.id!=='string'||!v.id.trim())fail(`${path} needs a nonempty string id`)}
function list(v,path,check,max=10000){if(!Array.isArray(v)||v.length>max)fail(`${path} must be an array with at most ${max} records`);v.forEach((x,i)=>check(x,`${path}[${i}]`))}
function flat(v,path){if(!object(v))fail(`${path} must be an object`);for(const [k,x] of Object.entries(v))if(x!==null&&!['string','boolean','number'].includes(typeof x))fail(`${path}.${k} must be a scalar`)}
function svgNode(v,path){if(!object(v)||typeof v.tag!=='string')fail(path);if(v.attrs!==undefined)flat(v.attrs,path+'.attrs');if(v.children!==undefined)list(v.children,path+'.children',svgNode,10000)}
function design(v,path){
 if(!object(v))fail(`${path} must be an object`);
 for(const key of ['name','mana','type','rules','flavor','artist','art','image','frame','layout','color','borderColor','textColor','panelColor','panelStyle','frameColor','fontFamily','textAlign','statMode','abilities','chapters','frameOverlay','watermarkImage','stampImage','setSymbol','setSymbolImage','setSymbolName','rarity','language','setCode','artPosition','visibility','collectionId','cloudOwnerId','publishedAt','savedAt','artStoragePath','premiumPack','kind','set','aiSet','setLore'])optional(v,key,'string',path);
 // Stats and collector numbers from older exports can be strings or numbers.
 for(const key of ['power','toughness','loyalty','defense','collector'])if(v[key]!=null&&!['string','number'].includes(typeof v[key]))fail(`${path}.${key} must be text or a number`);
 for(const key of ['borderWidth','zoom','artX','artY','artPanX','artPanY','artBrightness','artContrast','artSaturation','artHue','artBlur','watermarkOpacity','lineHeight'])optional(v,key,'number',path);
 optional(v,'legendary','boolean',path);
 if(v.layers!=null){if(!object(v.layers))fail(`${path}.layers must be an object`);for(const [key,layer] of Object.entries(v.layers))flat(layer,`${path}.layers.${key}`);}
 if(v.customLayers!=null)list(v.customLayers,path+'.customLayers',(l,p)=>{record(l,p);flat(l,p);for(const key of ['kind','text','image','label'])optional(l,key,'string',p)},1000);
 if(v.back!=null){flat(v.back,path+'.back');for(const key of ['mode','image','imageStoragePath','pack','design'])optional(v.back,key,'string',path+'.back');}
 if(v.origin!=null){flat(v.origin,path+'.origin');for(const key of ['provider','creator','sourceUrl'])optional(v.origin,key,'string',path+'.origin');optional(v.origin,'rightsConfirmed','boolean',path+'.origin');}
 if(v.setSymbolSvg!=null){if(!object(v.setSymbolSvg))fail(path+'.setSymbolSvg');optional(v.setSymbolSvg,'viewBox','string',path+'.setSymbolSvg');list(v.setSymbolSvg.nodes,path+'.setSymbolSvg.nodes',svgNode,10000);}
}
const card=(v,p)=>{record(v,p);design(v,p)};
const named=(v,p)=>{record(v,p);if(typeof v.name!=='string')fail(`${p}.name must be text`)};
const profile=(v,p)=>{named(v,p);for(const key of ['paperId','orientation','mediaId','duplexFlip','printerId'])if(typeof v[key]!=='string')fail(`${p}.${key} must be text`);for(const key of ['bleed','backX','backY','margin','customWidth','customHeight'])if(typeof v[key]!=='number')fail(`${p}.${key} must be a number`);if(typeof v.registration!=='boolean')fail(`${p}.registration must be boolean`);for(const [k,x] of Object.entries(v)){if(x!==null&&!['string','boolean','number'].includes(typeof x))fail(`${p}.${k} must be a scalar`);}for(const key of ['bleed','backX','backY','frontX','frontY','gap','dpi','margin','customWidth','customHeight'])optional(v,key,'number',p);optional(v,'registration','boolean',p);optional(v,'guides','boolean',p);for(const key of ['guideStyle','guideSides','guideColor'])optional(v,key,'string',p)};
export function validateBackup(value){
 if(!object(value))fail('root must be an object');jsonTree(value);
 const sections=['projects','printQueue','collections','templates','versions','printProfiles','deckDraft'];
 if(!sections.some(k=>Object.hasOwn(value,k)))fail('no recognized backup sections');
 if(value.version!==undefined&&(!Number.isInteger(value.version)||value.version<1||value.version>4))fail('unsupported backup version');
 for(const key of ['projects','printQueue'])if(value[key]!==undefined)list(value[key],key,card,key==='printQueue'?2000:10000);
 if(value.collections!==undefined)list(value.collections,'collections',(v,p)=>{named(v,p);optional(v,'visibility','string',p)});
 if(value.templates!==undefined)list(value.templates,'templates',(v,p)=>{named(v,p);design(v.style,p+'.style')},100);
 if(value.printProfiles!==undefined)list(value.printProfiles,'printProfiles',profile,30);
 if(value.versions!==undefined){if(!object(value.versions))fail('versions must be an object');for(const [id,items] of Object.entries(value.versions))list(items,'versions.'+id,(v,p)=>{record(v,p);optional(v,'date','string',p);card(v.card,p+'.card')},20);}
 if(value.deckDraft!==undefined){if(!object(value.deckDraft)||typeof value.deckDraft.text!=='string'||value.deckDraft.text.length>200000||value.deckDraft.url!==undefined&&(typeof value.deckDraft.url!=='string'||value.deckDraft.url.length>2000))fail('deckDraft must contain text and an optional URL');}
 return value;
}
// Existing local records win conflicts; restore is idempotent, including queue IDs.
const mergeIds=(current,incoming=[])=>{const records=new Map();for(const v of [...current,...incoming])if(!records.has(v.id))records.set(v.id,v);return [...records.values()]};
export function mergeBackup(current,backup,cardLimit=1000){
 const next={...current};
 for(const key of ['projects','printQueue','collections','templates','printProfiles'])if(backup[key]!==undefined)next[key]=mergeIds(current[key],backup[key]);
 if(next.projects.length>cardLimit&&next.projects.length>current.projects.length)fail('not enough vault space');
 if(next.printQueue.length>2000||next.templates.length>100||next.printProfiles.length>30)fail('merged data exceeds workspace limits');
 if(backup.versions!==undefined){next.versions={...current.versions};for(const [id,items] of Object.entries(backup.versions))next.versions[id]=mergeIds(current.versions[id]||[],items).slice(0,20);}
 if(backup.deckDraft!==undefined)next.deckDraft={text:backup.deckDraft.text,url:backup.deckDraft.url||''};
 return next;
}
