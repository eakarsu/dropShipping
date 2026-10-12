import { getRequiredSession } from '@/lib/auth'
import { createAdvisoryHandlers } from '@/lib/native-advisory-runtime'
import { advisoryRepository } from '@/lib/native-advisory-repository'
const handlers = createAdvisoryHandlers({
  async authenticate() { const session = await getRequiredSession(); return { id: String(session.uid), scopeId: session.merchantId, role: session.role } },
  repository: advisoryRepository, maxPrompt: 8000,
  systemPrompt: 'Provide concise dropshipping operations advice with risks and auditable next actions.',
  reply: item => ({ content: item.content, provider: 'openrouter', model: item.model, persistedId: Number(item.id) }),
})
export const POST = handlers.POST
export const GET = handlers.GET
export const DELETE = handlers.DELETE
