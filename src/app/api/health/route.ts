import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try { await pool.query("SELECT 1"); return NextResponse.json({ status: "ready" }); }
  catch { return NextResponse.json({ status: "unavailable" }, { status: 503 }); }
}
