import React,{useState} from 'react';
import DeviceArtworkStudio from './DeviceArtworkStudio.jsx';
import {Sparkles,RefreshCw} from 'lucide-react';
import ArtChoices from './ArtChoices.jsx';
export default function ArtworkStudio({prompt,onPrompt,busy=false,error='',connected=false,signedIn=false,onSignIn,onGenerate,images=[],canResketch=false,onPick,onResketch,onLocal,recovery,contextKey='',initialMode='device',client=null,user=null,credits=null,onRefresh}){
 const [mode,setMode]=useState(initialMode);
 return <div className="ai-box integrated-art-studio">
  <div className="ai-title"><Sparkles size={17}/><b>AI Art Studio</b></div>
  <div className="artwork-mode-picker" role="group" aria-label="Artwork generation mode"><button type="button" className="secondary" aria-pressed={mode==='device'} onClick={()=>setMode('device')}>On this device</button><button type="button" className="secondary" aria-pressed={mode==='cloud'} onClick={()=>setMode('cloud')}>Cloud (account credits)</button></div>
  {mode==='device'?<DeviceArtworkStudio key={contextKey} contextKey={contextKey} onPick={onPick} client={client} user={user} credits={credits} connected={connected} signedIn={signedIn} onSignIn={onSignIn} onRefresh={onRefresh}/>:<>
  <p>Describe your artwork, compare three choices, then apply your favorite directly to this card.</p>
  <label>Describe your artwork<textarea value={prompt} onChange={e=>onPrompt(e.target.value)} rows={4} maxLength={4000} placeholder="A moonlit elven ranger above an ancient forest, painterly fantasy illustration…"/></label>
  {!connected?<p role="status">Cloud artwork is being connected for this beta. You can still upload artwork to your card.</p>:!signedIn?<><p>Sign in to use your AI credits and keep your requests private.</p><button type="button" className="secondary" onClick={onSignIn}>Sign in for AI artwork</button></>:null}
  <button type="button" className="primary full-width" disabled={!connected||!signedIn||busy||prompt.trim().length<5} onClick={onGenerate}>{busy?<><RefreshCw className="spin" size={16}/> Generating your choices…</>:<><Sparkles size={16}/> Generate 3 choices · 1 credit</>}</button>
  <p className="muted">One successful prompt costs one credit. Generation and image selection stay here in the editor.</p>
  {error&&<div className="error-text" role="alert">{error}</div>}
  <ArtChoices images={images} busy={busy} cost={1} canResketch={canResketch} onPick={onPick} onResketch={onResketch}/>
  {recovery}
  {onLocal&&<details className="desktop-art-option"><summary>Desktop companion (optional)</summary><p>This separate desktop tool needs the Art Studio companion running on this computer. It opens another window.</p><button type="button" className="secondary" onClick={onLocal}>Open desktop companion in another window</button></details>}
 </>}</div>;
}
