import test from 'node:test';
import assert from 'node:assert/strict';
import { uncoveredHighlights } from '../public/highlight-coverage.js';
test('highlights matching a declared element or relationship label are covered',()=>{
 const elements=[{name:'Socio',id:'Socio'},{name:'Libro',id:'Libro'}];
 const relations=[{label:'presta'}];
 const highlights=[
  {quote:'El socio',category:'actor',reason:''},
  {quote:'un libro',category:'requirement',reason:''},
  {quote:'presta el libro',category:'requirement',reason:''},
  {quote:'sanciones activas',category:'ambiguity',reason:''}
 ];
 const uncovered=uncoveredHighlights(highlights,elements,relations);
 assert.deepEqual(uncovered.map(h=>h.quote),['sanciones activas']);
});
test('matching is accent and case insensitive, and works in both substring directions',()=>{
 const elements=[{name:'Préstamo',id:'Prestamo'}];
 const highlights=[{quote:'PRESTAMO',category:'requirement',reason:''},{quote:'el préstamo del libro',category:'requirement',reason:''}];
 assert.deepEqual(uncoveredHighlights(highlights,elements,[]),[]);
});
test('an empty diagram leaves every highlight uncovered',()=>{
 const highlights=[{quote:'a',category:'actor',reason:''},{quote:'b',category:'requirement',reason:''}];
 assert.equal(uncoveredHighlights(highlights,[],[]).length,2);
});
