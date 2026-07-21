import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";
import { getOrderHistory } from "@/lib/orders/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    return NextResponse.json({ events: await getOrderHistory(session.merchantId, id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "History request failed" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
