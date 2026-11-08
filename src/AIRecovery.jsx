import React,{useEffect,useRef,useState} from 'react';
import {api} from './premiumApi.js';
const labels={art:'Artwork',resketch:'Re-sketch',set:'Card set',review:'Rules review'};
const states={running:'In progress',refund_pending:'Credit return pending',refunded:'Credits returned',completed:'Ready to recover'};
export default function AIRecovery({client,user,onRecovered,onRefresh,refreshKey}){
 const identity=useRef({id:user?.id,epoch:0});
 if(identity.current.id!==user?.id)identity.current={id:user?.id,epoch:identity.current.epoch+1};
 const [data,setData]=useState({owner:null,operations:[]}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const current=epoch=>identity.current.epoch===epoch;
 async function refresh(){
  if(!client||!user)return;
  const epoch=identity.current.epoch,owner=user.id;
  setBusy(true);setNotice('');
  try{const value=await api(client,'/api/ai/operations');if(!current(epoch))return;setData({owner,operations:Array.isArray(value.operations)?value.operations:[]});await onRefresh?.();}
  catch(error){if(current(epoch))setNotice(error.message||'Recent requests are unavailable. Please retry.');}
  finally{if(current(epoch))setBusy(false);}
 }
 useEffect(()=>{setData({owner:user?.id||null,operations:[]});setNotice('');setBusy(false);if(client&&user)refresh();return()=>{identity.current.epoch++;};},[client,user?.id,refreshKey]);
 async function recover(operation){
  const epoch=identity.current.epoch;setBusy(true);setNotice('');
  try{
   const value=await api(client,'/api/ai/operations/'+encodeURIComponent(operation.operationId));
   if(!current(epoch))return;
   if(value.state!=='completed'||!value.result)throw new Error('This result is not ready. Refresh recent requests.');
   if(['art','resketch'].includes(value.kind)){
    if(!Array.isArray(value.result.images)||value.result.images.length!==3||value.result.images.some(i=>typeof i!=='string'||!i.startsWith('data:image/png;base64,')))throw new Error('The recovered artwork is incomplete.');
    onRecovered(value.result.images);setNotice('Recovered three choices. Choose one to apply to your current card. No new credits were charged.');
   }else{
    const url=URL.createObjectURL(new Blob([JSON.stringify(value.result,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='proxy-plane-recovered-'+value.kind+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Recovered result downloaded. No new credits were charged.');
   }
  }catch(error){if(current(epoch))setNotice(error.message||'Recovery failed. Please retry.');}
  finally{if(current(epoch))setBusy(false);}
 }
 const operations=data.owner===user?.id?data.operations:[];
 return <details className="ai-recovery"><summary>Recent AI requests & recovery</summary><div>
  <p>If a connection drops, recover a completed result here before starting another generation. Recovery does not spend credits. Interrupted requests return credits after the server lease expires and recovery runs.</p>
  {!client||!user?<p>Sign in to access your private server-generated results. Local Art Studio is separate.</p>:<>
   <button type="button" className="secondary" disabled={busy} onClick={refresh}>{busy?'Checking requests…':'Refresh recent requests'}</button>
   {notice&&<p role="status">{notice}</p>}
   {!operations.length&&!busy&&<p>No recent server requests found.</p>}
   <ul>{operations.map(operation=><li key={operation.operationId}><strong>{labels[operation.kind]||'AI request'}</strong> · {states[operation.state]||operation.state}
    {operation.state==='completed'&&<button type="button" className="secondary" disabled={busy} onClick={()=>recover(operation)}>{['art','resketch'].includes(operation.kind)?'Recover artwork choices':'Download recovered result'}</button>}
   </li>)}</ul>
  </>}
 </div></details>;
}
