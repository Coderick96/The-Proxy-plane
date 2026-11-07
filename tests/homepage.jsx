import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import Home from '../src/Home.jsx';
import {PremiumContext} from '../src/PremiumContext.jsx';

async function run(){
 const root=createRoot(document.getElementById('root'));
 const routes=[];let signins=0,artOpens=0,opened=null;
 const navigate=id=>routes.push(id);
 const button=text=>[...document.querySelectorAll('button')].find(item=>item.textContent.includes(text));
 const props={onNavigate:navigate,onSignIn:()=>signins++,onOpenAI:()=>artOpens++,onOpen:card=>opened=card,client:{auth:{}}};
 await act(async()=>root.render(<Home {...props}/>));
 assert.equal(document.querySelectorAll('h1').length,1);
 assert(document.body.textContent.includes('10 starter credits'));
 assert(document.body.textContent.includes('200 credits / paid month'));
 assert(document.body.textContent.includes('Sign in to view your balance'));
 assert(document.body.textContent.includes('unaffiliated with and not endorsed by Wizards of the Coast'));
 for(const [label,id] of [['Search Cards','library'],['Create a Card','studio'],['Print Proxies','print'],['My Vault','vault'],['Gathering Plane','kingdom'],['Premium','premium'],['Import a deck','deck']]){
  await act(async()=>button(label).click());assert.equal(routes.at(-1),id,`real ${label} destination`);
 }
 await act(async()=>button('AI Art Studio').click());assert.equal(artOpens,1);
 await act(async()=>button('Sign in').click());assert.equal(signins,1);
 const card={id:'saved-one',name:'Moonlit Companion',visibility:'private'};
 await act(async()=>root.render(<PremiumContext.Provider value={{access:{credits:27,policyVersion:30}}}><Home {...props} saved={[card]} user={{id:'account-one',user_metadata:{display_name:'Chase'}}}/></PremiumContext.Provider>));
 assert(document.body.textContent.includes('Welcome back, Chase.'));
 assert(document.body.textContent.includes('27 credits'));
 assert(!document.body.textContent.includes('Sign in to view your balance'));
 await act(async()=>button('Moonlit Companion').click());assert.equal(opened,card);
 await act(async()=>root.render(<Home {...props} client={{rpc:()=>Promise.reject(new Error('offline'))}}/>));
 assert.equal(document.querySelectorAll('.plane-showcase-card img').length,3);
 assert.equal(document.querySelector('.plane-showcase-card img').getAttribute('src'),'/home-staples/sol-ring.jpg');
 assert(button('Sign in').disabled);
 assert(document.body.textContent.includes('Cloud sign-in is not configured'));
 await act(async()=>root.unmount());
 console.log('PASS homepage: actual navigation callbacks, account states, credit terms, recent-card editing, disclaimer and offline artwork fallback (simulated DOM).');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
