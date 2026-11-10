import React,{useEffect,useRef,useState} from 'react';
import {usePremium} from './PremiumContext.jsx';
import {api} from './premiumApi.js';
import {uuid} from './uuid.js';
export default function DeveloperCredits({client:providedClient,onRefresh}){
 const {access,client:contextClient,refresh}=usePremium(),client=providedClient||contextClient;
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const pending=useRef(null),mounted=useRef(true),epoch=useRef(0);
 useEffect(()=>{mounted.current=true;epoch.current++;pending.current=null;setCode('');setBusy(false);setNotice('');setError('');return()=>{mounted.current=false;epoch.current++;pending.current=null;};},[client,access?.owner]);
 if(!access?.owner||!client)return null;
 async function topoff(event){
  event.preventDefault();if(busy||(!pending.current&&!code))return;
  const version=epoch.current,current=()=>mounted.current&&epoch.current===version;
  setBusy(true);setNotice('');setError('');
  try{
   const {data}=await client.auth.getSession(),session=data?.session;if(!current())return;
   if(!session?.access_token||!session?.user?.id)throw Object.assign(new Error('Sign in as the development owner.'),{status:401});
   if(pending.current&&pending.current.owner!==session.user.id)throw Object.assign(new Error('Account changed. Sign in as the original owner.'),{status:403});
   if(!pending.current)pending.current={owner:session.user.id,operationId:uuid(),code};
   const request=pending.current;
   // Keep the request on the account that initiated it, including across auth-token refreshes.
   const frozen={auth:{getSession:async()=>({data:{session}})}};
   const receipt=await api(frozen,'/api/dev/credits/topoff',{operationId:request.operationId,code:request.code});
   if(!receipt||receipt.operationId!==request.operationId||!Number.isInteger(receipt.added)||receipt.added<1)throw new Error('Refill confirmation is incomplete. Retry the same request.');
   if(!current())return;
   pending.current=null;setCode('');setNotice(receipt.added+' development credits added. No payment was made.');
   try{await (onRefresh||refresh)?.();}catch{if(current())setNotice(receipt.added+' development credits added. Refresh your account to update the balance.');}
  }catch(failure){
   if(!current())return;
   if(failure.status>=400&&failure.status<500)pending.current=null;
   setError(failure.message||'Refill could not be confirmed. Retry the same request.');
  }finally{if(current())setBusy(false);}
 }
 return <details className="developer-credits"><summary>Owner development credits</summary><p>Private-beta owner refill. This adds development credits without a payment.</p><form onSubmit={topoff}><label>Owner refill code<input type="password" autoComplete="off" maxLength={100} value={code} disabled={busy||Boolean(pending.current)} onChange={event=>setCode(event.target.value)}/></label><button type="submit" className="secondary" disabled={busy||(!code&&!pending.current)}>{busy?'Adding development credits…':pending.current?'Retry development credit refill':'Add development credits'}</button></form>{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</details>;
}
