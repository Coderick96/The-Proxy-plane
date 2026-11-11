import React,{act}from 'react';
import {createRoot}from 'react-dom/client';
import assert from 'node:assert/strict';
import BetaGate from '../src/BetaGate.jsx';
import {version}from '../package.json';
const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent===text);
const text=()=>document.body.textContent;
async function run(){
 globalThis.localStorage=window.localStorage;
 const root=createRoot(document.getElementById('root'));
 let callback,allowed=false,current=null,resetError=null,updateError=null,oauthError=null,releaseReset;
 const resets=[],updates=[],oauth=[];
 const client={auth:{getSession:async()=>({data:{session:current}}),onAuthStateChange:fn=>{callback=fn;return{data:{subscription:{unsubscribe(){}}}}},resetPasswordForEmail:async(...args)=>{resets.push(args);if(releaseReset)await new Promise(resolve=>{releaseReset=resolve});return{error:resetError}},updateUser:async body=>{updates.push(body);return{error:updateError}},signInWithOAuth:async body=>{oauth.push(body);return{error:oauthError}},signOut:async()=>({error:null})}};
 const request=async()=>({enabled:true,allowed,owner:true,aiEnabled:true,testBilling:false});
 const render=async()=>{await act(async()=>{root.render(<BetaGate client={client} request={request} privateBeta googleEnabled appleEnabled={false}/>);await sleep()})};
 const input=async(label,value)=>{const el=[...document.querySelectorAll('label')].find(n=>n.textContent.startsWith(label)).querySelector('input');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}))})};
 const submit=async()=>{await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await sleep()})};
 await render();
 assert(button('Continue with Google'));assert.equal(button('Continue with Apple').disabled,true);assert(text().includes('Apple sign-in is currently unavailable'));
 oauthError=new Error('Provider temporarily unavailable');await act(async()=>button('Continue with Google').click());assert(text().includes('Provider temporarily unavailable'));assert.equal(button('Continue with Google').disabled,false);assert.deepEqual(oauth[0],{provider:'google',options:{redirectTo:'http://localhost'}});
 await act(async()=>button('Forgot password?').click());assert(!document.querySelector('input[type=password]'));await input('Email','tester@example.invalid');
 resetError=new Error('Try again later');await submit();assert(text().includes('Try again later'));assert.equal(button('Send reset link').disabled,false);
 resetError=null;await submit();assert(text().includes('If an account exists'));assert.deepEqual(resets[1],['tester@example.invalid',{redirectTo:'http://localhost/?auth=recovery'}]);assert.equal(updates.length,0);
 // A valid provider recovery event must take precedence over an approved beta account.
 allowed=true;current={user:{id:'recovery-user',email:'tester@example.invalid'}};
 await act(async()=>{callback('PASSWORD_RECOVERY',current);await sleep()});assert(text().includes('Reset your password'));assert(!document.querySelector('.app-shell'));assert.equal(updates.length,0);
 await input('New password','brand-new-password');await input('Confirm new password','different-password');await submit();assert(text().includes('passwords do not match'));assert.equal(updates.length,0);
 await input('Confirm new password','brand-new-password');updateError=new Error('Password update rejected');await submit();assert(text().includes('Password update rejected'));assert.equal(button('Save new password').disabled,false);assert(!document.querySelector('.app-shell'));
 updateError=null;await submit();assert.equal(updates.length,2);assert.equal(updates[1].password,'brand-new-password');assert(text().includes('Private beta · v'+version));assert(!text().includes('v2.6.4'));assert(!text().includes('Reset your password'));
 // A query parameter alone never authorizes a password update.
 await act(async()=>root.unmount());
 window.history.replaceState({},'','/?auth=recovery');current=null;allowed=false;
 const second=createRoot(document.getElementById('root'));await act(async()=>{second.render(<BetaGate client={client} request={request} privateBeta googleEnabled appleEnabled={false}/>);await sleep()});assert(text().includes('invalid or expired'));assert(!document.querySelector('form'));assert.equal(updates.length,2);
 await act(async()=>button('Request a new reset link').click());assert(button('Send reset link'));assert.equal(updates.length,2);
 await act(async()=>second.unmount());window.history.replaceState({},'','/');
 console.log('PASS beta entry Google/provider failure, unavailable Apple, password-reset request/retry, generic reset acknowledgement, recovery precedence for approved accounts, mismatch/rejected update retry, expired link denial and package-derived version (simulated DOM/providers).');
}
run().catch(error=>{console.error(error);process.exitCode=1});
