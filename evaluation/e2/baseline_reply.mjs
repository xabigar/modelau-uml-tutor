// Generates the conventional-chat reply for the demo exercise: same model, the no-corrections baseline prompt of E1,
// the exercise and the PlantUML code pasted in the message, as a student would do in a generic chat.
// Run:  node --env-file=../../../modelau-uml-tutor/.env baseline_reply.mjs
import { writeFileSync } from 'node:fs';
import { EXERCISE, MEMBER, REST, RELATIONS, wrap, QUESTION } from './scenario.mjs';
import { BASELINE_NOCORR_PROMPT } from '../e1/seeds.js';

const model = 'gpt-5.4-mini-2026-03-17';
const user = `Exercise statement:\n${EXERCISE}\n\nCurrent diagram (PlantUML):\n${wrap(MEMBER + '\n' + REST + '\n' + RELATIONS)}\n\nQuestion: ${QUESTION}`;
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({ model, messages: [{ role: 'system', content: BASELINE_NOCORR_PROMPT }, { role: 'user', content: user }] }),
});
if (!res.ok) throw new Error(`OpenAI ${res.status}`);
const out = (await res.json()).choices[0].message.content;
writeFileSync('baseline_reply.json', JSON.stringify({ model, user, reply: out }, null, 1));
console.log(out.slice(0, 1500), '\n… words:', out.split(/\s+/).length);
