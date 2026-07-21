import { NextResponse } from "next/server";
import { listAll, createOne, coerceValues, getFeature } from "@/lib/feature-db";
import { AuthError, getRequiredSession } from "@/lib/auth";

function denied(error: unknown) {
  const status = error instanceof AuthError ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status });
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const { slug } = await ctx.params;
    if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
    const rows = await listAll(slug, session.merchantId);
    return NextResponse.json({ rows });
  } catch (error) { return denied(error); }
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const { slug } = await ctx.params;
    if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
    if (slug === "orders" || slug === "returns" || slug === "shipments") {
      return NextResponse.json({ error: "Use the governed order workflow API" }, { status: 409 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const values = coerceValues(slug, body);
    const row = await createOne(slug, values, session.merchantId);
    return NextResponse.json({ row });
  } catch (error) { return denied(error); }
}
