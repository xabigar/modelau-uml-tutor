import test from 'node:test';
import assert from 'node:assert/strict';
import { modelListRequest, normalizeModels, discoverModels } from '../models.js';
import { buildRequest } from '../lib.js';

const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
test('model listing uses provider-specific URLs and authentication, with optional local credentials', () => {
  const openai = modelListRequest('openai','secret');
  assert.equal(openai.url,'https://api.openai.com/v1/models');
  assert.deepEqual(openai.headers,{Authorization:'Bearer secret'});
  assert.deepEqual(modelListRequest('anthropic','secret').headers,{'x-api-key':'secret','anthropic-version':'2023-06-01'});
  assert.equal(modelListRequest('gemini','secret').headers['x-goog-api-key'],'secret');
  const local = modelListRequest('compatible','','http://localhost:11434/v1/');
  assert.equal(local.url,'http://localhost:11434/v1/models');
  assert.deepEqual(local.headers,{});
  assert.deepEqual(buildRequest('compatible','local-model','','s',[],'http://localhost:11434/v1').headers,{});
  for (const endpoint of ['file:///tmp/key','https://user:pass@example.com/v1','https://example.com/v1?key=secret','https://example.com/#fragment']) assert.throws(()=>modelListRequest('compatible','key',endpoint),e=>e.code==='serverInvalid');
  assert.throws(()=>modelListRequest('unknown','key'),e=>e.code==='providerInvalid');
  assert.throws(()=>modelListRequest('openai',''),e=>e.code==='modelsKeyRequired');
  assert.throws(()=>modelListRequest('openai','key\nheader'),e=>e.code==='modelsKeyRequired');
});
test('normalization handles native formats, duplicate IDs and only Gemini generateContent models', () => {
  assert.deepEqual(normalizeModels('anthropic',{data:[{id:'b',display_name:'Bee'},{id:'a',display_name:'Aye'},{id:'b',display_name:'Bee'},null,{id:''}]}),[{id:'a',name:'Aye'},{id:'b',name:'Bee'}]);
  assert.deepEqual(normalizeModels('gemini',{models:[{name:'models/chat',displayName:'Chat',supportedGenerationMethods:['generateContent']},{name:'models/embedding',supportedGenerationMethods:['embedContent']},{name:'models/invalid',supportedGenerationMethods:{}}]}),[{id:'chat',name:'Chat'}]);
  assert.deepEqual(normalizeModels('compatible',{models:[{name:'local-a'},{model:'local-b'}]}),[{id:'local-a',name:'local-a'},{id:'local-b',name:'local-b'}]);
  assert.throws(()=>normalizeModels('openai',{error:'not a list'}),e=>e.code==='modelsResponseInvalid');
});
test('Anthropic and Gemini pagination fetch every page and deduplicate without changing auth', async () => {
  for (const provider of ['anthropic','gemini']) {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({url,options});
      if (provider==='anthropic') return reply(calls.length===1 ? {data:[{id:'a'}],has_more:true,last_id:'a/next'} : {data:[{id:'a'},{id:'b'}],has_more:false});
      return reply(calls.length===1 ? {models:[{name:'models/a',supportedGenerationMethods:['generateContent']}],nextPageToken:'next+/='} : {models:[{name:'models/b',supportedGenerationMethods:['generateContent']}]});
    };
    const result = await discoverModels(provider,'secret',undefined,{fetchImpl});
    assert.deepEqual(result.models.map(m=>m.id),['a','b']);
    assert.equal(calls.length,2);
    assert.equal(new URL(calls[1].url).searchParams.get(provider==='anthropic'?'after_id':'pageToken'),provider==='anthropic'?'a/next':'next+/=');
    assert.deepEqual(calls[0].options.headers,calls[1].options.headers);
    assert.equal(calls[0].options.redirect,'error');
    assert.equal(calls[0].options.body,undefined);
  }
});
test('empty results remain valid and provider errors never echo credentials or upstream bodies', async () => {
  assert.deepEqual(await discoverModels('openai','secret',undefined,{fetchImpl:async()=>reply({data:[]})}),{models:[]});
  for (const [status,code] of [[401,'modelsAuthError'],[403,'modelsAuthError'],[404,'modelsNotSupported'],[429,'modelsRateLimit'],[500,'modelsProviderError']]) {
    await assert.rejects(discoverModels('openai','secret',undefined,{fetchImpl:async()=>reply({error:'secret'},status)}),e=>e.code===code&&e.upstreamStatus===status&&!e.message.includes('secret'));
  }
  await assert.rejects(discoverModels('openai','secret',undefined,{fetchImpl:async()=>new Response('not json')}),e=>e.code==='modelsResponseInvalid');
  await assert.rejects(discoverModels('openai','secret',undefined,{fetchImpl:async()=>{throw new Error('secret network failure');}}),e=>e.code==='modelsNetworkError'&&!e.message.includes('secret'));
  await assert.rejects(discoverModels('openai','secret',undefined,{signal:AbortSignal.abort(),fetchImpl:async()=>{throw new Error('abort');}}),e=>e.code==='modelsTimeout');
});
test('repeated or missing pagination cursors fail rather than loop or return a partial list', async () => {
  await assert.rejects(discoverModels('anthropic','secret',undefined,{fetchImpl:async()=>reply({data:[{id:'a'}],has_more:true,last_id:'a'})}),e=>e.code==='modelsResponseInvalid');
  await assert.rejects(discoverModels('anthropic','secret',undefined,{fetchImpl:async()=>reply({data:[],has_more:true})}),e=>e.code==='modelsResponseInvalid');
});
