export const FRAME_PRESETS = [
 ['modern','Modern-inspired'],['retro','Retro-inspired'],['classic','Classic-inspired'],
 ['fullart','Borderless / full art'],['extended','Extended art'],['showcase','Showcase-inspired'],
 ['future','Future-inspired'],['artifact','Artifact-inspired'],['kingdom','The Proxy Plane original'],['overlay','Uploaded frame overlay']
];
export const COLORS={white:'#c8bd97',blue:'#7199b2',black:'#58545f',red:'#bc7662',green:'#789577',gold:'#c8ad65',artifact:'#a6a6a0',colorless:'#c6c4bc',land:'#a68e71'};
export const LAYERS={
 name:{x:8,y:5,w:65,h:6,size:4.1,show:true},
 mana:{x:73,y:5,w:19,h:6,size:3.5,show:true},
 symbol:{x:85,y:57,w:7,h:5,size:4,show:true},
 watermark:{x:35,y:66,w:30,h:18,show:false},
 stamp:{x:44,y:90,w:12,h:3,show:false},
 flavor:{x:10,y:81,w:80,h:8,size:3.2,show:true},
 art:{x:7,y:13,w:86,h:43,show:true},
 type:{x:8,y:57,w:77,h:5,size:3.1,show:true},
 rules:{x:8,y:64,w:84,h:26,size:3.5,show:true},
 footer:{x:7,y:93,w:70,h:4,size:1.7,show:true},
 stats:{x:77,y:88,w:16,h:6,size:4,show:true},
};
export const isFullArt = card => ['fullart','showcase'].includes(card.frame)||card.layout==='textless';
export function layerSettings(card,key){
 const custom=card.customLayers?.find(l=>l.id===key);
 const result={...(LAYERS[key]||{x:10,y:20,w:80,h:15,size:4,show:true}),...custom};
 const full=isFullArt(card);
 const defaults={rotation:0,opacity:100,z:key==='art'?0:key==='watermark'?3:2,panel:(card.panelStyle?card.panelStyle!=='transparent':!full)&&['name','type','rules','stats'].includes(key),fill:card.panelColor||'#eee5cb',fillOpacity:100,color:card.textColor||(full?'#ffffff':'#17150f'),outline:full?'#000000':'#17150f',stroke:full?0.65:0,shadow:full?'soft':'none',weight:key==='name'?'bold':'normal',italic:key==='flavor',fontFamily:card.fontFamily||'Georgia, serif',align:card.textAlign||'left',lineHeight:card.lineHeight||1.22,spacing:0,borderColor:'#25231f',borderSize:0.35,rounding:1.4,fit:'cover',wrap:!['name','type','mana'].includes(key)};
 if(key==='footer')defaults.color='#ffffff';
 if(key==='mana')defaults.align='right';
 if(key==='stats')defaults.align='center';
 if(custom){defaults.panel=false;defaults.z=4;}
 if(key==='rules'&&card.flavor)result.h=16;
 if(key==='art'&&full)Object.assign(result,{x:0,y:0,w:100,h:100});
 if(card.frame==='extended'&&key==='art')Object.assign(result,{x:0,y:12,w:100,h:47});
 if(card.layout==='textless'&&['rules','type','flavor','symbol'].includes(key))result.show=false;
 return {...defaults,...result,...card.layers?.[key]};
}
const rgba=(hex,alpha)=>/^#[a-f0-9]{6}$/i.test(hex)?`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${alpha/100})`:hex;
export function layerStyle(card,key){
 const l=layerSettings(card,key);
 return {left:`${l.x}%`,top:`${l.y}%`,width:`${l.w}%`,height:`${l.h}%`,fontSize:`${l.size||3}cqw`,display:l.show?'flex':'none',transform:`rotate(${l.rotation}deg)`,transformOrigin:'top left',opacity:l.opacity/100,zIndex:l.z,color:l.color,fontFamily:l.fontFamily,fontWeight:l.weight,fontStyle:l.italic?'italic':'normal',textAlign:l.align,lineHeight:l.lineHeight,letterSpacing:`${l.spacing}cqw`,whiteSpace:l.wrap?'pre-wrap':'nowrap',WebkitTextStroke:l.stroke?`${l.stroke}cqw ${l.outline}`:'0 transparent',paintOrder:'stroke fill',textShadow:l.shadow==='soft'?'0 .3cqw .5cqw #000':l.shadow==='hard'?'.3cqw .3cqw 0 #000':'none',background:l.panel?rgba(l.fill,l.fillOpacity):'transparent',border:l.panel?`${l.borderSize}cqw solid ${l.borderColor}`:'none',borderRadius:l.panel?`${l.rounding}cqw`:0,boxShadow:'none'};
}

// Scryfall metadata identifies a treatment; it is not a frame-image template.
export function importedFrame(card){
 const effects=card.frame_effects||[];
 if(card.border_color==='borderless'||card.full_art)return 'fullart';
 if(effects.includes('extendedart'))return 'extended';
 if(effects.includes('showcase'))return 'showcase';
 return ({1993:'classic',1997:'retro',2003:'modern',2015:'modern',future:'future'})[card.frame]||'kingdom';
}
