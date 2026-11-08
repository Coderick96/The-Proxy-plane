// Treat fetched SVGs as geometry only. Never inject fetched markup into the DOM.
export function parseSetSvg(text,Parser=DOMParser){
 if(typeof text!=='string'||text.length>500000)throw new Error('Invalid symbol image.');
 const doc=new Parser().parseFromString(text,'image/svg+xml');const root=doc.documentElement;
 if(root.localName!=='svg'||doc.querySelector('parsererror'))throw new Error('Could not read this set symbol.');
 const allowed=new Set(['path','g','circle','ellipse','rect','polygon','polyline','line']);
 const attrNames={d:'d',points:'points',transform:'transform',x:'x',y:'y',x1:'x1',x2:'x2',y1:'y1',y2:'y2',cx:'cx',cy:'cy',r:'r',rx:'rx',ry:'ry',width:'width',height:'height','fill-rule':'fillRule','clip-rule':'clipRule'};
 function node(el){if(!allowed.has(el.localName))return null;const attrs={};for(const [attr,key] of Object.entries(attrNames))if(el.hasAttribute(attr))attrs[key]=el.getAttribute(attr);return {tag:el.localName,attrs,children:[...el.children].map(node).filter(Boolean)};}
 const nodes=[...root.children].map(node).filter(Boolean);if(!nodes.length)throw new Error('No supported geometry in this symbol.');
 let viewBox=root.getAttribute('viewBox');if(!viewBox){const w=parseFloat(root.getAttribute('width')),h=parseFloat(root.getAttribute('height'));if(!w||!h)throw new Error('Symbol has no valid dimensions.');viewBox=`0 0 ${w} ${h}`;}
 if(!/^[-+\d.eE,\s]+$/.test(viewBox))throw new Error('Invalid symbol dimensions.');
 return {viewBox,nodes};
}
