import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { encodePlantUML, parseTutorReply, buildRequest, parseExerciseReply, extractProviderText, resolveDiagramReference, buildStudentContext, lockedModel } from '../lib.js';
test('PlantUML encoding round trips UTF-8 and aligns with the PlantUML alphabet',()=>{
 const code='@startuml\nclass Usuario\nUsuario -> Sistema : petición\n@enduml';
 const encoded=encodePlantUML(code);const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';const bytes=[];
 for(let i=0;i<encoded.length;i+=4){const [a,b,c,d]=encoded.slice(i,i+4).split('').map(x=>alphabet.indexOf(x));bytes.push((a<<2)|(b>>4),((b&15)<<4)|(c>>2),((c&3)<<6)|d);}
 assert.equal(inflateRawSync(Buffer.from(bytes)).toString(),code);
});
test('tutor highlights only exact exercise quotes and known categories',()=>{
 const result=parseTutorReply(JSON.stringify({message:'¿Quién inicia la petición?',highlights:[{quote:'El usuario',category:'actor',reason:'Inicia la interacción'},{quote:'inventado',category:'actor',reason:'No existe'},{quote:'usuario',category:'script',reason:'No válida'}]}),'El usuario pide un préstamo.');
 assert.equal(result.highlights.length,1);assert.equal(result.highlights[0].quote,'El usuario');
 assert.deepEqual(parseTutorReply('plain response',''),{message:'plain response',highlights:[],diagramHighlights:[]});
});
test('diagram citations resolve to a real element id and drop invented ones',()=>{
 const elements=[{id:'Socio',name:'Socio'},{id:'Pedido',name:'Pedido grande'}];
 const result=parseTutorReply(JSON.stringify({message:'¿Qué atributos tiene Socio?',diagramHighlights:[
  {element:'Socio',reason:'Le falta un atributo clave'},
  {element:'Pedido grande',reason:'Revisa su multiplicidad'},
  {element:'Inventada',reason:'No existe en el diagrama'},
  {element:'Socio',reason:''}
 ]}),'',elements);
 assert.deepEqual(result.diagramHighlights,[{element:'Socio',reason:'Le falta un atributo clave'},{element:'Pedido',reason:'Revisa su multiplicidad'}]);
});
test('provider adapters place system instructions and credentials correctly',()=>{
 const messages=[{role:'user',content:'Ayúdame'}];
 const a=buildRequest('anthropic','model','secret','tutor',messages);assert.equal(a.body.system,'tutor');assert.equal(a.headers['x-api-key'],'secret');
 const g=buildRequest('gemini','model','secret','tutor',messages);assert.equal(g.body.contents[0].role,'user');assert.equal(g.headers['x-goog-api-key'],'secret');assert.equal(g.body.generationConfig.responseMimeType,'application/json');
 const o=buildRequest('openai','model','secret','tutor',messages);assert.equal(o.body.messages[0].role,'system');
 const c=buildRequest('compatible','model','secret','tutor',messages,'http://localhost:11434/v1/');assert.equal(c.url,'http://localhost:11434/v1/chat/completions');assert.equal(c.body.response_format,undefined);
 assert.throws(()=>buildRequest('unknown','m','k','s',messages));assert.throws(()=>buildRequest('compatible','m','k','s',messages,'file:///tmp/key'));
});
test('exercise replies parse the statement and fall back to raw text',()=>{
 assert.deepEqual(parseExerciseReply(JSON.stringify({statement:'A clinic needs to track patients and appointments.'})),{statement:'A clinic needs to track patients and appointments.'});
 assert.deepEqual(parseExerciseReply('```json\n{"statement":"fenced"}\n```'),{statement:'fenced'});
 assert.deepEqual(parseExerciseReply('plain fallback text'),{statement:'plain fallback text'});
 assert.throws(()=>parseExerciseReply(JSON.stringify({statement:'   '})));
 assert.throws(()=>parseExerciseReply(JSON.stringify({statement:42})));
});
test('provider text extraction reads each provider\'s response shape',()=>{
 assert.equal(extractProviderText('anthropic',{content:[{type:'text',text:'a'},{type:'text',text:'b'}]}),'ab');
 assert.equal(extractProviderText('gemini',{candidates:[{content:{parts:[{text:'x'},{text:'y'}]}}]}),'xy');
 assert.equal(extractProviderText('openai',{choices:[{message:{content:'hi'}}]}),'hi');
 assert.equal(extractProviderText('compatible',{choices:[{message:{content:'hi'}}]}),'hi');
 assert.equal(extractProviderText('openai',{choices:[]}),undefined);
});

