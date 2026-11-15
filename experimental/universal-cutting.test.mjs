import test from 'node:test';
import assert from 'node:assert/strict';
import {MACHINE_PROFILES,PAPER_SIZES,MTG_CARD,buildCutLayout,exportCutSvg,exportCutDxf} from './universal-cutting.mjs';

test('all machine profiles build a 4-card letter layout',()=>{
 for(const machine of Object.keys(MACHINE_PROFILES)){
  const l=buildCutLayout({machine});
  assert.equal(l.cards.length,4);
  assert.equal(l.requiresRegistrationSetup,true);
  assert.ok(l.cards.every(c=>c.width===63.5&&c.height===88.9&&c.radius===3));
 }
});
test('card coordinates are within paper bounds',()=>{
 for(const paper of Object.keys(PAPER_SIZES)){
  const l=buildCutLayout({paper});
  assert.ok(l.cards.every(c=>c.x>=0&&c.y>=0&&c.x+c.width<=l.page.width&&c.y+c.height<=l.page.height));
 }
});
test('SVG includes mm page size and 4 cut rectangles',()=>{
 const s=exportCutSvg(buildCutLayout());
 assert.match(s,/width="215.9mm"/);
 assert.match(s,/height="279.4mm"/);
 assert.equal((s.match(/<rect /g)||[]).length,4);
 assert.match(s,/width="63.5" height="88.9"/);
});
test('DXF contains 4 closed polylines and terminator',()=>{
 const d=exportCutDxf(buildCutLayout());
 assert.equal((d.match(/\nPOLYLINE\n/g)||[]).length,4);
 assert.match(d,/\nEOF$/);
});
test('rejects invalid machine, paper, dimensions and overflow',()=>{
 assert.throws(()=>buildCutLayout({machine:'unknown'}));
 assert.throws(()=>buildCutLayout({paper:'unknown'}));
 assert.throws(()=>buildCutLayout({columns:0}));
 assert.throws(()=>buildCutLayout({radius:40}));
 assert.throws(()=>buildCutLayout({columns:3,rows:3}));
 assert.throws(()=>buildCutLayout({gap:-1}));
});
test('custom corner radius preserved',()=>{
 const l=buildCutLayout({radius:2.5});
 assert.ok(l.cards.every(c=>c.radius===2.5));
});
