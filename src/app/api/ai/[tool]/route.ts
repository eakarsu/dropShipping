import { NextResponse } from "next/server";
import { TOOLS_BY_SLUG } from "@/lib/ai-tools";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: Request, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  const def = TOOLS_BY_SLUG[tool];
  if (!def) return NextResponse.json({ error: `unknown tool: ${tool}` }, { status: 404 });

  const input = (await req.json()) as Record<string, string>;
  const missing = def.fields.filter((f) => f.required && !String(input[f.name] ?? "").trim());
  if (missing.length) {
    return NextResponse.json(
      { error: `missing required fields: ${missing.map((m) => m.name).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const res = await callOpenRouter({
      messages: def.buildMessages(input),
      tool: def.slug,
      input,
    });
    return NextResponse.json({
      ok: true,
      tool: def.slug,
      name: def.name,
      output: res.text,
      model: res.model,
      tokensUsed: res.tokensUsed,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
