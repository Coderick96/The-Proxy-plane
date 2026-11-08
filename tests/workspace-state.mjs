import assert from 'node:assert/strict';import {workspaceScope,cloneGuestWork} from '../src/workspaceState.js';
assert.notEqual(workspaceScope({id:'a'}),workspaceScope({id:'b'}));assert.equal(workspaceScope(null),'');
let count=0;const uuid=()=>`new-${++count}`;const source={id:'guest-card',name:'Original',visibility:'public',cloudOwnerId:'previous',publishedAt:'2026-10-30',collectionId:'guest-collection',layers:{name:{x:7}}};
const copied=cloneGuestWork([source],[{id:'guest-collection',name:'Guest set',visibility:'public'}],[],[],uuid);
assert.equal(copied.added,1);assert.equal(copied.cards[0].visibility,'private');assert.equal(copied.collections[0].visibility,'private');assert.equal(copied.cards[0].cloudOwnerId,null);assert.equal(copied.cards[0].publishedAt,null);assert.notEqual(copied.cards[0].id,source.id);assert.equal(source.visibility,'public');assert.equal(cloneGuestWork([source],[],copied.cards,copied.collections,uuid).added,0);
const existing=Array.from({length:1000},(_,i)=>({id:`existing-${i}`}));const full=cloneGuestWork([source],[],existing,[],uuid);assert.equal(full.added,0);assert.deepEqual(full.cards,existing);
console.log('Passed explicit guest-copy privacy, duplicate avoidance and full-vault data preservation.');
