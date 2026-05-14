// Custom feature (batch_09): Predictive winners detection from social trend signals.
// TODO: configure credentials for TIKTOK_TREND_API_KEY, INSTAGRAM_GRAPH_API_KEY for live signals.
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
    const { social_signals = [], niche, time_window_days = 7 } = body || {};

    const res = await callOpenRouter({
      tool: "trend-winners",
      input: body,
      messages: [
        { role: "system", content: "You spot predictive winners for dropship from social trend signals. JSON only." },
        { role: "user", content: `NICHE: ${niche || "general"}\nWINDOW_DAYS: ${time_window_days}\nSIGNALS: ${JSON.stringify(social_signals).slice(0, 4000)}\nTikTok feed configured: ${Boolean(process.env.TIKTOK_TREND_API_KEY)}\nInstagram feed configured: ${Boolean(process.env.INSTAGRAM_GRAPH_API_KEY)}\nReturn JSON {"predicted_winners":[{"product":"","velocity_score":0,"why":"","suggested_price_usd":0,"estimated_winners_window_days":0}],"emerging_themes":[""],"avoid":[""]}` },
      ],
    });

    return NextResponse.json({ ok: true, tool: "trend-winners", output: parseJSON(res.text) || { raw: res.text }, model: res.model, tokens: res.tokensUsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
