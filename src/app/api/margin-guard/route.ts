// Custom feature (batch_09): AI margin guard — flags products with declining margins.
import { NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

function parseJSON(t: string) {
  if (!t) return null;
  const c = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { products, threshold_pct = 15 } = body || {};
    if (!Array.isArray(products)) return NextResponse.json({ error: "products array required" }, { status: 400 });

    const res = await callOpenRouter({
      tool: "margin-guard",
      input: body,
      messages: [
        { role: "system", content: "You analyze a dropship catalog for declining margins and propose actions. JSON only." },
        { role: "user", content: `PRODUCTS: ${JSON.stringify(products.slice(0, 80))}\nTHRESHOLD_PCT: ${threshold_pct}\nReturn JSON {"flagged":[{"sku":"","current_margin_pct":0,"trend":"down","drop_pct":0,"action":"reprice|drop|negotiate"}],"healthy_count":0,"narrative":""}` },
      ],
    });

    return NextResponse.json({ ok: true, tool: "margin-guard", output: parseJSON(res.text) || { raw: res.text }, model: res.model, tokens: res.tokensUsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
