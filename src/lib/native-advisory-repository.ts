import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aiRuns } from '@/lib/db/schema'
import type { AiRun } from '@/lib/db/schema'
import type { AdvisoryActor, AdvisoryRepository, SavedAdvisory } from './native-advisory-runtime'
const saved = (row: AiRun): SavedAdvisory => ({ id: String(row.id), prompt: typeof row.inputJson.prompt === 'string' ? row.inputJson.prompt : '', content: row.outputText, model: row.model, createdAt: row.createdAt.toISOString(), canDelete: true })
const owner = (actor: AdvisoryActor) => and(eq(aiRuns.merchantId, actor.scopeId!), eq(aiRuns.tool, 'runtime-dropship-advice'), sql`${aiRuns.inputJson}->>'userId' = ${actor.id}`)
export const advisoryRepository: AdvisoryRepository = {
  async list(actor) { return (await db.select().from(aiRuns).where(owner(actor)).orderBy(sql`${aiRuns.createdAt} DESC`).limit(50)).map(saved) },
  async save(actor, input, signal) { return db.transaction(async tx => { signal.throwIfAborted(); const [row] = await tx.insert(aiRuns).values({ merchantId: actor.scopeId!, tool: 'runtime-dropship-advice', inputJson: { prompt: input.prompt, userId: Number(actor.id) }, outputText: input.content, model: input.model, status: 'ok' }).returning(); signal.throwIfAborted(); return { ...saved(row), providerReceipt: input.providerReceipt } }) },
  async remove(actor, id, signal) { const numericId = Number(id); if (!Number.isSafeInteger(numericId) || numericId < 1 || String(numericId) !== id) return false; return db.transaction(async tx => { signal.throwIfAborted(); const removed = await tx.delete(aiRuns).where(and(owner(actor), eq(aiRuns.id, numericId))).returning({ id: aiRuns.id }); signal.throwIfAborted(); return removed.length === 1 }) },
}
