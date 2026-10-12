export type AdvisoryActor = { id: string; scopeId?: string; role?: string }
export type ProviderReceipt = { id: string; created: number | null; upstreamModel: string; upstreamProvider?: string }
export type SavedAdvisory = { id: string; prompt: string; content: string; model: string; createdAt: string; canDelete: boolean; providerReceipt?: ProviderReceipt }
export type AdvisoryRepository = {
  list(actor: AdvisoryActor): Promise<SavedAdvisory[]>
  save(actor: AdvisoryActor, input: { prompt: string; content: string; model: string; providerReceipt: ProviderReceipt; durationMs: number }, signal: AbortSignal): Promise<SavedAdvisory>
  remove?(actor: AdvisoryActor, id: string, signal: AbortSignal): Promise<boolean>
}
export function advisoryScope(request: Request, timeoutMs: number) {
  const controller = new AbortController()
  const abort = () => controller.abort(Object.assign(new Error('AI request cancelled'), { status: 499 }))
  request.signal.addEventListener('abort', abort, { once: true }); if (request.signal.aborted) abort()
  const timer = setTimeout(() => controller.abort(Object.assign(new Error('AI request timed out'), { status: 504 })), timeoutMs); timer.unref?.()
  return { signal: controller.signal, check() { controller.signal.throwIfAborted() }, dispose() { clearTimeout(timer); request.signal.removeEventListener('abort', abort) } }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const fail = (message: string, status: number) => Object.assign(new Error(message), { status })
type Configuration = { authenticate: () => Promise<AdvisoryActor | null>; repository: AdvisoryRepository; systemPrompt: string; maxPrompt: number; maxTokens?: number; requireReceipt?: boolean; receiptHeaderFallback?: boolean; exactBaseUrl?: string; timeoutMs?: number; environment?: () => { apiKey?: string; model?: string; baseUrl?: string }; fetchImpl?: typeof fetch; reply?: (item: SavedAdvisory) => Record<string, unknown> }
export function createAdvisoryHandlers(config: Configuration) {
  const execute = (action: 'POST' | 'GET' | 'DELETE') => async (request: Request) => {
    const scope = advisoryScope(request, config.timeoutMs ?? 60_000), started = Date.now()
    try {
      scope.check(); const actor = await config.authenticate(); scope.check()
      if (!actor?.id) throw fail('Authentication required', 401)
      if (action === 'GET') { const items = await config.repository.list(actor); scope.check(); return json({ items }) }
      const body = await request.json().catch(() => null)
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('A JSON request body is required', 400)
      if (action === 'DELETE') {
        if (!config.repository.remove) throw fail('Provider and approval evidence is retained', 405)
        if (typeof body.id !== 'string' || !body.id.trim() || body.id.length > 128) throw fail('An existing report ID is required', 400)
        scope.check(); const deleted = await config.repository.remove(actor, body.id, scope.signal); scope.check()
        if (!deleted) throw fail('Report not found in your history', 404)
        return json({ deleted: true })
      }
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
      if (!prompt || prompt.length > config.maxPrompt) throw fail(`Prompt must contain 1-${config.maxPrompt} characters`, 400)
      const environment = config.environment?.() ?? { apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL, baseUrl: process.env.OPENROUTER_BASE_URL }
      const apiKey = environment.apiKey?.trim(), model = environment.model?.trim(), baseUrl = environment.baseUrl?.replace(/\/+$/, '')
      if (!apiKey || !model || !baseUrl || (config.exactBaseUrl && baseUrl !== config.exactBaseUrl)) throw fail(config.exactBaseUrl ? 'Exact OpenRouter configuration is required' : 'OpenRouter runtime is not configured', 503)
      scope.check()
      const response = await (config.fetchImpl ?? fetch)(`${baseUrl}/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.2, ...(config.maxTokens ? { max_tokens: config.maxTokens } : {}), messages: [{ role: 'system', content: config.systemPrompt }, { role: 'user', content: prompt }] }), signal: scope.signal, cache: 'no-store',
      })
      scope.check()
      if (!response.ok) throw fail(`OpenRouter request failed with HTTP ${response.status}`, 502)
      const payload = await response.json().catch(() => null); scope.check()
      const choice = payload?.choices?.[0], content = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : ''
      if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw fail('OpenRouter could not provide this advisory', 502)
      if (choice?.finish_reason === 'length') throw fail('OpenRouter returned an incomplete advisory', 502)
      const providerReceipt = { id: typeof payload?.id === 'string' ? payload.id.trim() : config.receiptHeaderFallback ? response.headers.get('x-request-id') || '' : '', created: typeof payload?.created === 'number' ? payload.created : null, upstreamModel: typeof payload?.model === 'string' ? payload.model : model, ...(typeof payload?.provider === 'string' ? { upstreamProvider: payload.provider } : {}) }
      if (!content || (config.requireReceipt && !providerReceipt.id)) throw fail('OpenRouter returned an empty or incomplete advisory', 502)
      const current = await config.authenticate(); scope.check()
      if (!current || current.id !== actor.id || current.scopeId !== actor.scopeId || current.role !== actor.role) throw fail('The authenticated account changed during generation', 401)
      const item = await config.repository.save(actor, { prompt, content, model: providerReceipt.upstreamModel, providerReceipt, durationMs: Date.now() - started }, scope.signal); scope.check()
      return json({ ...config.reply?.(item), item })
    } catch (error) {
      const reason = scope.signal.aborted ? scope.signal.reason : error
      const status = typeof reason === 'object' && reason && 'status' in reason ? Number(reason.status) : 500
      return json({ error: reason instanceof Error && status >= 400 && status < 600 ? reason.message : 'AI request failed; no report was saved' }, Number.isInteger(status) && status >= 400 && status < 600 ? status : 500)
    } finally { scope.dispose() }
  }
  return { POST: execute('POST'), GET: execute('GET'), DELETE: execute('DELETE') }
}
