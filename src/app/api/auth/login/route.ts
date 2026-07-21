import { NextResponse } from "next/server";
import { authenticate, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }
  const session = await authenticate(email.trim().toLowerCase(), password);
  if (!session) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signSession(session);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: { email: session.email, name: session.name, role: session.role } });
}
