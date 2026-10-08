# ModelaU — UML learning studio

A four-panel learning workspace inspired by the supplied PlantUML editor. Plain HTML, CSS and browser JavaScript; a small Node.js server handles provider requests, PlantUML encoding and PDF text extraction.

## Run

Requires Node.js **22.13+** (Node 24 recommended).

```sh
npm install
npm start
```

Open http://localhost:3000. `npm run dev` restarts Node on source changes; refresh the browser after frontend changes. Set `PORT` to change the port. The server binds to the local machine, `127.0.0.1`.

## Workspace

1. **Designer:** create, edit and delete classes, interfaces, enums, actors, use cases and sequence participants. Add relationships, multiplicities, messages, activation and `alt` / `loop` skeletons. All three designers use the same grouped layout, with counts, collapsible lists and a New button for each list: **Classes / Relationships**, **Actors / Use cases / Relationships**, and **Participants / Messages**. All lists use matching UML cards with Edit and Delete actions. Element cards are collapsible; actor, use-case and participant cards start collapsed and show their identifiers when expanded. Relationship and message cards show only the label/message, endpoints and type, with full properties available in the Edit dialog. Sequence messages retain source order; editing or deleting a message changes only its own source line, including inside a fragment. Include/extend relationships reopen with their stereotype separated from the editable label, so saving does not duplicate it. Sequence fragment and activation controls remain in a separate collapsible group with an independent participant selector. Relationships open in a form with endpoints, type, multiplicities and label; editing replaces the selected relationship line. Class forms provide separate attribute and method rows with visibility, name, type, parameters and return-type fields, plus add/remove buttons. Existing members reopen in those fields; unsupported member lines are preserved in advanced options. Element forms accept display names; stable PlantUML identifiers are available under advanced options.
2. **Diagram:** switch between PlantUML code and preview. Rendering updates as you type. Zoom in/out, fit the whole diagram, and drag to pan when it exceeds the view. Scrollbars and arrow keys also navigate; Ctrl + wheel zooms around the pointer. The focused preview accepts + / − for zoom and 0 to fit. Export `.puml`, SVG or PNG. The designer recognises simple declarations; advanced PlantUML remains editable in code and is preserved. Edit relationships and sequence messages from their designer cards or in code; advanced constructs remain available in code.
3. **Exercise:** paste or edit text, load `.txt` or extract text from `.pdf` (10 MB / 100 pages / 100,000 characters). Text-based PDFs are supported; scanned PDFs need OCR elsewhere. Extraction loses original PDF formatting and may need correction for complex columns.
4. **Assistant:** hidden by default. Students can open or hide it using the circular tutor avatar at the bottom right or close it from its panel (× or Escape). UMLBuddy always opens as a docked workspace panel, without covering the diagram or exercise. Wide screens show four columns; medium screens use two rows; phones stack the panels vertically. Opening scrolls the panel into view when needed. The other panels use the freed space, and hiding preserves chat history and unsent text. The visibility choice is remembered in this browser. The connection indicator is green when the selected provider has a model and the required credentials (or a valid keyless compatible endpoint), red when setup is missing or a request fails, and amber while responding. Green means configured, not a guarantee of quota or credentials: availability is checked on sending. Enter sends a message; Shift+Enter inserts a newline. Replies stream progressively using native SSE from OpenAI, Anthropic, Gemini and compatible endpoints; validated exercise highlights are applied only after completion. Compatible servers returning ordinary JSON still work, but cannot display live generation. Interrupted replies are discarded and the question is restored for retry. The student asks questions; the provider receives the exercise, current diagram code and up to 39 recent chat messages. Chat and diagram drafts are separate for each diagram type. Exercise text is shared between types. English and Spanish interfaces are available; the assistant follows the student's language.

The app header contains the logo, language selection and LLM settings. Diagram type and New are inside the Designer panel header, below its title and quiet save indicator. There is no separate workspace bar, and the controls adapt to the panel width. Language uses a globe icon and native selector, and LLM settings uses a gear icon with a label (shortened visually to LLM on phones while keeping its full accessible name).

Drafts, chat, language and settings are saved in browser localStorage. No accounts or database are needed.

## LLM configuration

Open **LLM settings**. Choose OpenAI, Anthropic, Google Gemini or an OpenAI-compatible endpoint, enter its key, and press **Load models**. Search by name or ID and choose a model from the dropdown, then save. **Refresh models** checks the provider again. Each provider keeps its own key, selected model and cached list in this browser; reopening settings uses that saved list without making a request. Changing the key or endpoint invalidates the list, and changing a custom endpoint also clears its model. Provider switches and closing settings cancel pending UI requests so an old response cannot overwrite another profile. Credentials and selections edited in the dialog are saved only when you press **Save**. **Delete all keys** takes effect immediately. Use **Enter a model manually** if listing is unavailable or a model is missing. Model listing checks credentials for that endpoint; it does not guarantee chat compatibility, available credit or quota. Keys are intentionally stored in localStorage as requested, which is not encrypted. They are sent to this local Node server and forwarded only to the selected provider for each request, never written to server files or logged. Use a trusted device and **Delete all keys** when needed. Provider usage may incur charges.

