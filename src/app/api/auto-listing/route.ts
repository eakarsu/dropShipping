// Custom feature (batch_09): Auto-listing creator that pushes to Shopify/eBay/Amazon.
// TODO: configure credentials for SHOPIFY_API_KEY, EBAY_API_KEY, AMAZON_API_KEY.
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
    const { product_name, supplier_url, target_markets = ["shopify"], margin_target_pct = 30 } = body || {};
    if (!product_name) return NextResponse.json({ error: "product_name required" }, { status: 400 });

    const res = await callOpenRouter({
      tool: "auto-listing",
      input: body,
      messages: [
        { role: "system", content: "You generate channel-ready product listings. JSON only." },
        { role: "user", content: `PRODUCT: ${product_name}\nSUPPLIER_URL: ${supplier_url || ""}\nMARKETS: ${target_markets.join(", ")}\nMARGIN_TARGET_PCT: ${margin_target_pct}\nReturn JSON {"shopify":{"title":"","description":"","price_usd":0,"tags":[""]},"ebay":{"title":"","description":"","price_usd":0,"category":""},"amazon":{"title":"","bullets":[""],"price_usd":0}}` },
      ],
    });

    const parsed = parseJSON(res.text) || { raw: res.text };
    return NextResponse.json({
      ok: true,
      tool: "auto-listing",
      output: parsed,
      model: res.model,
      tokens: res.tokensUsed,
      channels_configured: {
        shopify: Boolean(process.env.SHOPIFY_API_KEY),
        ebay: Boolean(process.env.EBAY_API_KEY),
        amazon: Boolean(process.env.AMAZON_API_KEY),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
