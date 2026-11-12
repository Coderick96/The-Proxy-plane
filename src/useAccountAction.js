import {useEffect,useRef,useState} from 'react';
import {api} from './premiumApi.js';
const identity=session=>session?.user?.id||session?.access_token||null;
const stale=()=>Object.assign(new Error('Account action is no longer current.'),{code:'ACCOUNT_ACTION_STALE'});

// Scope paid/private side effects to one mounted account epoch, including A → B → A.
export function useAccountAction(client){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const generation=useRef(0),mounted=useRef(false),busyRef=useRef(false),account=useRef(null),activeClient=useRef(client);activeClient.current=client;
 useEffect(()=>{
  mounted.current=true;generation.current++;busyRef.current=false;account.current=null;setBusy(false);setNotice('');
  const subscription=client?.auth?.onAuthStateChange?.((_event,next)=>{
   const nextAccount=identity(next);if(account.current!==nextAccount){generation.current++;busyRef.current=false;setBusy(false);setNotice('')}account.current=nextAccount;
  });
  return()=>{mounted.current=false;generation.current++;busyRef.current=false;subscription?.data?.subscription?.unsubscribe()};
 },[client]);
 async function run(work){
  if(busyRef.current)return;busyRef.current=true;const token=++generation.current;
  const current=()=>mounted.current&&activeClient.current===client&&generation.current===token;
  setBusy(true);setNotice('');let verifyCurrent;
  try{
   const initial=client?await client.auth.getSession():{data:null};if(!current())return;
   const owner=identity(initial.data?.session);if(!owner||initial.error)throw new Error('Sign in before continuing.');account.current=owner;
   const frozenClient={auth:{getSession:async()=>initial}};
   async function verify(){
    if(!current())throw stale();const latest=await client.auth.getSession();
    if(!current()||latest.error||identity(latest.data?.session)!==owner)throw stale();
   }
   verifyCurrent=verify;
   async function request(path,body){await verify();const data=await api(frozenClient,path,body);await verify();return data;}
   await work({request,verify,current});
  }catch(error){if(current()){try{await verifyCurrent?.()}catch{return}if(current()&&error?.code!=='ACCOUNT_ACTION_STALE')setNotice(error?.message||'Request failed. Please retry.')}}
  finally{if(current()){busyRef.current=false;setBusy(false)}}
 }
 return {busy,notice,setNotice,run};
}
