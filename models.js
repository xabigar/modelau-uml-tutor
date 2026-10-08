// Provider model discovery. Credentials are used only for these requests.
export class ModelDiscoveryError extends Error {
  constructor(code, upstreamStatus, status = 502) {
    super('Unable to load provider models.');
    this.code = code;
    this.upstreamStatus = upstreamStatus;
    this.status = status;
  }
}

export function modelListRequest(provider, apiKey, endpoint) {
  if (!['openai', 'anthropic', 'gemini', 'compatible'].includes(provider)) throw new ModelDiscoveryError('providerInvalid', undefined, 400);
  if (typeof apiKey !== 'string' || apiKey.length > 1000 || /[\r\n]/.test(apiKey) || (provider !== 'compatible' && !apiKey.trim())) throw new ModelDiscoveryError('modelsKeyRequired', undefined, 400);
  const key = apiKey.trim();
  if (provider === 'compatible') {
    let base;
    try { base = new URL(endpoint); } catch { throw new ModelDiscoveryError('serverInvalid', undefined, 400); }
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new ModelDiscoveryError('serverInvalid', undefined, 400);
    return { url: base.href.replace(/\/+$/, '') + '/models', headers: key ? { Authorization: `Bearer ${key}` } : {} };
  }
  if (provider === 'anthropic') return { url: 'https://api.anthropic.com/v1/models?limit=100', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } };
  if (provider === 'gemini') return { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', headers: { 'x-goog-api-key': key } };
  return { url: 'https://api.openai.com/v1/models', headers: { Authorization: `Bearer ${key}` } };
}

export function normalizeModels(provider, result) {
  const list = provider === 'gemini' ? result?.models : (result?.data ?? result?.models);
  if (!Array.isArray(list)) throw new ModelDiscoveryError('modelsResponseInvalid');
  const models = new Map();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    if (provider === 'gemini' && (!Array.isArray(item.supportedGenerationMethods) || !item.supportedGenerationMethods.includes('generateContent'))) continue;
    const rawId = item.id || item.name || item.model;
    if (typeof rawId !== 'string') continue;
    const id = provider === 'gemini' ? rawId.replace(/^models\//, '') : rawId;
    if (!id.trim() || id.length > 200 || /[\r\n]/.test(id)) continue;
    const label = item.display_name || item.displayName || item.name || id;
    models.set(id, { id, name: typeof label === 'string' ? label.slice(0, 200) : id });
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export async function discoverModels(provider, apiKey, endpoint, { fetchImpl = fetch, signal = AbortSignal.timeout(30000) } = {}) {
  const request = modelListRequest(provider, apiKey, endpoint);
  const models = new Map();
  const seenCursors = new Set();
  let url = request.url;
  for (let page = 0; page < 20; page++) {
    let response;
    try {
      // Do not follow a redirect carrying credentials to an unexpected host.
      response = await fetchImpl(url, { method: 'GET', headers: { ...request.headers, Accept: 'application/json' }, signal, redirect: 'error' });
    } catch (error) {
      throw new ModelDiscoveryError(signal.aborted || error.name === 'TimeoutError' ? 'modelsTimeout' : 'modelsNetworkError');
    }
    if (!response.ok) {
      const code = [401, 403].includes(response.status) ? 'modelsAuthError' : response.status === 429 ? 'modelsRateLimit' : response.status === 404 ? 'modelsNotSupported' : 'modelsProviderError';
      throw new ModelDiscoveryError(code, response.status);
    }
    let result;
    try { result = await response.json(); }
    catch { throw new ModelDiscoveryError('modelsResponseInvalid'); }
    for (const model of normalizeModels(provider, result)) models.set(model.id, model);
    if (models.size > 2000) throw new ModelDiscoveryError('modelsTooMany');
    const cursor = provider === 'anthropic' && result.has_more ? result.last_id : provider === 'gemini' ? result.nextPageToken : null;
    if (!cursor) {
      if (provider === 'anthropic' && result.has_more) throw new ModelDiscoveryError('modelsResponseInvalid');
      return { models: [...models.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) };
    }
    if (typeof cursor !== 'string' || seenCursors.has(cursor)) throw new ModelDiscoveryError('modelsResponseInvalid');
    seenCursors.add(cursor);
    const next = new URL(request.url);
    next.searchParams.set(provider === 'anthropic' ? 'after_id' : 'pageToken', cursor);
    url = next.href;
  }
  throw new ModelDiscoveryError('modelsTooMany');
}
