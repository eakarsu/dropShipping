import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ds_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/webhooks/", "/api/health", "/_next", "/favicon.ico"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const value = process.env.JWT_SECRET;
    if (!value || value.length < 32) throw new Error("JWT secret unavailable");
    await jwtVerify(token, new TextEncoder().encode(value), {
      issuer: "dropship-manager",
      audience: "dropship-manager-web",
    });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
