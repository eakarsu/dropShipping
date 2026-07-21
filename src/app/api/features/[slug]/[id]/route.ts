import { NextResponse } from "next/server";
import { getOne, updateOne, deleteOne, coerceValues, getFeature } from "@/lib/feature-db";
import { AuthError, getRequiredSession } from "@/lib/auth";

function denied(error: unknown) {
  const status = error instanceof AuthError ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status });
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const { slug, id } = await ctx.params;
    if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
    const row = await getOne(slug, Number(id), session.merchantId);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (error) { return denied(error); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const { slug, id } = await ctx.params;
    if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
    if (["orders", "returns", "shipments"].includes(slug)) return NextResponse.json({ error: "Use the governed order workflow API" }, { status: 409 });
    const body = (await req.json()) as Record<string, unknown>;
    const values = coerceValues(slug, body);
    const row = await updateOne(slug, Number(id), values, session.merchantId);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (error) { return denied(error); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const session = await getRequiredSession(["merchant_admin"]);
    const { slug, id } = await ctx.params;
    if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
    if (["orders", "returns", "shipments"].includes(slug)) return NextResponse.json({ error: "Operational records are immutable" }, { status: 409 });
    const deleted = await deleteOne(slug, Number(id), session.merchantId);
    return NextResponse.json({ ok: deleted }, { status: deleted ? 200 : 404 });
  } catch (error) { return denied(error); }
}
