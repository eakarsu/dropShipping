import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getRequiredSession();
    return NextResponse.json({
      user: {
        email: session.email,
        name: session.name,
        role: session.role,
        merchantId: session.merchantId,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
