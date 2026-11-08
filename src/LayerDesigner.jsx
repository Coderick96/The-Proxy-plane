import {uuid as createUUID} from './uuid.js';
import React,{useState} from 'react';
import ColorPicker from './ColorPicker.jsx';
import {LAYERS,layerSettings,isFullArt} from './cardModel.js';

export default function LayerDesigner({card,onChange,selection,onSelect}){
 const [localSelected,setLocalSelected]=useState('name');const selected=selection||localSelected;const setSelected=onSelect||setLocalSelected;const [kind,setKind]=useState('text');const [error,setError]=useState('');
 const custom=(card.customLayers||[]).find(l=>l.id===selected);
 const key=LAYERS[selected]||custom?selected:'name';
 const value=layerSettings(card,key);
 function patch(field,v){onChange({...card,layers:{...card.layers,[key]:{...card.layers?.[key],[field]:v}}});}
 function updateCustom(field,v){onChange({...card,customLayers:card.customLayers.map(l=>l.id===key?{...l,[field]:v}:l)});}
 const numeric=(field,label,min,max,step=1)=><label>{label}<input type="number" min={min} max={max} step={step} value={value[field]??0} onChange={e=>patch(field,Math.min(max,Math.max(min,Number(e.target.value))))}/></label>;
 const color=(field,label)=><label>{label}<input type="color" value={value[field]||'#000000'} onChange={e=>patch(field,e.target.value)}/></label>;
 const choose=(field,label,options)=><label>{label}<select value={String(value[field])} onChange={e=>patch(field,e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
 async function upload(file){if(!file)return;setError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){setError('Use PNG, JPG or WebP under 20 MB.');return;}const reader=new FileReader();reader.onload=()=>updateCustom('image',reader.result);reader.onerror=()=>setError('Could not read file.');reader.readAsDataURL(file);}
 function add(){const id=createUUID();const layer={id,kind,label:`Custom ${kind} ${(card.customLayers||[]).length+1}`,text:kind==='text'?'Your text':'',x:10,y:20,w:80,h:15,size:4,show:true};onChange({...card,customLayers:[...(card.customLayers||[]),layer],layers:{...card.layers,[id]:{panel:kind==='shape',fill:kind==='shape'?'#000000':'#eee5cb',color:isFullArt(card)?'#ffffff':'#17150f',z:4+(card.customLayers||[]).length}}});setSelected(id);}
 return <>
  <div className="control-grid"><label>Add a layer<select value={kind} onChange={e=>setKind(e.target.value)}><option value="text">Text / subtitle / symbols</option><option value="image">Image / frame piece / icon</option><option value="shape">Rectangle / panel / line</option></select></label><button className="secondary" onClick={add}>Add layer</button></div>
  <label>Select layer<select value={key} onChange={e=>setSelected(e.target.value)}><optgroup label="Built-in card layers">{Object.keys(LAYERS).map(k=><option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>)}</optgroup><optgroup label="Your layers">{(card.customLayers||[]).map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</optgroup></select></label>
  {custom&&<><label>Layer name<input value={custom.label} onChange={e=>updateCustom('label',e.target.value)}/></label>{custom.kind==='text'&&<label>Text (supports mana symbols)<textarea rows={3} value={custom.text||''} onChange={e=>updateCustom('text',e.target.value)}/></label>}{custom.kind==='image'&&<><label>Layer image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label>{choose('fit','Image fit',[['cover','Fill / crop'],['contain','Fit whole image'],['fill','Stretch']])}</>}</>}
  <label>Visibility<select value={value.show?'show':'hide'} onChange={e=>patch('show',e.target.value==='show')}><option value="show">Show</option><option value="hide">Hide</option></select></label>
  <details className="editor-category"><summary>Position, size & stacking</summary><div className="editor-category-body control-grid">
   {numeric('x','Left (%)',-100,200,.25)}{numeric('y','Top (%)',-100,200,.25)}{numeric('w','Width (%)',.25,200,.25)}{numeric('h','Height (%)',.25,200,.25)}{numeric('rotation','Rotation (degrees)',-180,180)}{numeric('opacity','Layer opacity (%)',0,100)}{numeric('z','Stack order (higher = in front)',0,1000)}
  </div></details>
  <details className="editor-category"><summary>Text styling, outline & shadow</summary><div className="editor-category-body">
   <div className="control-grid">{numeric('size','Font size (% of width)',.5,25,.1)}<ColorPicker key={key} label="Layer text color" value={value.color} onChange={color=>patch('color',color)}/>{color('outline','Text outline color')}{numeric('stroke','Outline thickness (% of width)',0,3,.05)}{numeric('lineHeight','Line spacing',.7,3,.05)}{numeric('spacing','Letter spacing (% of width)',-1,3,.05)}</div>
   {choose('fontFamily','Font',[['Georgia, serif','Georgia'],['Times New Roman, serif','Times New Roman'],['Arial, sans-serif','Arial'],['Courier New, monospace','Courier New']])}
   {choose('weight','Weight',[['normal','Normal'],['bold','Bold'],['300','Light'],['900','Heavy']])}
   {choose('align','Alignment',[['left','Left'],['center','Center'],['right','Right']])}
   <label>Text wrapping<select value={value.wrap?'wrap':'nowrap'} onChange={e=>patch('wrap',e.target.value==='wrap')}><option value="wrap">Wrap lines</option><option value="nowrap">Single line</option></select></label>
   {choose('shadow','Text shadow',[['none','None'],['soft','Soft black'],['hard','Hard black']])}
   <label>Italic<select value={value.italic?'yes':'no'} onChange={e=>patch('italic',e.target.value==='yes')}><option value="no">Off</option><option value="yes">On</option></select></label>
  </div></details>
  <details className="editor-category"><summary>Optional background box / shape</summary><div className="editor-category-body">
   <label>Background box<select value={value.panel?'on':'off'} onChange={e=>patch('panel',e.target.value==='on')}><option value="off">Off — text directly on art</option><option value="on">On — show background box</option></select></label>
   <div className="control-grid">{color('fill','Box fill')}{numeric('fillOpacity','Fill opacity (%)',0,100)}{color('borderColor','Box border color')}{numeric('borderSize','Box border thickness (% of width)',0,3,.05)}{numeric('rounding','Corner rounding (% of width)',0,50,.25)}</div>
  </div></details>
  <button className="secondary" onClick={()=>{const layers={...card.layers};delete layers[key];onChange({...card,layers})}}>Reset selected layer styling</button>
  {custom&&<button className="secondary" onClick={()=>{const layers={...card.layers};delete layers[key];onChange({...card,customLayers:card.customLayers.filter(l=>l.id!==key),layers});setSelected('name')}}>Remove selected custom layer</button>}
  {error&&<p className="error-text" role="alert">{error}</p>}
 </>;
}
