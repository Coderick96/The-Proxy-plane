import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import ArtworkStudio from '../src/ArtworkStudio.jsx';
async function run(){
 const root=createRoot(document.getElementById('root'));
 let generated=0,picked=null,external=0,signIns=0;
 const images=Array.from({length:3},(_,i)=>'data:image/png;base64,'+'A'.repeat(i+4));
 const props={initialMode:'cloud',prompt:'A moonlit dragon',onPrompt:()=>{},connected:true,signedIn:true,onGenerate:()=>generated++,onPick:image=>picked=image,onLocal:()=>external++,onSignIn:()=>signIns++};
 const render=async extra=>{await act(async()=>root.render(<ArtworkStudio {...props} {...extra}/>))};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 try{
  await render({});
  assert.equal(document.querySelector('.desktop-art-option').open,false);
  await act(async()=>button('Generate 3 choices · 1 credit').click());assert.equal(generated,1);assert.equal(external,0,'primary generator cannot open companion');
  await render({images});assert.equal(document.querySelectorAll('.art-choice-grid img').length,3);
  await act(async()=>button('Use option 2').click());assert.equal(picked,images[1]);assert.equal(external,0);
  await render({busy:true});assert(button('Generating your choices…').disabled);
  await render({prompt:'abc'});assert(button('Generate 3 choices · 1 credit').disabled);
  await render({connected:false});assert(button('Generate 3 choices · 1 credit').disabled);assert.match(document.querySelector('[role=status]').textContent,/being connected/);
  await render({signedIn:false});await act(async()=>button('Sign in for AI artwork').click());assert.equal(signIns,1);assert(button('Generate 3 choices · 1 credit').disabled);
  await render({error:'Generation paused'});assert.equal(document.querySelector('[role=alert]').textContent,'Generation paused');
  await act(async()=>button('Open desktop companion in another window').click());assert.equal(external,1,'companion remains an explicit optional action only');
  console.log('PASS integrated Artwork Studio: prompt/generate/three choices/apply stay in-app, no companion on primary actions, offline/login/busy gates, inline errors and explicit optional companion.');
 }finally{await act(async()=>root.unmount())}
}
run().catch(error=>{console.error(error);process.exitCode=1});
