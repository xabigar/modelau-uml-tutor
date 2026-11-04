import { readSSE } from './chat-stream.js';
import { parseClassMembers, serializeClassMembers } from './class-members.js';
import { parseDiagramRelations, generateDiagramRelation, replaceDiagramRelation } from './diagram-relations.js';
import { parseElements } from './diagram-elements.js';
import { checkDiagram } from './diagram-checks.js';
import { detectStep, stepList } from './procedure-steps.js';
import { uncoveredHighlights } from './highlight-coverage.js';
const $ = id => document.getElementById(id);
const strings = {
 es: { subtitle:'Un espacio para aprender UML',settings:'Configurar LLM',diagram:'Diagrama',class:'Clases',usecase:'Casos de uso',sequence:'Secuencia',new:'Nuevo diagrama',designer:'Diseñador',add:'+ Elemento',from:'Desde',to:'Hasta',relationType:'Tipo',sourceMultiplicity:'Multiplicidad origen',targetMultiplicity:'Multiplicidad destino',label:'Etiqueta / mensaje',addRelation:'Añadir relación',sequenceTools:'Fragmentos y activación',fragmentCondition:'Condición',activate:'Activar',deactivate:'Desactivar',yourDiagram:'Tu diagrama',preview:'Vista',code:'Código',export:'Exportar .puml',renderNote:'El código se envía al servidor PlantUML configurado.',exercise:'Enunciado',load:'Cargar',edit:'Editar texto',done:'Listo',clearHighlights:'Quitar colores',exercisePlaceholder:'Pega aquí el enunciado del ejercicio…',requirement:'Requisito',actor:'Actor',ambiguity:'Por aclarar',assistant:'UMLBuddy',clearChat:'Limpiar',tutorNote:'Pistas y preguntas para construir tu propia solución.',chatPlaceholder:'¿Qué parte te está costando?',contextNote:'Se comparten el enunciado y tu código actual.',send:'Enviar ↗',name:'Nombre visible',identifier:'Identificador (sin espacios)',kind:'Tipo de elemento',members:'Atributos y métodos (uno por línea)',save:'Guardar',keyNote:'Una clave por proveedor, guardada en este navegador. El servidor la utiliza solo para la petición; no la guarda. localStorage no cifra las claves: usa este equipo solo si es de confianza.',provider:'Proveedor',model:'Identificador de modelo',modelHint:'Introduce un modelo disponible en tu cuenta.',endpoint:'URL base compatible (incluye /v1)',endpointNote:'La clave y el contexto se enviarán a esta dirección.',plantumlServer:'Servidor PlantUML',serverHint:'Público para empezar; local para trabajar con contenido privado.',forget:'Borrar todas las claves',saved:'Guardado en este navegador',storageError:'No se puede guardar en este navegador.',designerHint:'Crea elementos aquí o escribe PlantUML. El diseñador reconoce declaraciones simples; el código conserva las construcciones avanzadas.',relationTitle:'Nueva relación',messageTitle:'Nuevo mensaje',emptyElements:'Aún no hay elementos. Empieza con tu primera idea.',emptyExercise:'Carga un archivo .txt o PDF con texto, o pulsa «Editar texto» para pegar el enunciado.',emptyChat:'Soy UMLBuddy, tu compañero de aprendizaje. Comparte el enunciado y tu primer intento; podemos revisar una decisión o explorar qué hacer a continuación.',you:'Tú',showHighlights:'Ver fragmentos',noModel:'Configura un proveedor y modelo',rendering:'Generando…',renderError:'No se pudo cargar el diagrama. Revisa el código y el servidor.',rendered:'Vista actualizada',lines:'líneas',editElement:'Editar',deleteElement:'Eliminar',newElement:'Nuevo elemento',duplicate:'Ese identificador ya existe.',invalid:'Revisa el identificador y los miembros; no se admiten llaves ni directivas en este formulario.',missingElements:'Crea al menos un elemento.',relationRequired:'Escribe un mensaje para esta relación.',confirmNew:'¿Vaciar el diagrama y el chat de este tipo? El enunciado se conservará.',confirmDelete:'¿Eliminar este elemento y sus relaciones?',confirmChat:'¿Borrar el historial del chat?',loading:'Leyendo archivo…',loaded:'Archivo cargado',fileError:'Selecciona un archivo .txt o .pdf de hasta 10 MB.',thinking:'Pensando…',keyRequired:'Configura el proveedor, modelo y clave API antes de conversar.',requestError:'No se pudo completar la petición.',keyForgotten:'Claves eliminadas',serverInvalid:'Usa una URL HTTP o HTTPS sin credenciales, consultas ni fragmentos.',fileChanged:'El enunciado ha cambiado; los resaltados de esta respuesta ya no se aplican.',requestFailed:'No enviado · puedes reintentar',editHint:'Edita el código para cambiar relaciones o construcciones avanzadas.' },
 en: { subtitle:'A space to learn UML',settings:'LLM settings',diagram:'Diagram',class:'Classes',usecase:'Use cases',sequence:'Sequence',new:'New diagram',designer:'Designer',add:'+ Element',from:'From',to:'To',relationType:'Type',sourceMultiplicity:'Source multiplicity',targetMultiplicity:'Target multiplicity',label:'Label / message',addRelation:'Add relationship',sequenceTools:'Fragments and activation',fragmentCondition:'Condition',activate:'Activate',deactivate:'Deactivate',yourDiagram:'Your diagram',preview:'Preview',code:'Code',export:'Export .puml',renderNote:'Code is sent to the configured PlantUML server.',exercise:'Exercise',load:'Load',edit:'Edit text',done:'Done',clearHighlights:'Clear colours',exercisePlaceholder:'Paste the exercise statement here…',requirement:'Requirement',actor:'Actor',ambiguity:'Clarify',assistant:'UMLBuddy',clearChat:'Clear',tutorNote:'Hints and questions to build your own solution.',chatPlaceholder:'What are you finding difficult?',contextNote:'Your exercise and current code are shared.',send:'Send ↗',name:'Display name',identifier:'Identifier (no spaces)',kind:'Element type',members:'Attributes and methods (one per line)',save:'Save',keyNote:'One key per provider, saved in this browser. The server uses it for the request only and does not save it. localStorage does not encrypt keys: use a trusted device.',provider:'Provider',model:'Model identifier',modelHint:'Enter a model available in your account.',endpoint:'Compatible base URL (include /v1)',endpointNote:'The key and context will be sent to this address.',plantumlServer:'PlantUML server',serverHint:'Public to get started; local for private content.',forget:'Delete all keys',saved:'Saved in this browser',storageError:'Unable to save in this browser.',designerHint:'Create elements here or write PlantUML. The designer recognises simple declarations; advanced syntax stays in your code.',relationTitle:'New relationship',messageTitle:'New message',emptyElements:'No elements yet. Start with your first idea.',emptyExercise:'Load a .txt file or a text-based PDF, or choose “Edit text” to paste your exercise.',emptyChat:'I’m UMLBuddy, your learning companion. Share the exercise and your first attempt; we can review a decision or explore your next step.',you:'You',showHighlights:'Show excerpts',noModel:'Configure a provider and model',rendering:'Rendering…',renderError:'Could not load the diagram. Check the code and server.',rendered:'Preview updated',lines:'lines',editElement:'Edit',deleteElement:'Delete',newElement:'New element',duplicate:'That identifier already exists.',invalid:'Check the identifier and members; braces and directives are not allowed in this form.',missingElements:'Create at least one element.',relationRequired:'Enter a message for this relationship.',confirmNew:'Clear the diagram and chat for this type? The exercise will be kept.',confirmDelete:'Delete this element and its relationships?',confirmChat:'Clear the chat history?',loading:'Reading file…',loaded:'File loaded',fileError:'Choose a .txt or .pdf file up to 10 MB.',thinking:'Thinking…',keyRequired:'Configure the provider, model and API key before chatting.',requestError:'Could not complete the request.',keyForgotten:'Keys deleted',serverInvalid:'Use an HTTP or HTTPS URL without credentials, query or fragment.',fileChanged:'The exercise has changed; highlights from this response no longer apply.',requestFailed:'Not sent · you can retry',editHint:'Edit code to change relationships or advanced syntax.' }
};
Object.assign(strings.es, { attributes:'Atributos', methods:'Métodos', addAttribute:'+ Añadir atributo', addMethod:'+ Añadir método', visibility:'Visibilidad', memberName:'Nombre', attributeType:'Tipo', parameters:'Parámetros', returnType:'Retorno', removeMember:'Quitar', advanced:'Opciones avanzadas', extraMembers:'Otras líneas PlantUML (se conservan al editar)', cancel:'Cancelar', insertElement:'Insertar en el código', saveChanges:'Guardar cambios', newClass:'Nueva clase', addClass:'+ Nueva clase', invalidMember:'Revisa los miembros: necesitan un nombre válido y los campos no pueden contener saltos de línea, llaves ni directivas.', publicVisibility:'Público (+)', privateVisibility:'Privado (−)', protectedVisibility:'Protegido (#)', packageVisibility:'Paquete (~)', defaultVisibility:'Sin especificar', classKind:'Clase', abstractKind:'Clase abstracta', interfaceKind:'Interfaz', enumKind:'Enumerado' });
Object.assign(strings.en, { attributes:'Attributes', methods:'Methods', addAttribute:'+ Add attribute', addMethod:'+ Add method', visibility:'Visibility', memberName:'Name', attributeType:'Type', parameters:'Parameters', returnType:'Return type', removeMember:'Remove', advanced:'Advanced options', extraMembers:'Other PlantUML lines (preserved when editing)', cancel:'Cancel', insertElement:'Insert into code', saveChanges:'Save changes', newClass:'New class', addClass:'+ New class', invalidMember:'Check the members: use valid names and avoid newlines, braces or directives in the fields.', publicVisibility:'Public (+)', privateVisibility:'Private (−)', protectedVisibility:'Protected (#)', packageVisibility:'Package (~)', defaultVisibility:'Unspecified', classKind:'Class', abstractKind:'Abstract class', interfaceKind:'Interface', enumKind:'Enumeration' });
Object.assign(strings.es, { zoomIn:'Acercar', zoomOut:'Alejar', fitDiagram:'Ajustar', panHint:'Arrastra para moverte · Ctrl + rueda para zoom' });
Object.assign(strings.en, { zoomIn:'Zoom in', zoomOut:'Zoom out', fitDiagram:'Fit', panHint:'Drag to pan · Ctrl + wheel to zoom' });
Object.assign(strings.es, { openAssistant:'Abrir UMLBuddy', hideAssistant:'Ocultar UMLBuddy' });
Object.assign(strings.en, { openAssistant:'Open UMLBuddy', hideAssistant:'Hide UMLBuddy' });
Object.assign(strings.es, { classDesignerHint:'Crea clases y relaciones. Puedes plegar los bloques y sus tarjetas.', relationships:'Relaciones', newRelationship:'+ Nueva relación', editRelationship:'Editar relación', emptyRelationships:'Todavía no hay relaciones. Crea una para conectar tus clases.', noMembers:'Sin atributos ni métodos', noLabel:'Sin etiqueta', confirmDeleteRelationship:'¿Eliminar esta relación?', relationChanged:'La relación ha cambiado. Vuelve a abrirla para editarla.' });
Object.assign(strings.en, { classDesignerHint:'Create classes and relationships. Collapse the groups or their cards to keep the workspace tidy.', relationships:'Relationships', newRelationship:'+ New relationship', editRelationship:'Edit relationship', emptyRelationships:'No relationships yet. Create one to connect your classes.', noMembers:'No attributes or methods', noLabel:'No label', confirmDeleteRelationship:'Delete this relationship?', relationChanged:'The relationship has changed. Reopen it to edit.' });
Object.assign(strings.es, {
  settingsIntro:'Conecta un proveedor y elige el modelo para UMLBuddy.', connection:'Conexión', model:'Modelo', assistantModel:'Modelo de UMLBuddy', showKey:'Mostrar', hideKey:'Ocultar', modelsKeyHint:'Introduce tu clave y pulsa «Cargar modelos».', localKeyHint:'Opcional para servidores locales que no requieren autenticación.', modelsHint:'Consulta los modelos del proveedor con tu clave.', loadModels:'Cargar modelos', refreshModels:'Actualizar modelos', searchModels:'Buscar modelos', searchModelsPlaceholder:'Nombre o identificador…', chooseModel:'Selecciona un modelo…', manualModel:'Introducir un modelo manualmente…', manualModelId:'Identificador del modelo', manualModelHint:'Úsalo si tu endpoint no ofrece una lista o si el modelo no aparece.', renderingSettings:'Servidor de diagramas', modelCompatibility:'El listado no garantiza cuota ni compatibilidad. Elige un modelo que admita conversación de texto.', modelsReady:'Carga la lista para elegir un modelo, o introduce su identificador.', modelsCached:'Lista guardada. Actualiza para comprobar los modelos actuales.', modelsChanged:'La conexión ha cambiado. Vuelve a cargar los modelos.', modelsLoading:'Consultando modelos…', modelsLoaded:'Modelos cargados. Selecciona el que quieras usar.', modelsEmpty:'No hay modelos disponibles para esta conexión. Puedes introducir uno manualmente.', modelsKeyRequired:'Introduce una clave API antes de cargar los modelos.', modelsAuthError:'La clave no es válida o no tiene permiso para listar modelos. Comprueba la clave y sus permisos.', modelsRateLimit:'El proveedor ha limitado las peticiones. Espera un momento y reintenta.', modelsNotSupported:'Este endpoint no ofrece /models. Comprueba la URL base o introduce el modelo manualmente.', modelsProviderError:'El proveedor no pudo listar modelos. Reintenta o introduce el modelo manualmente.', modelsResponseInvalid:'El proveedor devolvió una lista no válida. Comprueba el endpoint o introduce el modelo manualmente.', modelsNetworkError:'No se pudo conectar. Comprueba la conexión y la URL del proveedor.', modelsTimeout:'El proveedor tardó demasiado. Vuelve a intentarlo.', modelsTooMany:'La lista es demasiado grande o tiene demasiadas páginas. Introduce el modelo manualmente.', providerInvalid:'Selecciona un proveedor válido.'
});
Object.assign(strings.en, {
  settingsIntro:'Connect a provider and choose the model for UMLBuddy.', connection:'Connection', model:'Model', assistantModel:'UMLBuddy model', showKey:'Show', hideKey:'Hide', modelsKeyHint:'Enter your key, then choose “Load models”.', localKeyHint:'Optional for local servers that do not require authentication.', modelsHint:'Fetch the provider’s models using your key.', loadModels:'Load models', refreshModels:'Refresh models', searchModels:'Search models', searchModelsPlaceholder:'Name or identifier…', chooseModel:'Choose a model…', manualModel:'Enter a model manually…', manualModelId:'Model identifier', manualModelHint:'Use this if your endpoint has no model list or a model is missing.', renderingSettings:'Diagram server', modelCompatibility:'Listing does not guarantee quota or compatibility. Choose a model that supports text conversation.', modelsReady:'Load the list to choose a model, or enter its identifier.', modelsCached:'Saved list. Refresh to check the current models.', modelsChanged:'Connection changed. Load the models again.', modelsLoading:'Loading models…', modelsLoaded:'Models loaded. Choose the one you want to use.', modelsEmpty:'No models available for this connection. You can enter one manually.', modelsKeyRequired:'Enter an API key before loading models.', modelsAuthError:'The key is invalid or cannot list models. Check the key and its permissions.', modelsRateLimit:'The provider has limited requests. Wait a moment and try again.', modelsNotSupported:'This endpoint does not offer /models. Check the base URL or enter a model manually.', modelsProviderError:'The provider could not list models. Try again or enter a model manually.', modelsResponseInvalid:'The provider returned an invalid list. Check the endpoint or enter a model manually.', modelsNetworkError:'Could not connect. Check your connection and the provider URL.', modelsTimeout:'The provider took too long. Try again.', modelsTooMany:'The list is too large or has too many pages. Enter a model manually.', providerInvalid:'Choose a valid provider.'
});
Object.assign(strings.es, { newShort:'Nuevo', savedCompact:'Guardado', languageLabel:'Idioma' });
Object.assign(strings.en, { newShort:'New', savedCompact:'Saved', languageLabel:'Language' });
Object.assign(strings.es, { serverDefault:'Servidor (por defecto)', serverDefaultLocked:'Clave del servidor bloqueada. Introduce la contraseña para usarla.', serverDefaultUnlocked:'Clave del servidor desbloqueada.', serverDefaultPasswordLabel:'Contraseña de administrador', serverDefaultUnlock:'Desbloquear', serverDefaultPasswordPlaceholder:'Contraseña del servidor', serverDefaultHint:'Usa la clave API configurada en el servidor.', serverDefaultPasswordRequired:'Introduce la contraseña.', serverDefaultWrongPassword:'Contraseña incorrecta.' });
Object.assign(strings.en, { serverDefault:'Server default', serverDefaultLocked:'Server key is locked. Enter the password to use it.', serverDefaultUnlocked:'Server key unlocked.', serverDefaultPasswordLabel:'Admin password', serverDefaultUnlock:'Unlock', serverDefaultPasswordPlaceholder:'Server password', serverDefaultHint:'Uses the API key configured on the server.', serverDefaultPasswordRequired:'Enter the password.', serverDefaultWrongPassword:'Incorrect password.' });
Object.assign(strings.es, { actors:'Actores', participants:'Participantes', messages:'Mensajes', newActor:'Nuevo actor', newActorButton:'+ Nuevo actor', newUseCase:'Nuevo caso de uso', newUseCaseButton:'+ Nuevo caso de uso', newParticipant:'Nuevo participante', newParticipantButton:'+ Nuevo participante', newMessageButton:'+ Nuevo mensaje', editMessage:'Editar mensaje', confirmDeleteMessage:'¿Eliminar este mensaje?', emptyActors:'Todavía no hay actores. Crea el primero.', emptyUseCases:'Todavía no hay casos de uso. Crea el primero.', emptyParticipants:'Todavía no hay participantes. Crea el primero.', emptyMessages:'Todavía no hay mensajes. Conecta tus participantes con el primero.', actorKind:'Actor', useCaseKind:'Caso de uso', participantKind:'Participante', boundaryKind:'Interfaz (boundary)', controlKind:'Control', entityKind:'Entidad', databaseKind:'Base de datos', collectionsKind:'Colecciones', queueKind:'Cola', useCaseDesignerHint:'Crea actores, casos de uso y relaciones. Puedes plegar los bloques y sus tarjetas.', sequenceDesignerHint:'Crea participantes y mensajes. Los mensajes siguen el orden del código; los fragmentos avanzados siguen disponibles en él.', elementIdentifier:'Identificador', messageLabel:'Mensaje', relationshipLabel:'Etiqueta', emptySequenceTarget:'Crea un participante antes de activar su línea de vida.' });
Object.assign(strings.en, { actors:'Actors', participants:'Participants', messages:'Messages', newActor:'New actor', newActorButton:'+ New actor', newUseCase:'New use case', newUseCaseButton:'+ New use case', newParticipant:'New participant', newParticipantButton:'+ New participant', newMessageButton:'+ New message', editMessage:'Edit message', confirmDeleteMessage:'Delete this message?', emptyActors:'No actors yet. Create your first one.', emptyUseCases:'No use cases yet. Create your first one.', emptyParticipants:'No participants yet. Create your first one.', emptyMessages:'No messages yet. Connect your participants with the first one.', actorKind:'Actor', useCaseKind:'Use case', participantKind:'Participant', boundaryKind:'Boundary', controlKind:'Control', entityKind:'Entity', databaseKind:'Database', collectionsKind:'Collections', queueKind:'Queue', useCaseDesignerHint:'Create actors, use cases and relationships. Collapse the groups or their cards to keep the workspace tidy.', sequenceDesignerHint:'Create participants and messages. Messages follow the order of your code; advanced fragments remain editable there.', elementIdentifier:'Identifier', messageLabel:'Message', relationshipLabel:'Label', emptySequenceTarget:'Create a participant before activating its lifeline.' });
Object.assign(strings.es, {emptyRelationships:'Todavía no hay relaciones. Crea una para conectar tus elementos.',relationRequired:'Escribe el texto del mensaje.'});
Object.assign(strings.en, {emptyRelationships:'No relationships yet. Create one to connect your elements.',relationRequired:'Enter the message text.'});
Object.assign(strings.es, { chatReady:'Listo para conversar', chatNotReady:'Falta configurar la conexión', chatConnectionError:'Revisa la conexión', responding:'Respondiendo…', enterHint:'Enter para enviar · Mayús+Enter para salto de línea', readyHint:'Modelo y conexión configurados. La disponibilidad se comprueba al enviar.', sendingHint:'UMLBuddy está preparando su respuesta.' });
Object.assign(strings.en, { chatReady:'Ready to chat', chatNotReady:'Connection needs setup', chatConnectionError:'Check the connection', responding:'Responding…', enterHint:'Enter to send · Shift+Enter for a new line', readyHint:'Model and connection configured. Availability is checked when you send.', sendingHint:'UMLBuddy is preparing a reply.' });
Object.assign(strings.es, { noMultiplicity:'Esta relación no tiene multiplicidad en ningún extremo.', isolatedUseCase:'Este caso de uso no está conectado a nada todavía.', isolatedActor:'Este actor no está conectado a ningún caso de uso todavía.', isolatedParticipant:'Este participante no interviene en ningún mensaje todavía.' });
Object.assign(strings.en, { noMultiplicity:'This relationship has no multiplicity on either end.', isolatedUseCase:'This use case isn’t connected to anything yet.', isolatedActor:'This actor isn’t connected to any use case yet.', isolatedParticipant:'This participant isn’t involved in any message yet.' });
Object.assign(strings.es, { idleNudgeSettings:'Avisos de inactividad', idleNudgeLabel:'Avisar tras inactividad (minutos)', idleNudgeHint:'Un aviso discreto aparece si el diagrama sigue incompleto tras este tiempo sin actividad.', idleNudgeAria:'UMLBuddy · tu diagrama parece incompleto, quizás quieras seguir trabajando o preguntar' });
Object.assign(strings.en, { idleNudgeSettings:'Inactivity nudges', idleNudgeLabel:'Nudge after inactivity (minutes)', idleNudgeHint:'A discreet nudge appears if the diagram is still incomplete after this much inactivity.', idleNudgeAria:'UMLBuddy · your diagram looks incomplete, you might want to keep working or ask a question' });
Object.assign(strings.es, { uncoveredHint:'Todavía no aparece en tu diagrama.', showDiagramHighlights:'Ver en el diagrama' });
Object.assign(strings.en, { uncoveredHint:'Not in your diagram yet.', showDiagramHighlights:'Show in diagram' });
Object.assign(strings.es, { procedureStepLabel:'Paso del proceso', procedureStepAuto:'Automático', step_class_classes:'Identificar clases', step_class_attributes:'Añadir atributos', step_class_associations:'Añadir relaciones', step_class_multiplicities:'Añadir multiplicidades', step_class_methods:'Añadir métodos', step_class_review:'Revisar y refinar', step_usecase_actors:'Identificar actores', step_usecase_useCases:'Identificar casos de uso', step_usecase_links:'Conectar actores y casos de uso', step_usecase_review:'Revisar límites, include/extend', step_sequence_participants:'Identificar participantes', step_sequence_messages:'Añadir mensajes', step_sequence_allConnected:'Conectar a todos los participantes', step_sequence_fragments:'Modelar alternativas (alt/loop)', step_sequence_review:'Revisar y refinar' });
Object.assign(strings.en, { procedureStepLabel:'Process step', procedureStepAuto:'Automatic', step_class_classes:'Identify classes', step_class_attributes:'Add attributes', step_class_associations:'Add relationships', step_class_multiplicities:'Add multiplicities', step_class_methods:'Add methods', step_class_review:'Review and refine', step_usecase_actors:'Identify actors', step_usecase_useCases:'Identify use cases', step_usecase_links:'Connect actors and use cases', step_usecase_review:'Review boundaries, include/extend', step_sequence_participants:'Identify participants', step_sequence_messages:'Add messages', step_sequence_allConnected:'Connect every participant', step_sequence_fragments:'Model alternatives (alt/loop)', step_sequence_review:'Review and refine' });
const storageKey = 'modelai.workspace.v1', settingsKey = 'modelai.settings.v1';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
let settings = read(settingsKey, { provider:'openai', providers:{}, server:'https://www.plantuml.com/plantuml', language:'es' });
settings.providers ||= {}; settings.server ||= 'https://www.plantuml.com/plantuml'; settings.idleNudgeMinutes ||= 5;
let state = read(storageKey, { type:'class', diagrams:{}, exercise:'' });
state.diagrams ||= {}; state.exercise ||= ''; state.assistantOpen = state.assistantOpen === true; if (!['class','usecase','sequence'].includes(state.type)) state.type='class';
let lang = settings.language === 'en' ? 'en' : 'es';
let highlights = [], editingExercise = false, editingElement = null, renderTimer, renderVersion = 0, busy = false;
let lastActivity = Date.now(), nudgeActive = false;
const t = key => strings[lang][key] || key;
const cardExpansion = new Map();
let editingRelationship = null;
let pendingReply = null, chatConnectionError = false, messageFrame;
let serverDefaults = {};
function isServerDefaultUnlocked() {
  const token = settings.serverDefaultToken;
  if (!token || !token.includes('.')) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[0]));
    return payload.type === 'server-default' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch { return false; }
}
function serverDefaultModel() {
  return (settings.providers.server && settings.providers.server.model) || serverDefaults.openai?.model || '';
}
function updateServerDefaultStatus() {
  const unlocked = isServerDefaultUnlocked();
  const status = $('serverDefaultStatus');
  if (status) status.textContent = t(unlocked ? 'serverDefaultUnlocked' : 'serverDefaultLocked');
  const lockRow = $('serverDefaultLockRow');
  if (lockRow) lockRow.hidden = unlocked;
}
function applyAssistantVisibility() {
  $('chatPanel').hidden = !state.assistantOpen;
  $('workspace').classList.toggle('assistant-hidden',!state.assistantOpen);
  $('assistantLauncherLabel').textContent = t('assistant');
  $('assistantToggle').setAttribute('aria-label',t(state.assistantOpen ? 'hideAssistant' : 'openAssistant'));
  $('assistantToggle').title = t('openAssistant');
  $('assistantToggle').setAttribute('aria-expanded',String(state.assistantOpen));
  $('closeAssistant').setAttribute('aria-label',t('hideAssistant'));
  $('closeAssistant').title = t('hideAssistant');
}
function setAssistantOpen(open) {
  const focusInChat = $('chatPanel').contains(document.activeElement);
  state.assistantOpen = open; applyAssistantVisibility(); persist(); checkIdleNudge();
  if (open) {
    $('messages').scrollTop = $('messages').scrollHeight;
    $('chatInput').focus({preventScroll:true});
    $('chatPanel').scrollIntoView({block:'nearest',inline:'nearest'});
  } else if (focusInChat) $('assistantToggle').focus({preventScroll:true});
}
$('assistantToggle').onclick = () => setAssistantOpen(!state.assistantOpen);
$('closeAssistant').onclick = () => setAssistantOpen(false);
$('chatPanel').addEventListener('keydown',event => {
  if(event.key==='Escape') { event.preventDefault(); setAssistantOpen(false); }
});
const templates = { class:'@startuml\n\n@enduml', usecase:'@startuml\nleft to right direction\n\n@enduml', sequence:'@startuml\n\n@enduml' };
function current() { return state.diagrams[state.type] ||= { code:templates[state.type], messages:[] }; }
function updateSaveStatus(saved = true) { const message=t(saved?'saved':'storageError'); $('saveStatus').textContent=t(saved?'savedCompact':'storageError'); $('saveStatus').title=message; $('saveStatus').classList.toggle('save-error',!saved); }
function persist() { current().code = $('code').value; lastActivity = Date.now(); checkIdleNudge(); try { localStorage.setItem(storageKey,JSON.stringify(state)); updateSaveStatus(); } catch { updateSaveStatus(false); } }
// Cheap, deterministic signal for the idle nudge — no LLM call needed just to
// decide whether the student has barely started relative to the exercise.
function diagramIncomplete() { return state.exercise.trim().length > 200 && parseElements(state.type,$('code').value).length <= 1; }
function checkIdleNudge() {
  const idleMs = Math.max(1,Number(settings.idleNudgeMinutes) || 5) * 60000;
  const shouldNudge = !state.assistantOpen && !busy && Date.now()-lastActivity >= idleMs && diagramIncomplete();
  if (shouldNudge === nudgeActive) return;
  nudgeActive = shouldNudge;
  $('assistantToggle').dataset.nudge = String(shouldNudge);
  $('assistantToggle').setAttribute('aria-label', shouldNudge ? t('idleNudgeAria') : t('openAssistant'));
}
setInterval(checkIdleNudge, 20000);
function saveSettings() { try { localStorage.setItem(settingsKey,JSON.stringify(settings)); } catch { $('settingsError').textContent=t('storageError'); return false; } return true; }
async function api(url, data, binary = false) { const response = await fetch(url,{method:'POST',headers:binary?{'Content-Type':'application/pdf'}:{'Content-Type':'application/json'},body:binary?data:JSON.stringify(data)}); const result = await response.json(); if (!response.ok) throw new Error(result.error || t('requestError')); return result; }
function setLanguage() { applyAssistantVisibility(); $('language').setAttribute('aria-label',t('languageLabel')); $('settingsButton').setAttribute('aria-label',t('settings')); $('newDiagram').setAttribute('aria-label',t('new')); $('newDiagram').title=t('new'); document.documentElement.lang=lang; $('diagramImage').alt=lang==='es'?'Diagrama UML':'UML diagram'; $('chatInput').setAttribute('aria-label',t('chatPlaceholder')); $('exerciseInput').setAttribute('aria-label',t('exercise')); $('zoomIn').setAttribute('aria-label',t('zoomIn')); $('zoomOut').setAttribute('aria-label',t('zoomOut'));  $('language').value=lang; document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n)); document.querySelectorAll('[data-placeholder]').forEach(el=>el.placeholder=t(el.dataset.placeholder)); $('designerHint').textContent=t(state.type==='class'?'classDesignerHint':'designerHint'); $('editExercise').textContent=t(editingExercise?'done':'edit'); updateDesigner(); renderExercise(); renderMessages(); updateModel(); $('lines').textContent=$('code').value.split('\n').length+' '+t('lines'); if($('renderStatus').textContent) {renderVersion++;renderDiagram();} updateSaveStatus(); }
$('language').onchange=()=>{lang=$('language').value; settings.language=lang;saveSettings();setLanguage();};
function loadDiagram() { document.querySelector('.designer > .scroll').scrollTop=0; diagramView.fit = true; $('diagramType').value=state.type; $('code').value=current().code; highlights=[]; $('chatError').textContent=''; updateCode(); renderMessages(); renderExercise(); }
$('diagramType').onchange=()=>{ persist(); state.type=$('diagramType').value; loadDiagram(); };
$('newDiagram').onclick=()=>{if(confirm(t('confirmNew'))){state.diagrams[state.type]={code:templates[state.type],messages:[]};loadDiagram();}};
function setTab(preview) { $('preview').hidden=!preview; $('codeView').hidden=preview; $('zoomToolbar').hidden=!preview; if(preview) requestAnimationFrame(() => layoutDiagram()); $('previewTab').setAttribute('aria-selected',String(preview));$('codeTab').setAttribute('aria-selected',String(!preview)); }
$('previewTab').onclick=()=>setTab(true);$('codeTab').onclick=()=>setTab(false);
$('previewTab').onkeydown=$('codeTab').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const preview=e.currentTarget.id==='codeTab';setTab(preview);$(preview?'previewTab':'codeTab').focus();}};
function updateCode(){persist();updateDesigner();if(!editingExercise)renderExercise();$('lines').textContent=$('code').value.split('\n').length+' '+t('lines');clearTimeout(renderTimer);renderVersion++;renderTimer=setTimeout(renderDiagram,450);}
$('code').oninput=updateCode;
$('code').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();$('code').setRangeText('  ',$('code').selectionStart,$('code').selectionEnd,'end');updateCode();}};
async function renderDiagram(){const version=renderVersion;const source=$('code').value;$('renderStatus').textContent=t('rendering');try {const {encoded}=await api('/api/encode',{code:source});if(version!==renderVersion)return;const base=settings.server.replace(/\/+$/,'');$('svgLink').href=`${base}/svg/${encoded}`;$('pngLink').href=`${base}/png/${encoded}`;const image=new Image();image.onload=()=>{if(version!==renderVersion)return;$('diagramImage').src=image.src;$('diagramImage').hidden=false; diagramView.width=image.naturalWidth; diagramView.height=image.naturalHeight; layoutDiagram(); $('previewEmpty').textContent='';$('renderStatus').textContent=t('rendered');};image.onerror=()=>{if(version!==renderVersion)return;$('diagramImage').hidden=true; updateZoomControls(); $('renderStatus').textContent=t('renderError');$('previewEmpty').textContent=t('renderError');};image.src=$('svgLink').href;}catch(error){if(version===renderVersion)$('renderStatus').textContent=error.message;}}
const diagramView = { scale:1, fit:true, width:0, height:0 };
const preview = $('preview');
let pan = null;
function updateZoomControls() {
  const ready = diagramView.width > 0 && !$('diagramImage').hidden;
  $('zoomIn').disabled = !ready || diagramView.scale >= 5;
  $('zoomOut').disabled = !ready || diagramView.scale <= 0.05;
  $('zoomFit').disabled = !ready;
  $('zoomLevel').textContent = Math.round(diagramView.scale * 100) + '%';
}
function layoutDiagram(anchor) {
  if (!diagramView.width || !diagramView.height || preview.hidden || !preview.clientWidth || !preview.clientHeight) { updateZoomControls(); return; }
  const padding = 20;
  if (diagramView.fit) diagramView.scale = Math.min(1, Math.max(0.05, (preview.clientWidth-padding*2)/diagramView.width), Math.max(0.05, (preview.clientHeight-padding*2)/diagramView.height));
  const width = diagramView.width * diagramView.scale, height = diagramView.height * diagramView.scale;
  const left = Math.max(padding,(preview.clientWidth-width)/2), top = Math.max(padding,(preview.clientHeight-height)/2);
  $('diagramCanvas').style.width = Math.max(preview.clientWidth,width+padding*2) + 'px';
  $('diagramCanvas').style.height = Math.max(preview.clientHeight,height+padding*2) + 'px';
  Object.assign($('diagramImage').style,{width:width+'px',height:height+'px',left:left+'px',top:top+'px'});
  if (anchor) { preview.scrollLeft = left + anchor.x * width - anchor.viewportX; preview.scrollTop = top + anchor.y * height - anchor.viewportY; }
  else if (diagramView.fit) { preview.scrollLeft=0; preview.scrollTop=0; }
  preview.classList.toggle('can-pan',preview.scrollWidth>preview.clientWidth || preview.scrollHeight>preview.clientHeight);
  updateZoomControls();
}
function zoomDiagram(factor, point) {
  if (!diagramView.width || $('diagramImage').hidden) return;
  const image = $('diagramImage'), rect = preview.getBoundingClientRect();
  const viewportX = point ? point.clientX-rect.left : preview.clientWidth/2;
  const viewportY = point ? point.clientY-rect.top : preview.clientHeight/2;
  const anchor = { viewportX, viewportY, x:(preview.scrollLeft+viewportX-image.offsetLeft)/image.offsetWidth, y:(preview.scrollTop+viewportY-image.offsetTop)/image.offsetHeight };
  diagramView.fit=false;
  diagramView.scale=Math.max(0.05,Math.min(5,diagramView.scale*factor));
  layoutDiagram(anchor);
}
$('zoomIn').onclick = () => zoomDiagram(1.25);
$('zoomOut').onclick = () => zoomDiagram(0.8);
$('zoomFit').onclick = () => { diagramView.fit=true; layoutDiagram(); };
preview.addEventListener('wheel',event => {
  if (!(event.ctrlKey || event.metaKey) || !diagramView.width) return;
  event.preventDefault(); zoomDiagram(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.005),event);
},{passive:false});
preview.addEventListener('pointerdown',event => {
  if (event.button!==0 || !preview.classList.contains('can-pan')) return;
  event.preventDefault(); preview.focus({preventScroll:true});
  pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:preview.scrollLeft,top:preview.scrollTop};
  preview.setPointerCapture(event.pointerId); preview.classList.add('panning');
});
preview.addEventListener('pointermove',event => {
  if (!pan || pan.id!==event.pointerId) return;
  preview.scrollLeft=pan.left+pan.x-event.clientX; preview.scrollTop=pan.top+pan.y-event.clientY;
});
function endPan() { pan=null; preview.classList.remove('panning'); }
preview.addEventListener('pointerup',endPan); preview.addEventListener('pointercancel',endPan); preview.addEventListener('lostpointercapture',endPan);
preview.addEventListener('keydown',event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const distance=event.shiftKey?150:50;
  const directions={ArrowLeft:[-distance,0],ArrowRight:[distance,0],ArrowUp:[0,-distance],ArrowDown:[0,distance]};
  if (directions[event.key]) { event.preventDefault(); preview.scrollBy(...directions[event.key]); }
  else if (['+','=','-','0'].includes(event.key)) { event.preventDefault(); if(event.key==='0') $('zoomFit').click(); else zoomDiagram(event.key==='-'?0.8:1.25); }
});
new ResizeObserver(() => layoutDiagram()).observe(preview);
updateZoomControls();
$('exportCode').onclick=()=>{const url=URL.createObjectURL(new Blob([$('code').value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${state.type}.puml`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const kindOptions={class:[['class','class'],['abstract class','abstract class'],['interface','interface'],['enum','enum']],usecase:[['actor','actor'],['usecase','usecase']],sequence:['participant','actor','boundary','control','entity','database','collections','queue'].map(x=>[x,x])};
const relations={class:[['-->','Asociación','Association'],['--|>','Herencia','Inheritance'],['..|>','Implementación','Realisation'],['*--','Composición','Composition'],['o--','Agregación','Aggregation'],['..>','Dependencia','Dependency'],['--','Asociación sin dirección','Undirected association'],['<-->','Asociación bidireccional','Bidirectional association']],usecase:[['-->','Asociación','Association'],['..>','Include','Include'],['..>','Extend','Extend'],['--|>','Generalización','Generalisation'],['..>','Dependencia','Dependency'],['--','Asociación sin dirección','Undirected association'],['<-->','Asociación bidireccional','Bidirectional association']],sequence:[['->','Mensaje síncrono','Synchronous message'],['->>','Mensaje asíncrono','Asynchronous message'],['-->','Respuesta','Return message'],['->x','Mensaje perdido','Lost message'],['-->>','Respuesta asíncrona','Asynchronous return']]};
function option(value,label){const el=document.createElement('option');el.value=value;el.textContent=label;return el;}
function makeDesignerCard(key, title, subtitle, content, onEdit, onDelete) {
  const collapsible = content !== null;
  const card = document.createElement(collapsible ? 'details' : 'div'); card.className = 'element';
  if(collapsible) { card.open = cardExpansion.get(key) ?? (state.type==='class'); card.addEventListener('toggle', () => cardExpansion.set(key,card.open)); }
  const head = document.createElement(collapsible ? 'summary' : 'div'); head.className = 'element-head';
  const name = document.createElement('span'); name.className = 'card-title';
  const strong = document.createElement('strong'); strong.textContent = title;
  const small = document.createElement('small'); small.textContent = subtitle; name.append(strong,small);
  const actions = document.createElement('span'); actions.className = 'element-actions';
  for (const [label,callback] of [['editElement',onEdit],['deleteElement',onDelete]]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = t(label);
    button.setAttribute('aria-label',t(label)+' '+title);
    button.onclick = event => { event.preventDefault(); event.stopPropagation(); callback(); }; actions.append(button);
  }
  head.append(name,actions); card.append(head);
  if(collapsible) { const body = document.createElement('div'); body.className = 'element-body'; body.append(content); card.append(body); }
  return card;
}
function appendWarningBadge(card, message) {
  const badge = document.createElement('span');
  badge.className = 'diagram-warning'; badge.textContent = '!'; badge.title = message;
  badge.setAttribute('role','img'); badge.setAttribute('aria-label',message);
  const head = card.querySelector('.element-head');
  head.insertBefore(badge, head.querySelector('.element-actions'));
}
function appendElementCards(target, items, emptyKey, issues = []) {
  target.replaceChildren();
  if (!items.length) { const p=document.createElement('p'); p.className='hint'; p.textContent=t(emptyKey); target.append(p); }
  for (const item of items) {
    let body;
    if (state.type==='class' || item.members) {
      body=document.createElement(item.members?'pre':'p'); body.textContent=item.members||t('noMembers');
      if (!item.members) body.className='hint';
    } else {
      body=document.createElement('dl'); body.className='element-metadata';
      const label=document.createElement('dt'), value=document.createElement('dd');
      label.textContent=t('elementIdentifier'); value.textContent=item.id; body.append(label,value);
    }
    const card=makeDesignerCard(`${state.type}:${item.id}`,item.name,kindLabel(item.kind)+(state.type==='class'&&item.name!==item.id?' · '+item.id:''),body,()=>openElement(item),()=>deleteElement(item));
    card.dataset.elementId=item.id;
    const issue=issues.find(i=>i.target==='element'&&i.id===item.id);
    if (issue) appendWarningBadge(card,t(issue.code));
    target.append(card);
  }
}
function updateDesigner() {
  const isClass=state.type==='class', isUseCase=state.type==='usecase', isSequence=state.type==='sequence', elements=parseElements(state.type,$('code').value);
  $('designerHint').textContent=t(isClass?'classDesignerHint':isUseCase?'useCaseDesignerHint':'sequenceDesignerHint');
  $('classGroup').hidden=false; $('relationshipGroup').hidden=false; $('useCaseGroup').hidden=!isUseCase;
  $('elementGroupTitle').textContent=t(isClass?'class':isUseCase?'actors':'participants');
  $('relationGroupTitle').textContent=t(isSequence?'messages':'relationships');
  $('addElement').textContent=t(isClass?'addClass':isUseCase?'newActorButton':'newParticipantButton');
  $('newRelationship').textContent=t(isSequence?'newMessageButton':'newRelationship');
  const primary=isUseCase?elements.filter(item=>item.kind==='actor'):elements;
  const useCases=isUseCase?elements.filter(item=>item.kind==='usecase'):[];
  $('classCount').textContent=primary.length; $('useCaseCount').textContent=useCases.length;
  const parsedRelations=parseDiagramRelations(state.type,$('code').value,elements);
  const issues=checkDiagram(state.type,elements,parsedRelations);
  appendElementCards($('elements'),primary,isClass?'emptyElements':isUseCase?'emptyActors':'emptyParticipants',issues);
  appendElementCards($('useCaseList'),useCases,'emptyUseCases',issues);
  $('relationLabel').previousElementSibling.textContent=t(isSequence?'messageLabel':'relationshipLabel');
  for (const id of ['from','to','activationTarget']) {
    const select=$(id), prior=select.value; select.replaceChildren(...elements.map(el=>option(el.id,el.name)));
    if(elements.some(el=>el.id===prior)) select.value=prior;
  }
  if(elements.length>1 && $('from').value===$('to').value) $('to').selectedIndex=1;
  const previousType=$('relationType').value;
  $('relationType').replaceChildren(...relations[state.type].map((r,i)=>option(String(i),r[lang==='es'?1:2])));
  if(previousType && Number(previousType)<relations[state.type].length) $('relationType').value=previousType;
  $('multiplicities').hidden=!isClass; $('sequenceTools').hidden=!isSequence;
  $('activate').disabled=$('deactivate').disabled=!elements.length;
  $('sequenceError').textContent='';
  $('newRelationship').disabled=!elements.length;
  refreshRelationshipList(elements,parsedRelations,issues);
  renderProcedureStep(elements,parsedRelations);
}
function renderProcedureStep(elements, parsedRelations) {
  const steps=stepList(state.type);
  const detected=detectStep(state.type,elements,parsedRelations,$('code').value);
  const override=current().stepOverride;
  const select=$('procedureStepSelect');
  select.replaceChildren(option('',t('procedureStepAuto')+' · '+(steps.indexOf(detected)+1)+'. '+t(`step_${state.type}_${detected}`)));
  steps.forEach((id,i)=>select.append(option(id,(i+1)+'. '+t(`step_${state.type}_${id}`))));
  select.value=steps.includes(override)?override:'';
}
$('procedureStepSelect').onchange=()=>{ current().stepOverride=$('procedureStepSelect').value||null; persist(); };
function activeProcedureStep() {
  const code=$('code').value, elements=parseElements(state.type,code);
  const relations=parseDiagramRelations(state.type,code,elements);
  const steps=stepList(state.type), override=current().stepOverride;
  return steps.includes(override)?override:detectStep(state.type,elements,relations,code);
}
function relationshipIndex(item) {
  if(state.type==='usecase') {
    if(item.kind==='include') return 1;
    if(item.kind==='extend') return 2;
    if(item.kind==='generalisation') return 3;
    if(item.kind==='dependency') return 4;
  }
  return Math.max(0,relations[state.type].findIndex(r=>r[0]===item.arrow));
}
function refreshRelationshipList(elements, parsedRelations, issues) {
  const list=$('relationshipList'), items=parsedRelations, names=new Map(elements.map(item=>[item.id,item.name]));
  $('relationshipCount').textContent=items.length; list.replaceChildren();
  if(!items.length) { const p=document.createElement('p'); p.className='hint'; p.textContent=t(state.type==='sequence'?'emptyMessages':'emptyRelationships'); list.append(p); }
  const occurrences=new Map();
  for(const item of items) {
    const kind=relations[state.type][relationshipIndex(item)], title=`${names.get(item.from)||item.from} → ${names.get(item.to)||item.to}`;
    const occurrence=occurrences.get(item.raw)||0; occurrences.set(item.raw,occurrence+1);
    const card=makeDesignerCard(`${state.type}:relationship:${item.raw}:${occurrence}`,title,kind[lang==='es'?1:2],null,()=>openRelationship(item),()=>deleteRelationship(item));
    card.classList.add('relationship-card');
    const label=document.createElement('span'); label.className='relationship-label'; label.textContent=item.label||t('noLabel');
    card.querySelector('.card-title').prepend(label);
    const issue=issues.find(i=>i.target==='relation'&&i.start===item.start);
    if (issue) appendWarningBadge(card,t(issue.code));
    list.append(card);
  }
}
function openRelationship(item) {
  editingRelationship=item||null; $('relationshipGroup').open=true;
  const isSequence=state.type==='sequence';
  $('relationDialogTitle').textContent=t(item ? (isSequence?'editMessage':'editRelationship') : (isSequence?'messageTitle':'relationTitle'));
  for (const [id,value] of [['from',item?.from],['to',item?.to]]) {
    if(value && ![...$(id).options].some(o=>o.value===value)) $(id).append(option(value,value));
    if(value) $(id).value=value;
  }
  const index=item ? relationshipIndex(item) : 0;
  $('relationType').value=String(Math.max(0,index));
  $('m1').value=item?.m1||''; $('m2').value=item?.m2||''; $('relationLabel').value=item?.label||'';
  $('addRelation').textContent=t(item ? 'saveChanges' : 'insertElement'); $('designerError').textContent='';
  $('relationDialog').showModal(); $('from').focus();
}
function deleteRelationship(item) {
  if(!confirm(t(state.type==='sequence'?'confirmDeleteMessage':'confirmDeleteRelationship'))) return;
  try { $('code').value=replaceDiagramRelation($('code').value,item); updateCode(); }
  catch { updateDesigner(); }
}
$('newRelationship').onclick=event=>{event.preventDefault();event.stopPropagation();openRelationship();};
$('closeRelationDialog').onclick=$('cancelRelationDialog').onclick=()=>$('relationDialog').close();
$('relationForm').onsubmit=event=>{event.preventDefault();saveRelationship();};
function insert(block){const source=$('code').value;const at=source.lastIndexOf('@enduml');$('code').value=at<0?source.trimEnd()+'\n'+block+'\n':source.slice(0,at).trimEnd()+'\n'+block+'\n'+source.slice(at);updateCode();}
function quote(text){return '"'+text.replace(/["\r\n]/g,' ').trim()+'"';}
function deleteElement(item){if(!confirm(t('confirmDelete')))return;const lines=$('code').value.split('\n');lines.splice(item.start,item.end-item.start+1);const re=new RegExp(`\\b${item.id}\\b`);$('code').value=lines.filter(line=>!((/(--|->|\.\.|<-)/.test(line)||/^\s*(activate|deactivate|destroy)\b/.test(line))&&re.test(line.replace(/"[^"\n]*"/g,'')))).join('\n');updateCode();}
function kindLabel(kind) {
  const labels = { class:'classKind', 'abstract class':'abstractKind', interface:'interfaceKind', enum:'enumKind', actor:'actorKind', usecase:'useCaseKind', participant:'participantKind', boundary:'boundaryKind', control:'controlKind', entity:'entityKind', database:'databaseKind', collections:'collectionsKind', queue:'queueKind' };
  return labels[kind] ? t(labels[kind]) : kind;
}
function addMemberRow(isMethod, member = {}) {
  const row = document.createElement('div');
  row.className = 'member-row' + (isMethod ? ' method-row' : '');
  row.dataset.modifier = member.modifier || '';
  const visibility = document.createElement('select');
  visibility.dataset.field = 'visibility';
  visibility.append(...[['+','publicVisibility'],['-','privateVisibility'],['#','protectedVisibility'],['~','packageVisibility'],['','defaultVisibility']].map(([value,key]) => option(value,t(key))));
  visibility.value = member.visibility ?? (isMethod ? '+' : '-');
  function field(key, control) {
    const label = document.createElement('label');
    const title = document.createElement('span'); title.textContent = t(key);
    label.append(title,control); row.append(label);
  }
  field('visibility', visibility);
  for (const [name, label, placeholder] of [['name','memberName',isMethod?'buscar':'nombre'], ...(isMethod ? [['parameters','parameters','id : int']] : []), ['type',isMethod?'returnType':'attributeType',isMethod?'boolean':'String']]) {
    const input = document.createElement('input'); input.dataset.field = name;
    input.value = member[name] || ''; input.placeholder = placeholder; input.maxLength = 500;
    field(label,input);
  }
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
  remove.className = 'member-remove'; remove.setAttribute('aria-label',t('removeMember')); remove.title = t('removeMember');
  remove.onclick = () => row.remove(); row.append(remove);
  $(isMethod ? 'methodRows' : 'attributeRows').append(row);
  return row;
}
function readMemberRows(id) {
  return [...$(id).children].map(row => Object.fromEntries([['modifier',row.dataset.modifier], ...[...row.querySelectorAll('[data-field]')].map(input => [input.dataset.field,input.value])]));
}
function openElement(item, preferredKind) {
  editingElement = item || null;
  const isClass = state.type === 'class';
  const kind=item?.kind||preferredKind||kindOptions[state.type][0][0];
  $('elementTitle').textContent=item ? t('editElement')+' '+item.name : t(isClass?'newClass':state.type==='sequence'?'newParticipant':kind==='actor'?'newActor':'newUseCase');
  $('elementName').value = item?.name || ''; $('elementId').value = item?.id || '';
  $('elementKind').replaceChildren(...kindOptions[state.type].map(([value]) => option(value,kindLabel(value))));
  $('elementKind').value=kind;
  updateElementPresentation();
  $('classMemberFields').hidden = !isClass;
  $('attributeRows').replaceChildren(); $('methodRows').replaceChildren();
  const parsed = parseClassMembers(item?.members || '');
  if (isClass) {
    (item ? parsed.attributes : [{}]).forEach(member => addMemberRow(false,member));
    parsed.methods.forEach(member => addMemberRow(true,member));
  }
  $('extraMembers').value = parsed.extra; $('extraMembersLabel').hidden = !isClass || !parsed.extra;
  $('elementAdvanced').open = Boolean(parsed.extra);
  $('saveElement').textContent = t(item ? 'saveChanges' : 'insertElement');
  $('elementError').textContent = ''; $('elementDialog').showModal(); $('elementName').focus();
}
function updateElementPresentation() {
  const kind=$('elementKind').value;
  if(!editingElement) $('elementTitle').textContent=t(state.type==='class'?'newClass':state.type==='sequence'?'newParticipant':kind==='actor'?'newActor':'newUseCase');
  $('elementName').placeholder=kind==='actor'?(lang==='es'?'Usuario':'User'):kind==='usecase'?(lang==='es'?'Solicitar préstamo':'Request a loan'):state.type==='class'?(lang==='es'?'Producto':'Product'):(lang==='es'?'Servicio':'Service');
}
$('elementKind').onchange=updateElementPresentation;
$('addElement').onclick = event => { event.preventDefault(); event.stopPropagation(); $('classGroup').open=true; openElement(); };
$('newUseCase').onclick=event=>{event.preventDefault();event.stopPropagation();$('useCaseGroup').open=true;openElement(null,'usecase');};
$('cancelElement').onclick = $('cancelElementFooter').onclick = () => $('elementDialog').close();
$('addAttribute').onclick = () => addMemberRow(false).querySelector('[data-field="name"]').focus();
$('addMethod').onclick = () => addMemberRow(true).querySelector('[data-field="name"]').focus();
$('elementName').oninput = () => { if (!editingElement) $('elementId').value = $('elementName').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_]/g,'_').replace(/^[^A-Za-z_]/,'_'); };
$('elementId').oninvalid = () => { $('elementAdvanced').open = true; };
$('elementForm').onsubmit = e => {
  e.preventDefault();
  const id = $('elementId').value.trim(), name = $('elementName').value.trim();
  if (!/^[A-Za-z_]\w*$/.test(id) || !name) { $('elementError').textContent = t('invalid'); return; }
  if (parseElements(state.type,$('code').value).some(item => item.id === id && item.id !== editingElement?.id)) { $('elementError').textContent = t('duplicate'); return; }
  let members = '';
  try {
    if (state.type === 'class') members = serializeClassMembers({ attributes:readMemberRows('attributeRows'), methods:readMemberRows('methodRows'), extra:$('extraMembers').value });
  } catch { $('elementError').textContent = t('invalidMember'); return; }
  const declaration = $('elementKind').value + ' ' + (name === id ? id : quote(name) + ' as ' + id);
  const retainedMembers=state.type==='class'?members:editingElement?.members||'';
  const hasBlock=state.type==='class'||editingElement&&editingElement.end>editingElement.start;
  const block=hasBlock?declaration+' {\n'+retainedMembers.split('\n').filter(line=>line.trim()).map(line=>'  '+line).join('\n')+'\n}':declaration;
  if (editingElement) {
    const lines = $('code').value.split('\n');
    lines.splice(editingElement.start,editingElement.end-editingElement.start+1,block);
    if (id !== editingElement.id) {
      const re = new RegExp(`\\b${editingElement.id}\\b`,'g');
      for (let i=0;i<lines.length;i++) if (/(--|->|\.\.|<-)|^\s*(activate|deactivate|destroy)\b/.test(lines[i])) lines[i] = lines[i].split(/("[^"\n]*")/).map((part,j) => j%2 ? part : part.replace(re,id)).join('');
    }
    $('code').value = lines.join('\n'); updateCode();
  } else insert(block);
  $('elementDialog').close();
};
function saveRelationship() {
  const a=$('from').value, b=$('to').value; $('designerError').textContent='';
  if(!a||!b) { $('designerError').textContent=t('missingElements'); return; }
  const index=Number($('relationType').value), arrow=relations[state.type][index][0];
  const label=$('relationLabel').value.trim().replace(/[\r\n]/g,' ');
  if(state.type==='sequence'&&!label) { $('designerError').textContent=t('relationRequired'); return; }
  const kind=state.type==='usecase'&&index===1?'include':state.type==='usecase'&&index===2?'extend':'';
  let line;
  try {
    line=generateDiagramRelation(state.type,{from:a,to:b,arrow,kind,label,m1:state.type==='class'?$('m1').value.trim():editingRelationship?.m1||'',m2:state.type==='class'?$('m2').value.trim():editingRelationship?.m2||''});
  } catch { $('designerError').textContent=t('invalid'); return; }
  if(editingRelationship) {
    try { $('code').value=replaceDiagramRelation($('code').value,editingRelationship,line); updateCode(); }
    catch { $('designerError').textContent=t('relationChanged'); return; }
  } else insert(line);
  $('relationDialog').close(); editingRelationship=null; $('relationLabel').value='';
}
$('addAlt').onclick=()=>insert(`alt ${$('condition').value.replace(/[\r\n]/g,' ')}\n  ' Add messages here\nelse\n  ' Add alternative messages here\nend`);
$('addLoop').onclick=()=>insert(`loop ${$('condition').value.replace(/[\r\n]/g,' ')}\n  ' Add messages here\nend`);
for(const id of ['activate','deactivate']) $(id).onclick=()=>{
  $('sequenceError').textContent='';
  if($('activationTarget').value) insert(id+' '+$('activationTarget').value);
  else $('sequenceError').textContent=t('emptySequenceTarget');
};
function renderExercise(){
  const target=$('exerciseHtml');target.replaceChildren();
  if(!state.exercise.trim()){const p=document.createElement('p');p.className='hint';p.textContent=t('emptyExercise');target.append(p);return;}
  const text=state.exercise;
  // Cross-reference against the current diagram so a highlight already
  // represented by a class/actor/use case/participant or a relationship
  // label isn't flagged, regardless of which category the tutor gave it.
  const diagramElements=parseElements(state.type,$('code').value);
  const diagramRelations=parseDiagramRelations(state.type,$('code').value,diagramElements);
  const uncoveredQuotes=new Set(uncoveredHighlights(highlights,diagramElements,diagramRelations).map(h=>h.quote));
  const ranges=[];for(const h of highlights){let at=0;while((at=text.indexOf(h.quote,at))!==-1){ranges.push({...h,start:at,end:at+h.quote.length});at+=h.quote.length;if(ranges.length>=300)break;}if(ranges.length>=300)break;}
  ranges.sort((a,b)=>a.start-b.start||b.end-a.end);
  const p=document.createElement('p');let cursor=0;
  for(const r of ranges){
    if(r.start<cursor)continue;
    p.append(document.createTextNode(text.slice(cursor,r.start)));
    const mark=document.createElement('mark');mark.className=r.category;mark.textContent=text.slice(r.start,r.end);
    const isUncovered=uncoveredQuotes.has(r.quote);
    if(isUncovered)mark.classList.add('uncovered');
    mark.title=isUncovered?r.reason+' · '+t('uncoveredHint'):r.reason;
    p.append(mark);cursor=r.end;
  }
  p.append(document.createTextNode(text.slice(cursor)));target.append(p);
}
$('editExercise').onclick=()=>{editingExercise=!editingExercise;$('exerciseInput').hidden=!editingExercise;$('exerciseHtml').hidden=editingExercise;$('editExercise').textContent=t(editingExercise?'done':'edit');if(editingExercise){$('exerciseInput').value=state.exercise;$('exerciseInput').focus();}else renderExercise();};
$('exerciseInput').oninput=()=>{state.exercise=$('exerciseInput').value;highlights=[];persist();};
$('clearHighlights').onclick=()=>{highlights=[];renderExercise();};
$('loadExercise').onclick=()=>$('exerciseFile').click();
$('exerciseFile').onchange=async()=>{const file=$('exerciseFile').files[0];if(!file)return;$('exerciseFile').value='';if(!/\.(txt|pdf)$/i.test(file.name)||file.size>10000000){$('exerciseStatus').textContent=t('fileError');return;}$('loadExercise').disabled=true;$('exerciseStatus').textContent=t('loading');try{const text=/\.pdf$/i.test(file.name)?(await api('/api/pdf',await file.arrayBuffer(),true)).text:await file.text();if(text.length>100000)throw new Error(lang==='es'?'El enunciado supera los 100.000 caracteres.':'The exercise exceeds 100,000 characters.');state.exercise=text.replace(/\r\n/g,'\n');highlights=[];$('exerciseInput').value=state.exercise;renderExercise();persist();$('exerciseStatus').textContent=t('loaded')+' · '+file.name;}catch(error){$('exerciseStatus').textContent=error.message;}finally{$('loadExercise').disabled=false;}};
function renderMessages(){
  const target=$('messages');
  const atBottom=target.scrollHeight-target.scrollTop-target.clientHeight<70;
  const scrollTop=target.scrollTop;
  target.replaceChildren();
  target.setAttribute('aria-busy',String(busy));
  if(!current().messages.length){const p=document.createElement('p');p.className='hint';p.textContent=t('emptyChat');target.append(p);}
  const messages=pendingReply ? [...current().messages,pendingReply] : current().messages;
  for(const m of messages){
    const item=document.createElement('div');item.className='message '+m.role;
    const label=document.createElement('div');label.className='message-label';label.textContent=m.role==='user'?t('you'):t('assistant');
    const bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=m.content;
    item.append(label,bubble);
    if(m===pendingReply){
      item.classList.add('streaming');
      if(!m.content){bubble.textContent=t('thinking');bubble.classList.add('thinking');}
    }
    if(m.highlights?.length){const b=document.createElement('button');b.textContent=t('showHighlights');b.disabled=m.exercise!==state.exercise;b.onclick=()=>{highlights=m.highlights;renderExercise();};item.append(b);}
    if(m.diagramHighlights?.length){const b=document.createElement('button');b.textContent=t('showDiagramHighlights');b.disabled=m.diagramType!==state.type||m.code!==$('code').value;b.onclick=()=>pointOutElements(m.diagramHighlights);item.append(b);}
    target.append(item);
  }
  target.scrollTop=atBottom?target.scrollHeight:scrollTop;
}
// A temporary, passive visual anchor — not a modal or auto-scroll takeover —
// so pointing at a cited element never pulls focus away from what the
// student was doing in the Designer.
function pointOutElements(citations) {
  const designer=document.querySelector('.designer');
  let first=true;
  for (const {element,reason} of citations) {
    const card=designer.querySelector(`[data-element-id="${CSS.escape(element)}"]`);
    if (!card) continue;
    if (card.tagName==='DETAILS') card.open=true;
    card.classList.add('cited');
    const previousTitle=card.title;
    if (reason) card.title=reason;
    if (first) { card.scrollIntoView({behavior:'smooth',block:'center'}); first=false; }
    setTimeout(()=>{ card.classList.remove('cited'); card.title=previousTitle; },4000);
  }
}
function chatConfigured(){
  const profile=settings.providers[settings.provider];
  if(settings.provider==='server')return !!profile?.model?.trim() && isServerDefaultUnlocked();
  if(!profile?.model?.trim())return false;
  if(settings.provider==='compatible')return validUrl(profile.endpoint);
  return ['openai','anthropic','gemini'].includes(settings.provider)&&!!profile.apiKey?.trim();
}
function updateModel(){
  const profile=settings.providers[settings.provider];
  const ready=chatConfigured();
  const status=busy?'busy':chatConnectionError?'error':ready?'ready':'unconfigured';
  const text=t(busy?(pendingReply?.content?'responding':'thinking'):chatConnectionError?'chatConnectionError':ready?'chatReady':'chatNotReady');
  $('connectionStatus').textContent=text;
  const shownModel=profile?.model?.trim() || (settings.provider==='server' ? (serverDefaults.openai?.model||'') : '');
  $('modelStatus').textContent=shownModel?`${settings.provider==='server'?'openai':settings.provider} · ${shownModel}`:t('noModel');
  $('assistantConnection').dataset.state=status;
  $('assistantConnection').title=t(busy?'sendingHint':chatConnectionError?'chatConnectionError':ready?'readyHint':'keyRequired');
  $('assistantToggle').dataset.connection=status;
  $('assistantToggle').title=t('openAssistant')+' · '+text;
}
$('clearChat').onclick=()=>{if(confirm(t('confirmChat'))){current().messages=[];highlights=[];persist();renderMessages();renderExercise();}};
function setBusy(value){
  busy=value;
  for(const id of ['send','clearChat','newDiagram','diagramType','settingsButton'])$(id).disabled=value;
  $('send').textContent=t(value?'responding':'send');
  updateModel();renderMessages();
}
$('chatInput').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){
    event.preventDefault();
    if(!busy&&$('chatInput').value.trim())$('chatForm').requestSubmit();
  }
});
async function streamChat(data,onText){
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,stream:true})});
  if(!response.ok){const result=await response.json();throw new Error(result.error||t('requestError'));}
  let result;
  for await(const data of readSSE(response.body)){
    const event=JSON.parse(data);
    if(event.type==='error')throw new Error(event.error||t('requestError'));
    if(event.type==='delta')onText(event.text);
    if(event.type==='done'){result=event;break;}
  }
  if(!result||typeof result.message!=='string')throw new Error(t('requestError'));
  return result;
}
$('chatForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  const profile=settings.providers[settings.provider]||{};
  if(!chatConfigured()){$('chatError').textContent=t('keyRequired');openSettings();return;}
  const question=$('chatInput').value.trim();if(!question)return;
  $('chatError').textContent='';chatConnectionError=false;
  const workspace=current(),previous=workspace.messages;
  const history=previous.slice(-38).map(m=>({role:m.role,content:m.content}));
  if(history[0]?.role==='assistant')history.shift();
  const exercise=state.exercise;
  workspace.messages=[...previous,{role:'user',content:question}];
  $('chatInput').value='';pendingReply={role:'assistant',content:''};setBusy(true);
  $('messages').scrollTop=$('messages').scrollHeight;
  try{
    const isServer=settings.provider==='server';
    const result=await streamChat({provider:isServer?'openai':settings.provider,model:profile.model||(isServer?(serverDefaults.openai?.model||''):''),apiKey:isServer?'':(profile.apiKey||''),serverDefaultToken:isServer?settings.serverDefaultToken:undefined,endpoint:isServer?undefined:profile.endpoint,exercise,code:$('code').value,diagramType:state.type,procedureStep:activeProcedureStep(),messages:[...history,{role:'user',content:question}]},text=>{
      pendingReply.content=text;
      if(!messageFrame)messageFrame=requestAnimationFrame(()=>{messageFrame=null;renderMessages();updateModel();});
    });
    workspace.messages.push({role:'assistant',content:result.message,highlights:result.highlights,exercise,diagramHighlights:result.diagramHighlights,diagramType:state.type,code:$('code').value});
    if(exercise===state.exercise){highlights=result.highlights;renderExercise();}else $('chatError').textContent=t('fileChanged');
    pendingReply=null;persist();
  }catch(error){
    workspace.messages=previous;
    if(!$('chatInput').value)$('chatInput').value=question;
    $('chatError').textContent=error.message+' · '+t('requestFailed');chatConnectionError=true;persist();
  }finally{
    cancelAnimationFrame(messageFrame);messageFrame=null;pendingReply=null;setBusy(false);
    if(state.assistantOpen)$('chatInput').focus({preventScroll:true});
  }
};
let settingsDraft = {}, draftProvider, modelRequest;
function rememberDraft() {
  if (!draftProvider) return;
  settingsDraft[draftProvider] = { ...settingsDraft[draftProvider], model:$('model').value.trim(), apiKey:$('apiKey').value.trim(), endpoint:$('endpoint').value.trim(), manualModel:$('modelSelect').value === '__manual__' };
}
function cancelModelRequest() {
  modelRequest?.abort(); modelRequest = null;
  $('loadModels').disabled = false;
  $('loadModels').textContent = t('loadModels');
  $('modelSettings').removeAttribute('aria-busy');
}
function modelStatus(key, error = false, extra = '') {
  $('modelsStatus').textContent = t(key) + extra;
  $('modelsStatus').classList.toggle('error',error);
}
function populateModels() {
  const profile = settingsDraft[draftProvider] || {};
  const models = profile.models || [];
  const search = $('modelSearch').value.trim().toLocaleLowerCase();
  const selected = $('model').value;
  const matches = models.filter(m => (m.name+' '+m.id).toLocaleLowerCase().includes(search));
  // Keep the chosen model visible while searching; filtering must not change it.
  const chosen = models.find(m => m.id === selected);
  if (chosen && !matches.some(m => m.id === selected)) matches.unshift(chosen);
  const select = $('modelSelect');
  select.replaceChildren(new Option(t('chooseModel'),''));
  for (const model of matches) select.add(new Option(model.name === model.id ? model.id : model.name+' · '+model.id,model.id));
  select.add(new Option(t('manualModel'),'__manual__'));
  const manual = profile.manualModel === true || !!(selected && !chosen);
  select.value = manual ? '__manual__' : selected;
  $('manualModelLabel').hidden = !manual;
  $('modelSearchLabel').hidden = !models.length;
  $('loadModels').textContent = t(models.length ? 'refreshModels' : 'loadModels');
}
function loadProfile(provider) {
  cancelModelRequest(); draftProvider = provider;
  const profile = settingsDraft[provider] || {};
  const isServer = provider === 'server';
  if (isServer && !profile.model && serverDefaults.openai?.model) profile.model = serverDefaults.openai.model;
  $('model').value = profile.model || '';
  $('apiKey').value = isServer ? '' : (profile.apiKey || '');
  $('apiKey').type = 'password';
  $('toggleKey').textContent = t('showKey');
  $('toggleKey').setAttribute('aria-pressed','false');
  $('endpoint').value = isServer ? '' : (profile.endpoint || '');
  $('endpointLabel').hidden = provider !== 'compatible';
  $('endpoint').required = provider === 'compatible';
  $('apiKeyLabel').hidden = isServer;
  $('serverDefaultSection').hidden = !isServer;
  if (isServer) updateServerDefaultStatus();
  $('keyHelp').textContent = t(isServer ? 'serverDefaultHint' : (provider === 'compatible' ? 'localKeyHint' : 'modelsKeyHint'));
  $('modelSearch').value = '';
  populateModels();
  modelStatus(profile.models?.length ? 'modelsCached' : 'modelsReady',false,profile.models?.length ? ' ('+profile.models.length+')' : '');
}
function openSettings() {
  settingsDraft = structuredClone(settings.providers);
  $('provider').value = settings.provider;
  $('plantumlServer').value = settings.server;
  $('idleNudgeMinutes').value = settings.idleNudgeMinutes;
  $('settingsError').textContent = '';
  loadProfile(settings.provider);
  $('settingsDialog').showModal();
}
$('settingsButton').onclick = openSettings;
$('closeSettings').onclick = () => $('settingsDialog').close();
$('settingsDialog').addEventListener('close',() => { cancelModelRequest(); $('apiKey').type='password'; });
$('provider').onchange = () => { rememberDraft(); loadProfile($('provider').value); };
function validUrl(text) { try { const u=new URL(text); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!u.search&&!u.hash; } catch { return false; } }
function invalidateModels(endpointChanged = false) {
  cancelModelRequest();
  const profile = settingsDraft[draftProvider] ||= {};
  delete profile.models;
  if (endpointChanged) { $('model').value = ''; profile.model=''; }
  profile.manualModel = !!$('model').value;
  $('modelSearch').value = '';
  populateModels();
  modelStatus('modelsChanged');
}
$('apiKey').oninput = () => invalidateModels();
$('endpoint').oninput = () => invalidateModels(true);
$('toggleKey').onclick = () => {
  const show = $('apiKey').type === 'password';
  $('apiKey').type = show ? 'text' : 'password';
  $('toggleKey').textContent = t(show ? 'hideKey' : 'showKey');
  $('toggleKey').setAttribute('aria-pressed',String(show));
};
$('unlockServerDefault').onclick = async () => {
  const password = $('serverDefaultPassword').value;
  if (!password) { $('serverDefaultError').textContent = t('serverDefaultPasswordRequired'); return; }
  $('serverDefaultError').textContent = '';
  $('unlockServerDefault').disabled = true;
  try {
    const response = await fetch('/api/server-default/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    const result = await response.json();
    if (!response.ok) { $('serverDefaultError').textContent = result.error || t('serverDefaultWrongPassword'); return; }
    settings.serverDefaultToken = result.token;
    saveSettings();
    $('serverDefaultPassword').value = '';
    updateServerDefaultStatus();
  } catch {
    $('serverDefaultError').textContent = t('requestError');
  } finally {
    $('unlockServerDefault').disabled = false;
  }
};
$('modelSearch').oninput = populateModels;
$('modelSelect').onchange = () => {
  const manual = $('modelSelect').value === '__manual__';
  settingsDraft[draftProvider] ||= {};
  settingsDraft[draftProvider].manualModel = manual;
  $('manualModelLabel').hidden = !manual;
  if (manual) $('model').focus();
  else $('model').value = $('modelSelect').value;
};
$('loadModels').onclick = async () => {
  rememberDraft();
  const provider = draftProvider, profile = settingsDraft[provider];
  const isServer = provider === 'server';
  if (isServer && !isServerDefaultUnlocked()) { modelStatus('serverDefaultLocked',true); return; }
  if (!isServer && provider !== 'compatible' && !profile.apiKey) { modelStatus('modelsKeyRequired',true); $('apiKey').focus(); return; }
  if (provider === 'compatible' && !validUrl(profile.endpoint)) { modelStatus('serverInvalid',true); $('endpoint').focus(); return; }
  cancelModelRequest();
  const controller = new AbortController(); modelRequest = controller;
  $('loadModels').disabled = true;
  $('loadModels').textContent = t('modelsLoading');
  $('modelSettings').setAttribute('aria-busy','true');
  modelStatus('modelsLoading');
  try {
    const body = isServer ? { provider:'openai', apiKey:'', serverDefaultToken:settings.serverDefaultToken } : { provider, apiKey:profile.apiKey, endpoint:profile.endpoint };
    const response = await fetch('/api/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const result = await response.json();
    if (modelRequest !== controller) return;
    if (!response.ok) { modelStatus(result.code && strings[lang][result.code] ? result.code : 'modelsNetworkError',true); return; }
    profile.models = result.models;
    // Preserve an existing choice; never silently replace a model the student chose.
    profile.manualModel = !result.models.length || !!profile.model && !result.models.some(m => m.id === profile.model);
    $('modelSearch').value = '';
    populateModels();
    modelStatus(result.models.length ? 'modelsLoaded' : 'modelsEmpty',false,result.models.length ? ' ('+result.models.length+')' : '');
  } catch (error) {
    if (modelRequest === controller && error.name !== 'AbortError') modelStatus('modelsNetworkError',true);
  } finally {
    if (modelRequest === controller) { cancelModelRequest(); populateModels(); }
  }
};
$('settingsForm').onsubmit = e => {
  e.preventDefault(); rememberDraft();
  try {
    if (!validUrl($('plantumlServer').value) || $('provider').value==='compatible' && !validUrl($('endpoint').value)) throw new Error(t('serverInvalid'));
    // Opening a collapsed invalid renderer field must still allow correction.
    settings.providers=settingsDraft; settings.provider=$('provider').value;
    settings.server=$('plantumlServer').value.trim().replace(/\/+$/,'');
    settings.idleNudgeMinutes=Math.min(120,Math.max(1,Math.round(Number($('idleNudgeMinutes').value)) || 5));
    if (!saveSettings()) return;
    $('settingsDialog').close(); chatConnectionError=false; updateModel(); checkIdleNudge(); renderVersion++; renderDiagram();
  } catch(error) { $('settingsError').textContent=error.message; }
};
$('plantumlServer').addEventListener('invalid',() => { $('plantumlServer').closest('details').open=true; });
$('forgetKeys').onclick = () => {
  cancelModelRequest();
  for (const profiles of [settings.providers,settingsDraft]) for (const profile of Object.values(profiles)) { delete profile.apiKey; delete profile.models; }
  $('apiKey').value=''; populateModels(); modelStatus('modelsReady');
  if (saveSettings()) $('settingsError').textContent=t('keyForgotten');
  chatConnectionError=false;updateModel();
};
(async () => {
  try {
    const response = await fetch('/api/config');
    if (response.ok) serverDefaults = (await response.json()).defaults || {};
    updateModel();
  } catch {}
})();
setLanguage();loadDiagram();
