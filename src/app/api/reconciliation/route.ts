import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { ProviderError, reconcileProvider, type ProviderName } from "@/lib/orders/providers";
import { transitionOrder } from "@/lib/orders/service";

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession(["merchant_admin"]);
    const body = await request.json() as { orderId?: number; provider?: ProviderName };
    if (!Number.isInteger(body.orderId) || !body.provider || !["payment", "shipping", "inventory", "partner"].includes(body.provider)) {
      return NextResponse.json({ error: "Valid orderId and provider are required" }, { status: 400 });
    }
    const selected = await pool.query(`SELECT id,status,payment_status,fulfillment_status,refund_status,total,row_version FROM orders WHERE id=$1 AND merchant_id=$2`, [body.orderId, session.merchantId]);
    if (!selected.rows[0]) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const key = `reconcile:${body.provider}:${body.orderId}:${selected.rows[0].row_version}`;
    const result = await reconcileProvider(body.provider, { merchantId: session.merchantId, order: selected.rows[0] }, key);
    if (!result.data.matches) await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId: body.orderId!,
      action: "flag_exception", idempotencyKey: `${key}:exception`, details: { code: "RECONCILIATION_MISMATCH", differences: result.data.differences, providerChecksum: result.checksum } });
    return NextResponse.json({ matches: result.data.matches, differences: result.data.differences, provider: { requestId: result.requestId, checksum: result.checksum } });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : error instanceof ProviderError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reconciliation failed" }, { status });
  }
}
