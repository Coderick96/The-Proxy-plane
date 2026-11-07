import React,{useState,act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';
import Home from '../src/Home.jsx';import Vault from '../src/KingdomVault.jsx';import Community from '../src/KingdomCommunity.jsx';
import {effectivePublic,publishCard,setFollow,updatePrivacy} from '../src/kingdomService.js';
async function run(){
 const card={id:'20000000-0000-4000-8000-000000000001',name:'Test creation',frame:'fullart',rules:'Keep this',art:'',layers:{name:{x:10}},customLayers:[]};
 assert.equal(effectivePublic({...card,visibility:'public',collectionId:'secret'},[{id:'secret',visibility:'private'}],{is_public:true}),false);
 assert.equal(effectivePublic({...card,visibility:'private'},[],{is_public:true}),false);
 assert.equal(effectivePublic({...card,visibility:'public'},[],{is_public:false}),false);
 const root=createRoot(document.getElementById('root'));let destination;await act(async()=>root.render(<Home saved={[card]} onNavigate={value=>{destination=value}} onOpen={()=>{}}/>));
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);const gathering=[...document.querySelectorAll('nav[aria-label="Explore The Proxy Plane"] button')].find(b=>b.querySelector('strong')?.textContent==='Gathering Plane');assert(gathering,'Homepage exposes the Gathering Plane navigation action');await act(async()=>gathering.click());assert.equal(destination,'kingdom');assert(document.body.textContent.includes('The Proxy Plane'));
 let cards,groups,signIn=false;
 function Harness(){const [items,setItems]=useState([card]);const [collections,setCollections]=useState([]);cards=items;groups=collections;return <Vault cards={items} collections={collections} onCollections={setCollections} onCardChange={(id,patch)=>setItems(old=>old.map(c=>c.id===id?{...c,...patch}:c))} onOpen={()=>{}} onRemove={()=>{}} client={null} user={null} onSignIn={()=>{signIn=true}} onLoadCloud={()=>{}} onBackup={()=>{}}/>}
 await act(async()=>root.render(<Harness/>));const name=document.querySelector('form input');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(name,'Moonlit creations');name.dispatchEvent(new window.Event('input',{bubbles:true}));});
 await act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(groups[0].visibility,'private');assert(document.body.textContent.includes('Private collection created'));
 const select=async(label,value)=>{const el=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith(label))?.querySelector('select');assert(el,label);await act(async()=>{el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));});};
 await select('Collection',groups[0].id);assert.equal(cards[0].collectionId,groups[0].id);await select('Visibility for Moonlit creations','public');assert.equal(groups[0].visibility,'public');assert.equal(cards[0].visibility,undefined);
 await act(async()=>button('Share ↗').click());await act(async()=>button('Publish to Gathering Plane').click());assert(signIn);assert.equal(cards[0].publishedAt,undefined);assert.equal(cards[0].rules,'Keep this');
 await act(async()=>root.render(<Community client={null} user={null} onSignIn={()=>{}} onVault={()=>{}}/>));assert(document.body.textContent.includes('Community accounts are not connected yet'));assert(document.body.textContent.includes('Cardsmiths'));
 await act(async()=>root.unmount());
 const events=[];let failUpload=false,publicProfile=true;
 function from(table){let action,payload;const builder={select(){return this},eq(){return this},upsert(value){action='upsert';payload=value;events.push({table,action,payload});return this},update(value){action='update';payload=value;events.push({table,action,payload});return this},async maybeSingle(){return {data:{id:'owner',is_public:publicProfile},error:null}},async single(){return {data:{id:card.id},error:null}},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return builder;}
 const client={from,storage:{from:()=>({upload:async()=>{events.push({action:'upload'});return {error:failUpload?new Error('Upload failed'):null}}})}};
 await publishCard(client,{id:'owner'},card,[],new Blob(['png']),{kind:'proxy',caption:'Hello'});assert(events.find(e=>e.table==='proxy_kingdom_projects'&&e.action==='upsert').payload.visibility==='private');assert(events.findIndex(e=>e.action==='upload')>events.findIndex(e=>e.table==='proxy_kingdom_projects'));assert(events.at(-1).payload.visibility==='public');
 events.length=0;failUpload=true;let error;try{await publishCard(client,{id:'owner'},card,[],new Blob(['png']),{kind:'art',caption:''})}catch(e){error=e}assert(error?.cardMadePrivate);assert(!events.some(e=>e.payload?.visibility==='public'));
 publicProfile=false;events.length=0;await assert.rejects(()=>publishCard(client,{id:'owner'},card,[],new Blob(['png']),{kind:'art',caption:''}));assert.equal(events.length,0);
 await assert.rejects(()=>updatePrivacy(client,{id:'other'},{...card,cloudOwnerId:'owner',publishedAt:'2026-10-30'},[]));
 await assert.rejects(()=>updatePrivacy(client,{id:'owner'},{...card,publishedAt:'2026-10-30'},[]));
 await assert.rejects(()=>setFollow(client,{id:'owner'},'owner',false));
 console.log('Passed Home navigation, Cardsmith labels, private collection defaults, vault organization, account gate, eligibility and fail-private publication order checks.');
}run().catch(error=>{console.error(error);process.exitCode=1});
