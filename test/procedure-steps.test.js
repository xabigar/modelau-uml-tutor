import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStep, stepList } from '../public/procedure-steps.js';
test('class diagram progresses through classes, attributes, associations, multiplicities, methods, review',()=>{
 assert.equal(detectStep('class',[],[]),'classes');
 assert.equal(detectStep('class',[{members:''}],[]),'attributes');
 assert.equal(detectStep('class',[{members:'-nombre : String'}],[]),'associations');
 assert.equal(detectStep('class',[{members:'-nombre : String'}],[{arrow:'-->',m1:'',m2:''}]),'multiplicities');
 assert.equal(detectStep('class',[{members:'-nombre : String'}],[{arrow:'-->',m1:'1',m2:'*'}]),'methods');
 assert.equal(detectStep('class',[{members:'-nombre : String\n+hacerAlgo()'}],[{arrow:'-->',m1:'1',m2:'*'}]),'review');
 assert.deepEqual(stepList('class'),['classes','attributes','associations','multiplicities','methods','review']);
});
test('inheritance and dependency arrows are exempt from the multiplicity step',()=>{
 const elements=[{members:'-x : int'}];
 assert.equal(detectStep('class',elements,[{arrow:'--|>',m1:'',m2:''}]),'methods');
});
test('use case diagram progresses through actors, use cases, links, review',()=>{
 assert.equal(detectStep('usecase',[],[]),'actors');
 assert.equal(detectStep('usecase',[{kind:'actor'}],[]),'useCases');
 assert.equal(detectStep('usecase',[{kind:'actor'},{kind:'usecase'}],[]),'links');
 assert.equal(detectStep('usecase',[{kind:'actor',id:'A'},{kind:'usecase',id:'U'}],[{from:'A',to:'U'}]),'review');
});
test('sequence diagram progresses through participants, messages, full connection, fragments, review',()=>{
 assert.equal(detectStep('sequence',[],[]),'participants');
 assert.equal(detectStep('sequence',[{id:'A'}],[]),'messages');
 assert.equal(detectStep('sequence',[{id:'A'},{id:'B'},{id:'C'}],[{from:'A',to:'B'}]),'allConnected');
 assert.equal(detectStep('sequence',[{id:'A'},{id:'B'}],[{from:'A',to:'B'}],'participant A\nparticipant B\nA -> B : hi'),'fragments');
 assert.equal(detectStep('sequence',[{id:'A'},{id:'B'}],[{from:'A',to:'B'}],'alt cond\nA -> B : hi\nend'),'review');
});
