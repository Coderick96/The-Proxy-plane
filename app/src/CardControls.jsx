import React,{useState} from 'react';
import BackSettings from './CardBack.jsx';
import LayerDesigner from './LayerDesigner.jsx';
import ManaPicker from './ManaPicker.jsx';
import TextImporter from './TextImporter.jsx';
import SetSymbolPicker from './SetSymbolPicker.jsx';
import ColorPicker from './ColorPicker.jsx';
import {FRAME_PRESETS,COLORS,LAYERS,layerSettings} from './cardModel.js';

function Category({title,children,open=false}){return <details className="editor-category" open={open||undefined}><summary>{title}</summary><div className="editor-category-body">{children}</div></details>}
export default function CardControls({card,onChange,onUploadArt,aiControls,selectedLayer,onSelectLayer}){
 const [layer,setLayer]=useState('name');const [uploadError,setUploadError]=useState('');
 const change=(key,value)=>{
 if(key==='frame'){
  const full=['fullart','showcase'].includes(value);
  onChange({...card,...(card.premiumPack?{premiumPack:null,frameOverlay:''}:{}),frame:value,borderWidth:full?0:2.5,panelStyle:full?'transparent':'solid',textColor:full?'#ffffff':'#17150f'});
 }else if(key==='setSymbolImage'||key==='setSymbol')onChange({...card,[key]:value,setSymbolSvg:null,setSymbolId:key==='setSymbolImage'?'upload':'text',setSymbolName:key==='setSymbolImage'?'Uploaded symbol':'Custom text symbol',...(key==='setSymbol'?{setSymbolImage:''}:{})});else onChange({...card,[key]:value});
 };
 const field=(key,label,{type='text',placeholder='',min,max,step}={})=><label>{label}<input type={type} value={card[key]??(type==='color'?({frameColor:COLORS[card.color]||COLORS.blue,borderColor:'#151515',textColor:'#17150f',panelColor:'#eee5cb'})[key]:type==='number'?({borderWidth:2.5,artX:50,artY:50,zoom:100,lineHeight:1.22,artBrightness:100,artContrast:100,artSaturation:100,artHue:0,artBlur:0})[key]??'':'')} min={min} max={max} step={step} placeholder={placeholder} onChange={e=>change(key,type==='number'?Number(e.target.value):e.target.value)}/></label>;
 const select=(key,label,options,fallback)=><label>{label}<select value={card[key]??fallback??options[0][0]} onChange={e=>change(key,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
 const area=(key,label,placeholder='')=><label>{label}<textarea rows={4} value={card[key]||''} placeholder={placeholder} onChange={e=>change(key,e.target.value)}/></label>;
 async function upload(file,key){if(!file)return;setUploadError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){setUploadError('Use a PNG, JPG or WebP file under 20 MB.');return;}const reader=new FileReader();reader.onerror=()=>setUploadError('Could not read the image.');reader.onload=()=>change(key,reader.result);reader.readAsDataURL(file);}
 const asset=(key,label)=><label>{label}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0],key)}/>{card[key]&&<button type="button" className="secondary" onClick={()=>change(key,'')}>Remove image</button>}</label>;
 const currentLayer=layerSettings(card,layer);
 return <>
 <Category title="1 · Frame, border & card layout" open>
  {select('frame','Frame family',FRAME_PRESETS,'modern')}
  <p className="layer-note">Built-in frames are original approximations, not exact historical templates. For a precise frame, upload a transparent frame PNG you have permission to use. Historical and showcase frame assets are not bundled.</p>
  {select('layout','Card layout',[['standard','Standard'],['planeswalker','Planeswalker abilities'],['saga','Saga chapters'],['textless','Textless art']],'standard')}
  {select('color','Frame color',Object.keys(COLORS).map(k=>[k,k[0].toUpperCase()+k.slice(1)]),'blue')}
  <div className="control-grid">{field('frameColor','Override frame color',{type:'color'})}{field('borderColor','Border color',{type:'color'})}{field('borderWidth','Border width (% of card width)',{type:'number',min:0,max:8,step:0.25})}</div>
  {select('panelStyle','Text panels',[['solid','Visible panels'],['transparent','Transparent panels']],'solid')}
  <label>Legendary crown treatment<select value={card.legendary?'yes':'no'} onChange={e=>change('legendary',e.target.value==='yes')}><option value="no">Off</option><option value="yes">On</option></select></label>
  {asset('frameOverlay','Upload full-card frame overlay (transparent PNG recommended)')}<button className="secondary" onClick={()=>change('frameColor','')}>Use selected frame color</button>
 </Category>
 <Category title="2 · Name & mana cost">{field('name','Card name')}<ManaPicker value={card.mana} onChange={value=>change('mana',value)}/><p className="layer-note">Use curly-brace symbols in costs and rules: {'{T}, {Q}, {W}, {U/B}, {W/P}, {2/R}'}.</p></Category>
 <Category title="3 · Artwork & positioning">
  <label>Upload artwork<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>onUploadArt(e.target.files?.[0])}/></label>
  <div className="control-grid">{field('artX','Horizontal focal point (%)',{type:'number',min:0,max:100})}{field('artY','Vertical focal point (%)',{type:'number',min:0,max:100})}{field('zoom','Art zoom (%)',{type:'number',min:25,max:400})}{field('artBrightness','Brightness (%)',{type:'number',min:0,max:300})}{field('artContrast','Contrast (%)',{type:'number',min:0,max:300})}{field('artSaturation','Saturation (%)',{type:'number',min:0,max:300})}{field('artHue','Hue rotation (degrees)',{type:'number',min:-180,max:180})}{field('artBlur','Blur (pixels)',{type:'number',min:0,max:20,step:0.25})}</div>
  {card.art&&<button className="secondary" onClick={()=>change('art','')}>Remove artwork</button>}
  <p className="layer-note">Move and resize the artwork window under Layer positions. Uploaded artwork stays separate from the frame.</p>
 </Category>
 <Category title="4 · Type line & set symbol">{field('type','Type line',{placeholder:'Legendary Creature — Dragon'})}{select('rarity','Rarity',[['common','Common'],['uncommon','Uncommon'],['rare','Rare'],['mythic','Mythic rare']],'rare')}<SetSymbolPicker card={card} onChange={onChange}/>{field('setSymbol','Symbol text',{placeholder:'✦'})}{asset('setSymbolImage','Upload set-symbol image')}{asset('watermarkImage','Upload design watermark')}{field('watermarkOpacity','Watermark opacity (%)',{type:'number',min:0,max:100})}{asset('stampImage','Upload decorative stamp')}<p className="layer-note">Enable and position watermark or stamp in Layer positions. These are decorative images; The Proxy Plane label stays visible.</p></Category>
 <Category title="5 · Rules, flavor & typography">{area('rules','Rules text')}{area('flavor','Flavor text')}{select('fontFamily','Text font',[['Georgia, serif','Georgia'],['Times New Roman, serif','Times New Roman'],['Arial, sans-serif','Arial']],'Georgia, serif')}{select('textAlign','Rules alignment',[['left','Left'],['center','Center'],['right','Right']],'left')}<div className="control-grid"><ColorPicker label="Default text color" value={card.textColor||'#17150f'} onChange={value=>change('textColor',value)}/>{field('panelColor','Panel color',{type:'color'})}{field('lineHeight','Line spacing',{type:'number',min:0.8,max:2,step:0.05})}</div><p className="layer-note">Set separate font sizes for each text layer under Layer positions. Long text may need a smaller font or larger rules box.</p></Category>
 <Category title="6 · Power, toughness, loyalty & defense">{select('statMode','Statistics box',[['pt','Power / toughness'],['defense','Defense'],['none','None']],'pt')}<div className="control-grid">{field('power','Power')}{field('toughness','Toughness')}{field('loyalty','Starting loyalty')}{field('defense','Defense')}</div>{area('abilities','Planeswalker abilities (one per line)','+1: Draw a card.\n−2: Create a token.')}{area('chapters','Saga chapters (one per line)','I — Draw a card.\nII — Create a token.')}<p className="layer-note">Choose Planeswalker or Saga layout in Frame & layout to display abilities or chapters.</p></Category>
 <Category title="7 · Artist & collector details">{field('artist','Artist credit')}<div className="control-grid">{field('setCode','Set code')}{field('collector','Collector number')}{field('language','Language code')}</div><p className="layer-note">The Proxy Plane identification is always visible at the bottom right.</p></Category>
 <Category title="8 · All layers — add, position & style"><LayerDesigner card={card} onChange={onChange} selection={selectedLayer} onSelect={onSelectLayer}/></Category>
 <Category title="9 · Import text"><TextImporter cardId={card.id} onChange={onChange}/></Category>
 <Category title="10 · AI artwork">{aiControls}</Category>
 <Category title="11 · Optional card backing"><BackSettings value={card.back} onChange={back=>change('back',back)}/><p className="layer-note">Saved with this card. Front PNG export stays front-only. Export paired backs from Print.</p></Category>
 {uploadError&&<p role="alert" className="error-text">{uploadError}</p>}
 </>;
}
