import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { encodePlantUML, parseTutorReply, buildRequest } from '../lib.js';
test('PlantUML encoding round trips UTF-8 and aligns with the PlantUML alphabet',()=>{
 const code='@startuml\nclass Usuario\nUsuario -> Sistema : petición\n@enduml';
 const encoded=encodePlantUML(code);const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';const bytes=[];
 for(let i=0;i<encoded.length;i+=4){const [a,b,c,d]=encoded.slice(i,i+4).split('').map(x=>alphabet.indexOf(x));bytes.push((a<<2)|(b>>4),((b&15)<<4)|(c>>2),((c&3)<<6)|d);}
 assert.equal(inflateRawSync(Buffer.from(bytes)).toString(),code);
});
test('tutor highlights only exact exercise quotes and known categories',()=>{
 const result=parseTutorReply(JSON.stringify({message:'¿Quién inicia la petición?',highlights:[{quote:'El usuario',category:'actor',reason:'Inicia la interacción'},{quote:'inventado',category:'actor',reason:'No existe'},{quote:'usuario',category:'script',reason:'No válida'}]}),'El usuario pide un préstamo.');
 assert.equal(result.highlights.length,1);assert.equal(result.highlights[0].quote,'El usuario');
 assert.deepEqual(parseTutorReply('plain response',''),{message:'plain response',highlights:[]});
});
test('provider adapters place system instructions and credentials correctly',()=>{
 const messages=[{role:'user',content:'Ayúdame'}];
 const a=buildRequest('anthropic','model','secret','tutor',messages);assert.equal(a.body.system,'tutor');assert.equal(a.headers['x-api-key'],'secret');
 const g=buildRequest('gemini','model','secret','tutor',messages);assert.equal(g.body.contents[0].role,'user');assert.equal(g.headers['x-goog-api-key'],'secret');assert.equal(g.body.generationConfig.responseMimeType,'application/json');
 const o=buildRequest('openai','model','secret','tutor',messages);assert.equal(o.body.messages[0].role,'system');
 const c=buildRequest('compatible','model','secret','tutor',messages,'http://localhost:11434/v1/');assert.equal(c.url,'http://localhost:11434/v1/chat/completions');assert.equal(c.body.response_format,undefined);
 assert.throws(()=>buildRequest('unknown','m','k','s',messages));assert.throws(()=>buildRequest('compatible','m','k','s',messages,'file:///tmp/key'));
});
