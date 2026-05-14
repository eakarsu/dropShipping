// Custom feature (batch_09): Supplier reliability scoring with order-history data.
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
    const { supplier, order_history } = body || {};
    if (!supplier) return NextResponse.json({ error: "supplier required" }, { status: 400 });

    const res = await callOpenRouter({
      tool: "supplier-reliability",
      input: body,
      messages: [
        { role: "system", content: "You score supplier reliability from order history (on-time, defect, communication). JSON only." },
        { role: "user", content: `SUPPLIER: ${JSON.stringify(supplier)}\nHISTORY: ${JSON.stringify(order_history || []).slice(0, 4000)}\nReturn JSON {"reliability_score":0,"on_time_rate_pct":0,"defect_rate_pct":0,"response_time_score":0,"tier":"trusted|watch|risky","action":"continue|monitor|replace","backup_suppliers_recommended":[""]}` },
      ],
    });

    return NextResponse.json({ ok: true, tool: "supplier-reliability", output: parseJSON(res.text) || { raw: res.text }, model: res.model, tokens: res.tokensUsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
