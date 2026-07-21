import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const session = await getRequiredSession(["customer"]);
    const result = await pool.query(
      `SELECT id,order_number,channel,total,currency,status,payment_status,fulfillment_status,refund_status,items_json,created_at,updated_at
       FROM orders WHERE merchant_id=$1 AND customer_id=$2 ORDER BY id DESC LIMIT 200`, [session.merchantId, session.customerId]);
    return NextResponse.json({ rows: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: error instanceof AuthError ? error.status : 500 });
  }
}
