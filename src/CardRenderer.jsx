import React from 'react';
import SetSymbol from './SetSymbol.jsx';
import {SymbolText} from './SymbolText.jsx';
import {COLORS,layerStyle,layerSettings,isFullArt} from './cardModel.js';
import './cardRenderer.css';

// One renderer for studio, PNG export, queue preview, PDF and browser printing.
export default function CardRenderer({card,innerRef}){
 const artStyle=layerStyle(card,'art');
 const backdrop=isFullArt(card);
 const panelClass=key=>layerSettings(card,key).panel?'pk-panel':'';
 const border=card.borderWidth??(backdrop?0:2.5);
 return <div ref={innerRef} className={`pk-render pk-frame-${card.frame||'modern'} pk-layout-${card.layout||'standard'} ${card.legendary?'pk-legendary':''}`} style={{'--pk-frame':card.frameColor||COLORS[card.color]||COLORS.blue,'--pk-text':card.textColor||'#17150f','--pk-panel':card.panelColor||'#eee5cb',background:card.borderColor||'#151515',borderWidth:0,fontFamily:card.fontFamily||'Georgia, serif'}}>
   <div className="pk-render-canvas" style={{left:`${border}%`,right:`${border}%`,top:`${(border)/1.4}%`,bottom:`${(border)/1.4}%`,background:card.frameColor||COLORS[card.color]||COLORS.blue}}>
    <div className="pk-layer pk-art" style={artStyle}>{card.art?<img src={card.art} alt="Card artwork" style={{objectPosition:`${card.artX??50}% ${card.artY??50}%`,transform:`translate(${card.artPanX||0}%,${card.artPanY||0}%) scale(${(card.zoom||100)/100})`,filter:`brightness(${card.artBrightness??100}%) contrast(${card.artContrast??100}%) saturate(${card.artSaturation??100}%) hue-rotate(${card.artHue??0}deg) blur(${card.artBlur??0}px)`}}/>:<span>Upload artwork</span>}</div>
    {card.frameOverlay&&<img className="pk-overlay" src={card.frameOverlay} alt="Uploaded frame overlay"/>}
    <div className={`pk-layer pk-title ${panelClass('name')}`} style={layerStyle(card,'name')}><b>{card.name||'Card Name'}</b></div>
    <div className="pk-layer pk-cost" style={layerStyle(card,'mana')}><SymbolText text={card.mana||''}/></div>
    <div className={`pk-layer pk-type ${panelClass('type')}`} style={layerStyle(card,'type')}><span>{card.type||'Type — Subtype'}</span></div>
    <div className="pk-layer pk-set-symbol" style={layerStyle(card,'symbol')}><SetSymbol card={card}/></div>
    <div className={`pk-layer pk-rules ${panelClass('rules')}`} style={layerStyle(card,'rules')}>
      {card.layout==='planeswalker'?(card.abilities||'+1: Draw a card.\n−2: Create a token.\n−7: You get an emblem.').split('\n').map((line,i)=><div className="pk-ability" key={i}><SymbolText text={line}/></div>):card.layout==='saga'?(card.chapters||'I — Draw a card.\nII — Create a token.\nIII — Return this to its owner’s hand.').split('\n').map((line,i)=><div className="pk-ability" key={i}><SymbolText text={line}/></div>):<div className="pk-rules-content"><SymbolText text={card.rules||''}/></div>}
      
    </div>
    {card.flavor&&<i className="pk-layer pk-flavor" style={layerStyle(card,'flavor')}>{card.flavor}</i>}
    {card.watermarkImage&&<div className="pk-layer pk-watermark" style={{...layerStyle(card,'watermark'),opacity:((card.watermarkOpacity??15)/100)*(layerSettings(card,'watermark').opacity/100)}}><img src={card.watermarkImage} alt="Design watermark"/></div>}
    {card.stampImage&&<div className="pk-layer pk-stamp" style={layerStyle(card,'stamp')}><img src={card.stampImage} alt="Custom decorative stamp"/></div>}
    <div className="pk-layer pk-footer" style={layerStyle(card,'footer')}><span>{[card.collector,card.setCode,card.language||'EN'].filter(Boolean).join(' · ')}<br/>{card.artist||'Artist credit'}</span></div>
    <div className="pk-layer pk-stats pk-panel" style={{...layerStyle(card,'stats'),display:card.statMode==='none'?'none':layerStyle(card,'stats').display}}>{card.layout==='planeswalker'?card.loyalty||'0':card.statMode==='defense'?card.defense||'0':card.statMode==='none'?'':(card.power||card.toughness)?`${card.power||'—'}/${card.toughness||'—'}`:''}</div>
    {(card.customLayers||[]).map(layer=><div key={layer.id} className={`pk-layer pk-custom-layer pk-custom-${layer.kind}`} style={layerStyle(card,layer.id)}>{layer.kind==='image'?(layer.image?<img src={layer.image} alt={layer.label||'Custom image'} style={{width:'100%',height:'100%',objectFit:layerSettings(card,layer.id).fit}}/>:null):layer.kind==='shape'?null:<div className="pk-custom-text" style={{width:'100%'}}><SymbolText text={layer.text||''}/></div>}</div>)}
    <span className="pk-proxy-mark" style={{color:backdrop?'white':'#ddd'}}>THE PROXY PLANE · PROXY</span>
   </div>
 </div>;
}
