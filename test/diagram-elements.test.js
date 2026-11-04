import test from 'node:test';
import assert from 'node:assert/strict';
import { parseElements } from '../public/diagram-elements.js';
test('parses simple and quoted-name declarations per diagram type',()=>{
 const classes=parseElements('class','@startuml\nclass Usuario\nclass "Pedido grande" as Pedido {\n  -total : int\n}\n@enduml');
 assert.equal(classes.length,2);
 assert.deepEqual([classes[0].id,classes[0].name],['Usuario','Usuario']);
 assert.deepEqual([classes[1].id,classes[1].name,classes[1].members],['Pedido','Pedido grande','-total : int']);
});
test('recognises actors and use cases but not unrelated keywords',()=>{
 const elements=parseElements('usecase','@startuml\nactor Cliente\nusecase "Hacer pedido" as UC1\nnote "no es un elemento" as N1\n@enduml');
 assert.equal(elements.length,2);
 assert.deepEqual(elements.map(e=>e.kind),['actor','usecase']);
});
test('sequence participants without a block still parse with matching start/end',()=>{
 const elements=parseElements('sequence','participant Cliente\nactor Vendedor');
 assert.equal(elements.length,2);
 assert.deepEqual([elements[0].start,elements[0].end],[0,0]);
 assert.deepEqual([elements[1].start,elements[1].end],[1,1]);
});
