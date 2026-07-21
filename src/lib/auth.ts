import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

const COOKIE = "ds_session";
const ISSUER = "dropship-manager";
const AUDIENCE = "dropship-manager-web";
const ALLOWED_ROLES = ["customer", "operator", "merchant_admin"] as const;
export type AppRole = (typeof ALLOWED_ROLES)[number];

export type SessionPayload = {
  uid: number;
  email: string;
  name: string;
  merchantId: string;
  role: AppRole;
  customerId?: number;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE });
    const candidate = payload as unknown as SessionPayload;
    if (!candidate.uid || !candidate.merchantId || !ALLOWED_ROLES.includes(candidate.role)) return null;
    return candidate;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getRequiredSession(roles?: readonly AppRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Authentication required", 401);
  const [current] = await db.select({ id: users.id, merchantId: users.merchantId, role: users.role, active: users.active, customerId: users.customerId })
    .from(users).where(and(eq(users.id, session.uid), eq(users.merchantId, session.merchantId), eq(users.active, true))).limit(1);
  if (!current || current.role !== session.role || current.customerId !== (session.customerId ?? null)) throw new AuthError("Session has been revoked", 401);
  if (roles && !roles.includes(session.role)) throw new AuthError("Insufficient permission", 403);
  return session;
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function authenticate(email: string, password: string) {
  const [u] = await db.select().from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.active, true))).limit(1);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return null;
  if (!ALLOWED_ROLES.includes(u.role as AppRole) || u.merchantId === "legacy-quarantine") return null;
  if (u.role === "customer" && !u.customerId) return null;
  return { uid: u.id, email: u.email, name: u.name, merchantId: u.merchantId, role: u.role as AppRole,
    customerId: u.customerId ?? undefined } satisfies SessionPayload;
}

export const SESSION_COOKIE_NAME = COOKIE;
