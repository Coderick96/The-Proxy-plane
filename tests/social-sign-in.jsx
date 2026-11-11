import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';import SocialSignIn from '../src/SocialSignIn.jsx';
async function run(){const root=createRoot(document.getElementById('root')),calls=[];const render=async props=>act(async()=>root.render(<SocialSignIn onSignIn={provider=>calls.push(provider)} {...props}/>));
 try{
  await render({appleEnabled:false});const buttons=[...document.querySelectorAll('button')];assert.equal(buttons[0].disabled,false);assert.equal(buttons[1].disabled,true);assert.match(document.body.textContent,/Apple sign-in is currently unavailable/);
  await act(async()=>buttons[1].click());assert.deepEqual(calls,[]);await act(async()=>buttons[0].click());assert.deepEqual(calls,['google']);
  await render({disabled:true});await act(async()=>document.querySelector('button').click());assert.deepEqual(calls,['google']);
  await render({});await act(async()=>document.querySelectorAll('button')[1].click());assert.deepEqual(calls,['google','apple']);assert(!document.body.textContent.includes('currently unavailable'));
  console.log('PASS social sign-in capabilities: unavailable providers cannot launch OAuth, available Google/Apple preserve callbacks, busy blocks actions and existing configuration remains compatible.');
 }finally{await act(async()=>root.unmount())}
}run().catch(error=>{console.error(error);process.exitCode=1});
