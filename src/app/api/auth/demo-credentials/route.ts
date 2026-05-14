import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    email: process.env.DEMO_EMAIL ?? "demo@dropship.local",
    password: process.env.DEMO_PASSWORD ?? "demo1234",
  });
}
