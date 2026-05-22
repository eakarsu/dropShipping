import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const products = Array.isArray(body.products)
    ? body.products
    : [
        { sku: "LED-01", price: 39, cost: 18, shipping: 9, adSpend: 7 },
        { sku: "CASE-44", price: 24, cost: 11, shipping: 5, adSpend: 3 },
      ];
  const findings = products.map((item: any) => {
    const price = Number(item.price || 0);
    const landed = Number(item.cost || 0) + Number(item.shipping || 0) + Number(item.adSpend || 0);
    const margin = price ? ((price - landed) / price) * 100 : 0;
    return {
      sku: item.sku || "SKU",
      margin: Number(margin.toFixed(1)),
      leak: margin < 20 ? "ad/shipping leak" : margin < 35 ? "watchlist" : "healthy",
      action: margin < 20 ? "raise price or pause ads" : margin < 35 ? "renegotiate shipping tier" : "scale cautiously",
    };
  });
  return NextResponse.json({ findings, leakCount: findings.filter((f) => f.margin < 20).length });
}
