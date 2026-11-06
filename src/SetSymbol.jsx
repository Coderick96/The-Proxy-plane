import React from 'react';
import {RARITY_COLORS} from './setSymbols.js';
export default function SetSymbol({card}){
 if(card.setSymbolImage)return <img src={card.setSymbolImage} alt={card.setSymbolName||'Custom set symbol'}/>;
 if(card.setSymbolSvg?.nodes)return <svg className="pk-set-vector" xmlns="http://www.w3.org/2000/svg" viewBox={card.setSymbolSvg.viewBox||'0 0 100 100'} role="img" aria-label={card.setSymbolName||'Set symbol'} style={{color:card.layers?.symbol?.color||RARITY_COLORS[card.rarity||'rare']||RARITY_COLORS.rare,fill:'currentColor',WebkitTextStroke:0,textShadow:'none'}}>{card.setSymbolSvg.nodes.map((node,i)=><Shape key={i} node={node}/>)}</svg>;
 return <span style={{color:card.layers?.symbol?.color||RARITY_COLORS[card.rarity||'rare']}}>{card.setSymbol||'✦'}</span>;
}
const ALLOWED=new Set(['path','g','circle','ellipse','rect','polygon','polyline','line']);
function Shape({node}){if(!ALLOWED.has(node.tag))return null;const attrs={};for(const [key,value] of Object.entries(node.attrs||{}))if(['d','points','transform','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','fillRule','clipRule'].includes(key))attrs[key]=value;return React.createElement(node.tag,attrs,node.children?.map((child,i)=><Shape key={i} node={child}/>));}
