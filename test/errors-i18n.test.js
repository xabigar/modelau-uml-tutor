import test from 'node:test';
import assert from 'node:assert/strict';
import { requestLang, translateError } from '../errors-i18n.js';

test('server errors are translated for English requests and left intact otherwise', () => {
  assert.equal(translateError('Contraseña incorrecta.', 'en'), 'Incorrect password.');
  assert.equal(translateError('Contraseña incorrecta.', 'es'), 'Contraseña incorrecta.');
  assert.equal(translateError('El proveedor respondió 429. Comprueba la clave, el modelo, la cuota y los permisos.', 'en'),
    'The provider responded 429. Check the key, model, quota and permissions.');
  assert.equal(translateError('Unknown upstream message', 'en'), 'Unknown upstream message');
});

test('request language defaults to Spanish unless the client asks for English', () => {
  assert.equal(requestLang({ headers: { 'x-lang': 'en' } }), 'en');
  assert.equal(requestLang({ headers: { 'x-lang': 'fr' } }), 'es');
  assert.equal(requestLang({ headers: {} }), 'es');
});