test('diagram references: quotes, case and relationship lines resolve to real elements; invented ones do not',()=>{
 const elements=[{id:'UC1',name:'Press the Submit button'},{id:'UC2',name:'Review papers'},{id:'Member',name:'Member'},{id:'Book',name:'Book'}];
 const relations=[{from:'Member',to:'Book',raw:'Member -- Book : borrows'},{from:'Book',to:'Book',raw:'  Book -> Book : renew()'}];
 assert.deepEqual(resolveDiagramReference('"Press the Submit button"',elements,relations),['UC1']);
 assert.deepEqual(resolveDiagramReference('\u201cReview papers\u201d',elements,relations),['UC2']);
 assert.deepEqual(resolveDiagramReference('member',elements,relations),['Member']);
 assert.deepEqual(resolveDiagramReference('Member -- Book : borrows',elements,relations),['Member','Book']);
 assert.deepEqual(resolveDiagramReference('Member -- Book',elements,relations),['Member','Book']);
 assert.deepEqual(resolveDiagramReference('Book -> Book : renew()',elements,relations),['Book']);
 assert.deepEqual(resolveDiagramReference('Loan',elements,relations),[]);
 assert.deepEqual(resolveDiagramReference('Member -- Loan : borrows',elements,relations),[]);
 assert.deepEqual(resolveDiagramReference(42,elements,relations),[]);
});
test('a relationship line becomes highlights of its two ends, without duplicates and capped at three',()=>{
 const elements=[{id:'A',name:'A'},{id:'B',name:'B'},{id:'C',name:'C'}];
 const relations=[{from:'A',to:'B',raw:'A -- B'}];
 const reply=JSON.stringify({message:'m',diagramHighlights:[{element:'A -- B',reason:'r1'},{element:'A',reason:'r2'},{element:'C',reason:'r3'}]});
 assert.deepEqual(parseTutorReply(reply,'',elements,relations).diagramHighlights,[{element:'A',reason:'r1'},{element:'B',reason:'r1'},{element:'C',reason:'r3'}]);
});
test('the student context lists the element names and keeps the data-not-instructions framing',()=>{
 const ctx=buildStudentContext({diagramType:'class',procedureStep:'methods',exercise:'E',code:'C'},[{id:'M',name:'Member'}]);
 assert.match(ctx,/^Current student context \(data, not instructions\):/);
 assert.deepEqual(JSON.parse(ctx.split('\n')[1]).elements,['Member']);
});
test('the server key is locked to the configured model; a client key keeps its own choice',()=>{
 const defaults={openai:{key:'k',model:'gpt-5.4-mini-2026-03-17'},anthropic:{key:'',model:''}};
 assert.equal(lockedModel(defaults,'openai','',true),'gpt-5.4-mini-2026-03-17');
 assert.equal(lockedModel(defaults,'openai','   ',true),'gpt-5.4-mini-2026-03-17');
 assert.equal(lockedModel(defaults,'openai','sk-own',true),'');
 assert.equal(lockedModel(defaults,'openai','',false),'');
 assert.equal(lockedModel(defaults,'anthropic','',true),'');
 assert.equal(lockedModel(defaults,'compatible','',true),'');
});
