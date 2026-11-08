import React,{useState,useRef} from 'react';
import CardRenderer from './CardRenderer.jsx';
import {LAYERS,layerSettings} from './cardModel.js';
import {dragGeometry,clamp} from './previewMath.js';
import ColorPicker from './ColorPicker.jsx';

export default function InteractivePreview({card,onChange,previewRef,selected='name',onSelect}){
 const [zoom,setZoom]=useState(100);const [mode,setMode]=useState('layers');const [showHandles,setShowHandles]=useState(true);
 const canvas=useRef(null);const gesture=useRef(null);
 const full=['fullart','showcase'].includes(card.frame)||card.layout==='textless';const border=card.borderWidth??(full?0:2.5);
 const entries=[...Object.keys(LAYERS).map(id=>({id,label:id[0].toUpperCase()+id.slice(1)})),...(card.customLayers||[]).map(l=>({id:l.id,label:l.label}))];
 const key=entries.some(l=>l.id===selected)?selected:'name';const current=layerSettings(card,key);
 function patchLayer(values){onChange(prev=>({...prev,layers:{...prev.layers,[key]:{...prev.layers?.[key],...values}}}));}
 function begin(e,id,resize=false){
  if(mode==='view')return;e.preventDefault();e.stopPropagation();onSelect(id);e.currentTarget.setPointerCapture(e.pointerId);
  const rect=canvas.current.getBoundingClientRect();gesture.current={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,width:rect.width,height:rect.height,base:layerSettings(card,id),resize,pan:mode==='artwork'&&id==='art',panX:card.artPanX||0,panY:card.artPanY||0};
 }
 function move(e){const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
  if(g.pan){onChange(prev=>({...prev,artPanX:clamp(g.panX+dx/(g.width*g.base.w/100)*100,-100,100),artPanY:clamp(g.panY+dy/(g.height*g.base.h/100)*100,-100,100)}));return;}
  const values=dragGeometry(g.base,dx,dy,g.width,g.height,g.resize);
  onChange(prev=>({...prev,layers:{...prev.layers,[g.id]:{...prev.layers?.[g.id],...values}}}));
 }
 function end(){gesture.current=null;}
 const visible=entries.filter(({id})=>layerSettings(card,id).show&&(id!=='flavor'||card.flavor)&&(id!=='stats'||card.statMode!=='none'));
 return <div className="interactive-preview">
 <div className="preview-tools">
  <label>Preview mode<select value={mode} onChange={e=>{setMode(e.target.value);if(e.target.value==='artwork')onSelect('art')}}><option value="layers">Select / move / resize layers</option><option value="artwork">Pan / zoom artwork inside its window</option><option value="view">Clean preview</option></select></label>
  <label>View zoom · {zoom}%<input type="range" min="50" max="250" step="10" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><button className="secondary" onClick={()=>setZoom(100)}>Reset view</button>
  <label>Selected layer<select value={key} onChange={e=>onSelect(e.target.value)}>{entries.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
  <label>Selection guides<select value={showHandles?'on':'off'} onChange={e=>setShowHandles(e.target.value==='on')}><option value="on">Show</option><option value="off">Hide</option></select></label>
 </div>
 <div className="preview-viewport"><div className="preview-zoom-size" style={{width:Math.round(340*zoom/100)}}><CardRenderer card={card} innerRef={previewRef}/>
  {mode!=='view'&&<div ref={canvas} className="preview-hit-canvas" style={{left:`${border}%`,right:`${border}%`,top:`${border/1.4}%`,bottom:`${border/1.4}%`}} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
   {(mode==='artwork'?visible.filter(l=>l.id==='art'):visible).map(({id,label})=>{const l=layerSettings(card,id);return <div key={id} className={`preview-hit ${showHandles&&key===id?'selected':''}`} tabIndex={0} role="button" aria-label={`Move ${label} layer`} style={{left:`${l.x}%`,top:`${l.y}%`,width:`${l.w}%`,height:`${l.h}%`,transform:`rotate(${l.rotation}deg)`,zIndex:l.z}} onPointerDown={e=>begin(e,id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onSelect(id);const step=e.shiftKey?1:.25;onChange(prev=>{const base=layerSettings(prev,id);return {...prev,layers:{...prev.layers,[id]:{...prev.layers?.[id],x:base.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),y:base.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)}}}});}}}>
    {showHandles&&key===id&&<><span className="preview-hit-label">{label}</span>{mode==='layers'&&<span className="preview-resize-handle" role="button" aria-label={`Resize ${label} layer`} onPointerDown={e=>begin(e,id,true)}/>}</>}
   </div>})}
  </div>}
 </div></div>
 <p className="muted">Drag a layer to move it; drag its lower-right handle to resize. Arrow keys nudge; Shift moves farther. View zoom only changes this workspace. Selection guides are excluded from exports.</p>
 <div className="preview-tools">
  {mode==='artwork'?<><label>Artwork zoom · {card.zoom||100}%<input type="range" min="25" max="400" value={card.zoom||100} onChange={e=>onChange(prev=>({...prev,zoom:Number(e.target.value)}))}/></label><button className="secondary" onClick={()=>onChange(prev=>({...prev,artPanX:0,artPanY:0,zoom:100}))}>Reset artwork position</button></>:<>
   <label>Selected text size<input type="number" min="0.5" max="25" step="0.1" value={current.size||3} onChange={e=>patchLayer({size:clamp(Number(e.target.value),.5,25)})}/></label>
   <label>Selected rotation<input type="number" min="-180" max="180" value={current.rotation||0} onChange={e=>patchLayer({rotation:clamp(Number(e.target.value),-180,180)})}/></label>
   <label>Selected visibility<select value={current.show?'on':'off'} onChange={e=>patchLayer({show:e.target.value==='on'})}><option value="on">Show</option><option value="off">Hide</option></select></label>
   <ColorPicker key={key} label="Selected layer text color" value={current.color} onChange={color=>patchLayer({color})}/>
  </>}
 </div>
 </div>;
}
