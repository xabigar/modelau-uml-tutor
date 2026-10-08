import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiagramRelations, generateDiagramRelation, replaceDiagramRelation } from '../public/diagram-relations.js';

test('use-case include and extend reopen without duplicating their stereotypes',()=>{
  const source='@startuml\nSolicitar ..> Validar : <<include>> comprobar identidad\nRenovar ..> Solicitar : <<extend>> si está permitido\n@enduml';
  const items=parseDiagramRelations('usecase',source);
  assert.equal(items[0].kind,'include'); assert.equal(items[0].label,'comprobar identidad');
  assert.equal(items[1].kind,'extend'); assert.equal(items[1].label,'si está permitido');
  for(const item of items) assert.equal(generateDiagramRelation('usecase',item),item.raw);
  assert.equal(generateDiagramRelation('usecase',{...items[0],label:'validar'}),'Solicitar ..> Validar : <<include>> validar');
});
test('use-case reverse links preserve multiplicities and distinguish generalisation from dependency',()=>{
  const items=parseDiagramRelations('usecase','Actor "1" <- "*" Caso : utiliza\nGeneral <|-- Especifico\nA ..> B : revisa');
  assert.deepEqual([items[0].from,items[0].to,items[0].m1,items[0].m2],['Caso','Actor','*','1']);
  assert.equal(items[1].kind,'generalisation');assert.equal(items[1].from,'Especifico');
  assert.equal(items[2].kind,'dependency');
  assert.equal(generateDiagramRelation('usecase',items[0]),'Caso "*" --> "1" Actor : utiliza');
});
test('sequence messages retain source order, duplicates and reverse arrow meaning',()=>{
  const source='@startuml\nparticipant A\nparticipant B\nA -> B : preguntar\nalt válido\nB --> A : responder\nelse\nA -> B : preguntar\nend\nA <<- B : avisar\nA x<- B : perdido\nA <<-- B : devolver\n@enduml';
  const items=parseDiagramRelations('sequence',source);
  assert.deepEqual(items.map(m=>m.label),['preguntar','responder','preguntar','avisar','perdido','devolver']);
  assert.deepEqual(items.map(m=>m.arrow),['->','-->','->','->>','->x','-->>']);
  assert.notEqual(items[0].start,items[2].start);
  assert.equal(items[3].from,'B');assert.equal(items[3].to,'A');
});
test('comments, note bodies and declaration bodies do not become editable relationships',()=>{
  const source="participant A\n/'\nA -> B : comentario\n'/\nnote over A\nA -> B : nota\nend note\n' A -> B : comentario\nA -> B : real";
  assert.deepEqual(parseDiagramRelations('sequence',source,[{start:0,end:0}]).map(m=>m.label),['real']);
  const usecase="usecase A {\nA --> B : descripción\n}\nnote right of A\nA --> B : nota\nend note\nA --> B : real";
  assert.deepEqual(parseDiagramRelations('usecase',usecase,[{start:0,end:2}]).map(m=>m.label),['real']);
});
test('editing and deleting a duplicate message changes only its own line, leaving fragments intact',()=>{
  const source='@startuml\nalt condición\nA -> B : igual\nelse\nA -> B : igual\nend\n@enduml';
  const items=parseDiagramRelations('sequence',source);
  const changed=replaceDiagramRelation(source,items[1],generateDiagramRelation('sequence',{...items[1],label:'distinto'}));
  assert.equal(changed,'@startuml\nalt condición\nA -> B : igual\nelse\nA -> B : distinto\nend\n@enduml');
  assert.equal(replaceDiagramRelation(source,items[1]),'@startuml\nalt condición\nA -> B : igual\nelse\nend\n@enduml');
  assert.throws(()=>replaceDiagramRelation(changed,items[1],'A -> B : sobrescribir'));
});
test('message forms reject empty messages, invalid IDs and multiline injection',()=>{
  const item={from:'A',to:'B',arrow:'->',label:'hola'};
  for(const patch of [{label:''},{label:'uno\n@enduml'},{from:'A\nparticipant C'},{arrow:'invalid'}]) assert.throws(()=>generateDiagramRelation('sequence',{...item,...patch}));
  assert.throws(()=>generateDiagramRelation('usecase',{...item,arrow:'-->',kind:'include',label:'uno\n@enduml'}));
});
