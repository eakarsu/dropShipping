import { NextResponse } from 'next/server';
import { getRequiredSession, AuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiRuns } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const { prompt } = await request.json().catch(() => ({ prompt: '' })) as { prompt?: string };
    const input = String(prompt || '').trim();
    if (!input) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    const apiKey = process.env.OPENROUTER_API_KEY, baseUrl = process.env.OPENROUTER_BASE_URL, model = process.env.OPENROUTER_MODEL;
    if (!apiKey || !baseUrl || !model) throw new Error('OpenRouter is not configured');
    const providerResponse = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Provide concise dropshipping operations advice with risks and auditable next actions.' }, { role: 'user', content: input }], temperature: 0.2 }),
    });
    if (!providerResponse.ok) throw new Error('OpenRouter returned ' + providerResponse.status);
    const payload = await providerResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenRouter returned empty content');
    const [stored] = await db.insert(aiRuns).values({ merchantId: session.merchantId, tool: 'runtime-dropship-advice', inputJson: { prompt: input, userId: session.uid }, outputText: content, model, status: 'ok' }).returning({ id: aiRuns.id });
    return NextResponse.json({ content, provider: 'openrouter', model, persistedId: stored.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
