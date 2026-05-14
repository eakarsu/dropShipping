import { NextResponse } from "next/server";
import { listAll, createOne, coerceValues, getFeature } from "@/lib/feature-db";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
  const rows = await listAll(slug);
  return NextResponse.json({ rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!getFeature(slug)) return NextResponse.json({ error: "unknown feature" }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const values = coerceValues(slug, body);
  try {
    const row = await createOne(slug, values);
    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
