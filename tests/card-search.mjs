import assert from 'node:assert/strict';
import {buildCardSearch,matchingSets,cardSearchUrl,cardPriceLabel} from '../src/cardSearch.js';
assert.equal(buildCardSearch('Sol Ring'),'(Sol Ring)');
assert.equal(buildCardSearch('',{set:'BLB',colors:[],rarities:[]}),'set:blb');
assert.equal(buildCardSearch('',{set:'',colors:['w','u','c'],rarities:['rare','mythic']}),'(c:w or c:u or c:c) (r:rare or r:mythic)');
assert.equal(buildCardSearch('t:dragon or t:angel',{set:'m21',colors:['r'],rarities:['rare']}),'(t:dragon or t:angel) set:m21 (c:r) (r:rare)');
assert.equal(buildCardSearch('',{set:'blb) or *',colors:['invalid'],rarities:['invalid']}),'');
assert.equal(buildCardSearch('   '),'');
const sets=[{name:'Alpha',code:'lea',released_at:'1993-08-05'},{name:'Bloomburrow',code:'blb',released_at:'2024-08-02'}];
assert.deepEqual(matchingSets(sets,'BLB').map(s=>s.code),['blb']);
assert.deepEqual(matchingSets(sets,'bloom').map(s=>s.code),['blb']);
assert.deepEqual(matchingSets(sets,'').map(s=>s.code),['blb','lea']);
assert.equal(matchingSets(sets,'no such set').length,0);
console.log('PASS card search: filter-only sets, any-color and rarity unions, advanced OR grouping, invalid filter rejection, code/name lookup and newest-first set browsing.');

for(const [id,order,dir] of [['released-desc','released','desc'],['price-asc','usd','asc'],['price-desc','usd','desc'],['mana-asc','cmc','asc'],['mana-desc','cmc','desc']]){const u=new URL(cardSearchUrl('t:dragon or t:angel',{set:'blb',colors:['u'],rarities:['rare']},id));assert.equal(u.searchParams.get('order'),order);assert.equal(u.searchParams.get('dir'),dir);assert.equal(u.searchParams.get('unique'),'cards');assert.equal(u.searchParams.get('q'),'(t:dragon or t:angel) set:blb (c:u) (r:rare)');}
assert.equal(new URL(cardSearchUrl('',undefined,'untrusted&dir=asc')).searchParams.get('order'),'released');
assert.equal(new URL(cardSearchUrl('')).searchParams.get('q'),'game:paper');
assert.equal(cardPriceLabel({prices:{usd:'0.00'}}),'$0.00 USD');
assert.equal(cardPriceLabel({prices:{usd:'12.5'}}),'$12.50 USD');
for(const usd of [null,undefined,'',-1,'bad'])assert.equal(cardPriceLabel({prices:{usd}}),'USD price unavailable');
console.log('PASS catalog sorting: all USD/mana directions, default/fallback sort, grouped filter preservation, no hidden price predicate, zero/missing price labels.');
