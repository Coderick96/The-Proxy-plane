export const PACKS=[
 {id:'celestial',name:'Celestial Atlas',description:'Starlit portals and constellation card backs.',colors:['#111b39','#6bcbe1'],backs:['astral','eclipse']},
 {id:'gothic',name:'Midnight Cathedral',description:'Crimson glass and dark cathedral card backs.',colors:['#271726','#c75c7d'],backs:['cathedral','rose']},
 {id:'dragon',name:'Dragon Sovereign',description:'Molten scales and ancient dragon crest card backs.',colors:['#352215','#e7ab57'],backs:['ember','jade']}
];
export const THEMES=[{id:'classic',name:'Kingdom classic'},{id:'celestial',name:'Celestial'},{id:'gothic',name:'Midnight'},{id:'dragon',name:'Sovereign'}];
export const FREE_ACCESS={premium:false,studio:false,studioPassOwned:false,ownedPacks:[],packs:[],credits:0,walletCredits:0,dailyRemaining:0,dailyLimit:0,starterRemaining:0,starterLimit:10,monthlyRemaining:0,monthlyLimit:200,monthlyEndsAt:null,ownedDecks:[],cardLimit:1000,storageBytes:104857600,preview:false};
export const ownsPack=(access,id)=>Boolean(access?.premium||access?.packs?.includes(id)||(access?.studio&&['celestial','gothic','dragon'].includes(id)));
export const ownsBack=(access,back)=>back?.mode==='classic'||back?.mode==='none'||back?.mode==='inherit'||(back?.mode==='pack'&&ownsPack(access,back.pack));
export const STYLE_KEYS=['premiumPack','frame','frameColor','color','borderColor','borderWidth','panelColor','panelStyle','textColor','fontFamily','textAlign','lineHeight','layers','customLayers','frameOverlay','legendary','layout','back'];
export function styleFrom(card){return Object.fromEntries(STYLE_KEYS.filter(k=>card[k]!==undefined).map(k=>[k,structuredClone(card[k])]));}
export function applyStyle(card,style){return {...card,...styleFrom(style)};}
export function sanitizedRestore(current,snapshot){const {id,cloudOwnerId,collectionId,visibility,publishedAt,history,...design}=snapshot;return {...current,...design,id:current.id,cloudOwnerId:current.cloudOwnerId,collectionId:current.collectionId,visibility:current.visibility,publishedAt:current.publishedAt};}
