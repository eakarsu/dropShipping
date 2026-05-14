import { NextResponse } from "next/server";
import { getOne, updateOne, deleteOne, coerceValues, getFeature } from "@/lib/feature-db";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await ctx.params;
  if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
  const row = await getOne(slug, Number(id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await ctx.params;
  if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const values = coerceValues(slug, body);
  try {
    const row = await updateOne(slug, Number(id), values);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await ctx.params;
  if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
  await deleteOne(slug, Number(id));
  return NextResponse.json({ ok: true });
}
