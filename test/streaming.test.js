import test from 'node:test';
import assert from 'node:assert/strict';
import { readSSE, partialTutorMessage } from '../public/chat-stream.js';
import { buildStreamingRequest, streamTutorReply } from '../streaming.js';

function response(events) {
  const bytes = new TextEncoder().encode(events.map(event => 'data: '+(typeof event === 'string' ? event : JSON.stringify(event))+'\r\n\r\n').join(''));
  return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=3)controller.enqueue(bytes.slice(i,i+3));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}});
}
const reply = JSON.stringify({message:'¿Qué representa "Libro"?\nPiensa en su responsabilidad. 📚',highlights:[{quote:'Cada libro',category:'requirement',reason:'Una pista'}]});

test('SSE handles fragmented UTF-8, CRLF, multiline events, comments and trailing frames',async()=>{
  const raw=': ping\r\nevent: text\r\ndata: ¿Qué? 📚\r\ndata: segunda línea\r\n\r\ndata: final';
  const bytes=new TextEncoder().encode(raw);
  const stream=new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}});
  assert.deepEqual(await Array.fromAsync(readSSE(stream)),['¿Qué? 📚\nsegunda línea','final']);
});
test('partial tutor text decodes escaped strings at every boundary without exposing JSON',()=>{
  let previous='';
  for(let i=0;i<=reply.length;i++){
    const text=partialTutorMessage(reply.slice(0,i));
    assert.ok(JSON.parse(reply).message.startsWith(text));
    assert.ok(text.startsWith(previous));previous=text;
  }
  assert.equal(previous,JSON.parse(reply).message);
  assert.equal(partialTutorMessage('{"message":"a\\u00'), 'a');
  assert.equal(partialTutorMessage('{"message":"a\\u00f1\\ud83d'), 'añ');
  assert.equal(partialTutorMessage('{"message":"a\\u00f1\\ud83d\\udcda"}'), 'añ📚');
  assert.equal(partialTutorMessage('{"highlights":[{"message":"hidden"}],"message":"Visible"}'),'Visible');
  assert.equal(partialTutorMessage('```json\n{"message":"Visible'),'Visible');
});
test('all provider requests enable native streaming while preserving auth and context',()=>{
  for(const provider of ['openai','anthropic','compatible','gemini']){
    const request=buildStreamingRequest(provider,'chosen-model','test-key','tutor',[{role:'user',content:'Pista'}],'http://localhost:3001/v1');
    if(provider==='gemini')assert.ok(request.url.endsWith('chosen-model:streamGenerateContent?alt=sse'));
    else assert.equal(request.body.stream,true);
  }
});
test('each provider emits progressive message text and validates highlights at completion',async()=>{
  for(const provider of ['openai','compatible','anthropic','gemini']){
    const pieces=reply.match(/.{1,12}/gs);
    const events=pieces.map(text=>provider==='anthropic'?{type:'content_block_delta',delta:{type:'text_delta',text}}:provider==='gemini'?{candidates:[{content:{parts:[{text}]}}]}:{choices:[{delta:{content:text}}]});
    events.push(provider==='anthropic'?{type:'message_stop'}:provider==='gemini'?{candidates:[{finishReason:'STOP'}]}:'[DONE]');
    const output=await Array.fromAsync(streamTutorReply(provider,response(events),'Cada libro tiene un título.'));
    assert.ok(output.filter(e=>e.type==='delta').length>2);
    assert.equal(output.at(-1).message,JSON.parse(reply).message);
    assert.equal(output.at(-1).highlights.length,1);
    assert.equal(output.at(-1).type,'done');
    for(const delta of output.filter(e=>e.type==='delta'))assert.ok(JSON.parse(reply).message.startsWith(delta.text));
  }
});
test('streams reject provider errors, truncation and a disconnected stream without completion',async()=>{
  const first={choices:[{delta:{content:'{"message":"Hola'}}]};
  await assert.rejects(Array.fromAsync(streamTutorReply('openai',response([first]),'')),/interrumpió/);
  await assert.rejects(Array.fromAsync(streamTutorReply('openai',response([first,{error:{message:'SECRET raw provider error'}}]),'')),/cuota/);
  await assert.rejects(Array.fromAsync(streamTutorReply('openai',response([{choices:[{finish_reason:'length'}]}]),'')),/completar/);
  await assert.rejects(Array.fromAsync(streamTutorReply('anthropic',response([{type:'message_delta',delta:{stop_reason:'max_tokens'}}]),'')),/longitud/);
  await assert.rejects(Array.fromAsync(streamTutorReply('gemini',response([{candidates:[{finishReason:'MAX_TOKENS'}]}]),'')),/completar/);
});
test('compatible non-streaming responses still work and strip invalid highlights',async()=>{
  const res=new Response(JSON.stringify({choices:[{message:{content:reply}}]}),{headers:{'Content-Type':'application/json'}});
  const output=await Array.fromAsync(streamTutorReply('compatible',res,''));
  assert.deepEqual(output,[{type:'done',message:JSON.parse(reply).message,highlights:[],diagramHighlights:[]}]);
});
