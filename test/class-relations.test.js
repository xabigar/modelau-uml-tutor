import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClassRelations, generateClassRelation } from '../public/class-relations.js';
test('relationships preserve endpoints, multiplicities, labels and source locations',()=>{
 const source='@startuml\nUsuario "1" --> "*" Pedido : realiza\nUsuario --> Usuario : revisa\n@enduml';
 const result=parseClassRelations(source);
 assert.equal(result.length,2); assert.equal(result[0].start,1);
 assert.deepEqual([result[0].from,result[0].to,result[0].m1,result[0].m2,result[0].label],['Usuario','Pedido','1','*','realiza']);
 assert.equal(generateClassRelation(result[0]),source.split('\n')[1]);
 assert.equal(result[1].from,result[1].to);
});
test('class members and comments do not become relationship cards',()=>{
 const source='class A {\n  A --> B\n}\n\' A --> B\nA --> B\n!include something';
 assert.equal(parseClassRelations(source,[{start:0,end:2}]).length,1);
 assert.equal(parseClassRelations(source,[{start:0,end:2}])[0].start,4);
});
test('reverse arrows normalize without losing multiplicity direction',()=>{
 const result=parseClassRelations('Padre "1" <|-- "*" Hijo : hereda')[0];
 assert.deepEqual([result.from,result.to,result.arrow,result.m1,result.m2],['Hijo','Padre','--|>','*','1']);
 assert.equal(generateClassRelation(result),'Hijo "*" --|> "1" Padre : hereda');
});
test('duplicate relationships retain distinct source positions and reject injected field values',()=>{
 const source='@startuml\nA --> B : primero\nA --> B : primero\n@enduml';
 const result=parseClassRelations(source);
 assert.equal(result.length,2);
 assert.equal(result[0].raw,result[1].raw);
 assert.notEqual(result[0].start,result[1].start);
 assert.throws(()=>generateClassRelation({...result[0],m1:'1"\n@enduml'}));
 assert.throws(()=>generateClassRelation({...result[0],label:'texto\nclass Otra'}));
});
