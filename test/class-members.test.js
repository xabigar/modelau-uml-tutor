import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClassMembers, serializeClassMembers } from '../public/class-members.js';
test('class editor restores visibility, attribute types, method parameters and return types',()=>{
 const source='-id : int\n#nombre : String\n+buscar(id : int, clave : String) : boolean';
 const parsed=parseClassMembers(source);
 assert.equal(parsed.attributes[0].visibility,'-');
 assert.equal(parsed.attributes[1].type,'String');
 assert.equal(parsed.methods[0].parameters,'id : int, clave : String');
 assert.equal(parsed.methods[0].type,'boolean');
 assert.equal(serializeClassMembers(parsed),source);
});
test('editing retains static/abstract modifiers and unsupported member text',()=>{
 const parsed=parseClassMembers('{static} +total : int\n{abstract} #calcular() : double\n-- Responsabilidades --\n+List<String> obtenerNombres()');
 const generated=serializeClassMembers(parsed);
 assert.match(generated,/\{static\} \+total : int/);
 assert.match(generated,/\{abstract\} #calcular\(\) : double/);
 assert.match(generated,/-- Responsabilidades --/);
 assert.match(generated,/\+List<String> obtenerNombres\(\)/);
});
test('blank rows are ignored, partially completed or injected members are rejected',()=>{
 assert.equal(serializeClassMembers({attributes:[{visibility:'-',name:'',type:''}],methods:[]}), '');
 assert.throws(()=>serializeClassMembers({attributes:[{visibility:'-',name:'',type:'int'}],methods:[]}));
 assert.throws(()=>serializeClassMembers({attributes:[],methods:[{visibility:'+',name:'buscar',parameters:'id)\n@enduml',type:''}]}));
});
