const en = {
  'Archivo o petición demasiado grande.': 'File or request too large.',
  'Complejidad no válida.': 'Invalid complexity.',
  'Configura una clave API válida.': 'Configure a valid API key.',
  'Código no válido o demasiado largo.': 'Invalid or overly long code.',
  'El PDF supera el límite de 100 páginas.': 'The PDF exceeds the 100-page limit.',
  'El archivo no es un PDF válido.': 'The file is not a valid PDF.',
  'El contexto es demasiado largo o no válido.': 'The context is too long or invalid.',
  'El modelo no devolvió un enunciado válido.': 'The model did not return a valid exercise.',
  'El modelo no devolvió una respuesta válida.': 'The model did not return a valid response.',
  'El proveedor devolvió texto no válido.': 'The provider returned invalid text.',
  'El proveedor devolvió un stream no válido.': 'The provider returned an invalid stream.',
  'El proveedor interrumpió la respuesta. Comprueba la cuota y reintenta.': 'The provider interrupted the response. Check your quota and retry.',
  'El proveedor no devolvió texto. Prueba otro modelo o reformula la pregunta.': 'The provider returned no text. Try another model or rephrase the question.',
  'El proveedor no devolvió texto. Prueba otro modelo.': 'The provider returned no text. Try another model.',
  'El proveedor no pudo completar la respuesta. Prueba a reformular la pregunta.': 'The provider could not complete the response. Try rephrasing the question.',
  'El proveedor no pudo completar la respuesta.': 'The provider could not complete the response.',
  'El proveedor tardó demasiado. Inténtalo de nuevo.': 'The provider took too long. Please try again.',
  'El texto extraído supera los 100.000 caracteres.': 'The extracted text exceeds 100,000 characters.',
  'Este PDF no contiene texto extraíble. Usa un PDF con texto o pega el enunciado; no se incluye OCR.': 'This PDF has no extractable text. Use a text-based PDF or paste the exercise; OCR is not included.',
  'Historial no válido.': 'Invalid history.',
  'Idioma no válido.': 'Invalid language.',
  'Introduce un identificador de modelo válido.': 'Enter a valid model identifier.',
  'La conexión se interrumpió antes de terminar. Reintenta el mensaje.': 'The connection dropped before finishing. Retry the message.',
  'La respuesta es demasiado larga.': 'The response is too long.',
  'La respuesta superó el límite de longitud. Reintenta con una pregunta más breve.': 'The response exceeded the length limit. Retry with a shorter question.',
  'Paso de procedimiento no válido.': 'Invalid procedure step.',
  'Proveedor no válido.': 'Invalid provider.',
  'Tema no válido.': 'Invalid topic.',
  'Tipo de diagrama no válido.': 'Invalid diagram type.',
  'URL del endpoint no válida.': 'Invalid endpoint URL.',
  'Contraseña incorrecta.': 'Incorrect password.',
  'Introduce la contraseña.': 'Enter the password.',
  'Método no permitido.': 'Method not allowed.',
  'No encontrado.': 'Not found.',
  'No hay contraseña de administrador configurada en el servidor.': 'No administrator password is configured on the server.',
};

export function requestLang(req) {
  return req.headers['x-lang'] === 'en' ? 'en' : 'es';
}

export function translateError(message, lang) {
  if (lang !== 'en' || typeof message !== 'string') return message;
  if (en[message]) return en[message];
  const status = message.match(/^El proveedor respondió (\d+)\./);
  if (status) return `The provider responded ${status[1]}. Check the key, model, quota and permissions.`;
  return message;
}
