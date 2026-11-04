import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDiagram } from '../public/diagram-checks.js';
test('class associations without multiplicity are flagged, inheritance and dependency are exempt',()=>{
 const relations=[
  {from:'A',to:'B',arrow:'-->',m1:'',m2:'',start:0},
  {from:'A',to:'C',arrow:'-->',m1:'1',m2:'*',start:1},
  {from:'A',to:'D',arrow:'--|>',m1:'',m2:'',start:2},
  {from:'A',to:'E',arrow:'..>',m1:'',m2:'',start:3}
 ];
 const issues=checkDiagram('class',[],relations);
 assert.deepEqual(issues,[{target:'relation',start:0,code:'noMultiplicity'}]);
});
test('isolated actors and use cases are flagged, connected ones are not',()=>{
 const elements=[{id:'U1',kind:'actor'},{id:'U2',kind:'actor'},{id:'C1',kind:'usecase'},{id:'C2',kind:'usecase'}];
 const relations=[{from:'U1',to:'C1',arrow:'-->'}];
 const issues=checkDiagram('usecase',elements,relations);
 assert.deepEqual(issues.map(i=>i.id).sort(),['C2','U2']);
 assert.ok(issues.every(i=>i.target==='element'));
});
test('isolated sequence participants are flagged',()=>{
 const elements=[{id:'P1'},{id:'P2'},{id:'P3'}];
 const relations=[{from:'P1',to:'P2'}];
 const issues=checkDiagram('sequence',elements,relations);
 assert.deepEqual(issues,[{target:'element',id:'P3',code:'isolatedParticipant'}]);
});
