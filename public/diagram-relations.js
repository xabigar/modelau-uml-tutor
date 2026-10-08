import { parseClassRelations, generateClassRelation } from './class-relations.js';

// Only simple editable lines become cards. Notes, comments and advanced syntax
// stay in the original source; editing one card replaces just its source line.
function excludedLines(source, elements) {
  const excluded = new Set(elements.flatMap(item => Array.from({length:item.end-item.start+1},(_,i)=>item.start+i)));
  let comment = false, note = false;
  source.split('\n').forEach((raw,index) => {
    const line = raw.trim();
    if (comment) { excluded.add(index); if (line.includes("'/")) comment=false; return; }
    if (note) { excluded.add(index); if (/^end\s*(?:h?note|rnote)\b/i.test(line)) note=false; return; }
    if (line.startsWith("/'")) { excluded.add(index); comment=!line.slice(2).includes("'/"); }
    if (/^(?:h?note|rnote)\b/i.test(line) && !line.includes(':') && !/^note\s+".*"\s+as\b/i.test(line)) { excluded.add(index); note=true; }
  });
  return excluded;
}

const useCasePattern = /^\s*([A-Za-z_]\w*)\s*(?:"([^"\r\n]*)"\s*)?(--\|>|<\|--|<-->|-->|<--|\.\.>|<\.\.|--|->|<-)\s*(?:"([^"\r\n]*)"\s*)?([A-Za-z_]\w*)(?:\s*:\s*(.*))?\s*$/;
const messagePattern = /^\s*([A-Za-z_]\w*)\s*(-->>|->>|->x|-->|->|<<--|<<-|x<-|<--|<-)\s*([A-Za-z_]\w*)(?:\s*:\s*(.*))?\s*$/;
const reversedUseCase = { '<|--':'--|>', '<--':'-->', '<-':'-->', '<..':'..>' };
const reversedMessage = { '<<--':'-->>', '<<-':'->>', 'x<-':'->x', '<--':'-->', '<-':'->' };

export function parseDiagramRelations(type, source, elements = []) {
  if (type === 'class') return parseClassRelations(source,elements);
  const excluded = excludedLines(source,elements);
  return source.split('\n').flatMap((raw,start) => {
    if (excluded.has(start)) return [];
    const match = raw.match(type === 'usecase' ? useCasePattern : messagePattern);
    if (!match) return [];
    if (type === 'usecase') {
      let [,from,m1='',arrow,m2='',to,label=''] = match;
      if (reversedUseCase[arrow]) { [from,to,m1,m2]=[to,from,m2,m1]; arrow=reversedUseCase[arrow]; }
      if (arrow==='->') arrow='-->';
      const stereotype = label.match(/^\s*<<\s*(include|extend)\s*>>\s*/i);
      const kind = stereotype ? stereotype[1].toLowerCase() : arrow==='--|>' ? 'generalisation' : arrow==='..>' ? 'dependency' : 'association';
      if (stereotype) label=label.slice(stereotype[0].length);
      return [{from,to,m1,m2,arrow,kind,label:label.trim(),raw,start}];
    }
    let [,from,arrow,to,label=''] = match;
    if (reversedMessage[arrow]) { [from,to]=[to,from]; arrow=reversedMessage[arrow]; }
    return [{from,to,arrow,label:label.trim(),raw,start}];
  });
}

export function generateDiagramRelation(type, item) {
  if (type === 'class') return generateClassRelation(item);
  if (type === 'usecase') {
    if (!['-->', '..>', '--|>', '--', '<-->'].includes(item.arrow)) throw new Error('Invalid relationship');
    const prefix = ['include','extend'].includes(item.kind) ? `<<${item.kind}>>` : '';
    return generateClassRelation({...item,label:[prefix,item.label].filter(Boolean).join(' ')});
  }
  if (![item.from,item.to].every(id=>/^[A-Za-z_]\w*$/.test(id)) || !['->','->>','-->','->x','-->>'].includes(item.arrow) || typeof item.label!=='string' || !item.label.trim() || /[\r\n]/.test(item.label)) throw new Error('Invalid message');
  return `${item.from} ${item.arrow} ${item.to} : ${item.label.trim()}`;
}

export function replaceDiagramRelation(source, item, replacement = null) {
  const lines=source.split('\n');
  if (!Number.isInteger(item.start) || item.start<0 || lines[item.start]!==item.raw || replacement!==null && (typeof replacement!=='string' || /[\r\n]/.test(replacement))) throw new Error('Relationship changed');
  lines.splice(item.start,1,...(replacement===null?[]:[replacement]));
  return lines.join('\n');
}