For compatible servers, supply the API base URL including `/v1`, for example `http://localhost:11434/v1`; the app appends `/models` for discovery and `/chat/completions` for chat. The key is optional for compatible local servers that do not require authentication; when empty, no Authorization header is sent. Choose only an endpoint you trust: it receives the key, conversation and exercise. Compatible servers need to follow the chat-completions response format. This adapter requests JSON via the system prompt rather than requiring provider-specific JSON-mode support.

The local Node route `POST /api/models` forwards a GET to the provider’s model-list API with its native authentication: OpenAI `/v1/models`, Anthropic `/v1/models` (with cursor pagination), Gemini `/v1beta/models` (with page tokens), or the compatible base URL plus `/models`. Gemini models are limited to those advertising `generateContent`, and their `models/` prefix is removed for chat requests. Results are normalized, deduplicated and sorted. Discovery has a 30-second timeout and bounds on pages and model count. Errors distinguish missing keys, authentication, rate limits, unsupported endpoints, malformed responses and connection failures; raw provider error bodies are never displayed. Lists are loaded explicitly without sending the exercise or diagram.

The discovery flow was informed by [DeceptionAnalyser’s provider settings](https://github.com/onekin/DeceptionAnalyser/blob/main/app/scripts/options/Options.js) and [model-list implementation](https://github.com/onekin/DeceptionAnalyser/blob/main/app/scripts/background/LLM_Manager.js), adapted for the app’s native provider APIs. See the official [OpenAI model list](https://developers.openai.com/api/reference/resources/models/methods/list), [Anthropic model list](https://platform.claude.com/docs/en/api/models/list) and [Gemini models](https://ai.google.dev/api/models) documentation.

The system prompt is clearly identified at [`prompts/student-assistant.md`](prompts/student-assistant.md). Restart Node after editing it. It asks for gradual hints, conceptual explanations and student reasoning, with no complete exercise solution. This is a prompt-based teaching policy; model compliance is not guaranteed and must be evaluated before classroom use.

## Exercise highlights: no tool calling required

The tutor returns a JSON object:

```json
{
  "message": "Which participant initiates this interaction?",
  "highlights": [
    {"quote": "the student requests a loan", "category": "actor", "reason": "Look for the initiator."}
  ]
}
```

The server validates exact quotes and the three allowed categories (`requirement`, `actor`, `ambiguity`). The browser renders plain text using DOM text nodes and `<mark>` elements. It never executes or injects model-generated HTML. Every exact occurrence is highlighted; overlapping quotes prefer the earlier, longer match. The latest response replaces previous highlights; past response buttons restore them while the exercise is unchanged. Students can clear the colours. Unstructured model text still appears as plain text with no highlights.

This contract is sufficient for annotations. Tool calling would become useful if a later version lets the tutor perform explicit actions, such as proposing edits that the student can review and apply.

## PlantUML rendering

The default is `https://www.plantuml.com/plantuml`. **Diagram code is sent to that server**, encoded but not encrypted beyond HTTPS. Public rendering is convenient for a prototype. For private coursework or institutional use, run a local/institutional PlantUML server and set its base URL in settings (for example `http://localhost:8080/plantuml`, depending on your installation). Neither exercise text nor API keys are sent to PlantUML.

Syntax references: [classes](https://plantuml.com/es/class-diagram), [use cases](https://plantuml.com/es/use-case-diagram), [sequence](https://plantuml.com/es/sequence-diagram). Provider adapters follow the official [OpenAI chat API](https://developers.openai.com/api/docs/guides/structured-outputs) and [streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create) and [Gemini generateContent API](https://ai.google.dev/api/generate-content).

## Validation and limits

`npm test` checks structured class-member parsing and generation, preservation of advanced member lines, field validation, class-relationship parsing and generation (including reversed arrows and duplicates), use-case and sequence parsing/generation, stereotypes, source order, note/comment exclusion and preservation of surrounding source during edits/deletion, encoding round trips, quote/category validation and provider request adapters. Streaming tests cover fragmented UTF-8 and SSE frames, partial JSON string decoding, all four provider adapters, progressive replies, final highlight validation, interrupted streams, provider errors, truncation and compatible JSON fallback. Model-discovery tests cover authentication, optional local keys, response normalization, pagination, deduplication, malformed responses, empty lists, timeouts and provider errors. Local integration checks verified PDF extraction, rejection of invalid input, compatible chat and highlights using a temporary mock provider. Browser checks covered class creation, code/preview toggling, use-case relationships, sequence messages, language switching and safe exercise highlights. Real provider calls require your keys and have not been tested against a paid account.

This is a local prototype. A multi-user deployment needs authentication, request quotas, HTTPS and deployment-specific protection for configurable endpoints. The browser loads no third-party scripts or fonts. PDF.js is the only direct npm dependency.

## Reverting the avatar trial

The previous toolbar-button interface is saved in `.ui-backups/assistant-before-avatar-2026-10-08/`. Restore its `public/index.html`, `public/app.js`, `public/styles.css` and `README.md` to the corresponding project paths, then reload the browser. This does not change diagrams, chat history or provider settings stored in the browser.
