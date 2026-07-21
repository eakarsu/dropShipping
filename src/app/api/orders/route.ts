import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";
import { createOrder, listOrders, OrderWorkflowError, type OrderItem } from "@/lib/orders/service";
import { ProviderError, quoteTax } from "@/lib/orders/providers";

function failure(error: unknown) {
  const status = error instanceof AuthError ? error.status : error instanceof OrderWorkflowError ? error.status : error instanceof ProviderError ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Order request failed" }, { status });
}

export async function GET() {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    return NextResponse.json({ rows: await listOrders(session.merchantId) });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const body = await request.json() as {
      orderNumber?: string; channel?: string; customerId?: number; items?: OrderItem[]; currency?: string; shippingAddress?: string; shippingTotal?: number;
    };
    const items = body.items ?? [];
    const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const tax = await quoteTax({ merchantId: session.merchantId, currency: body.currency ?? "USD", items,
      shippingAddress: String(body.shippingAddress ?? "").slice(0, 4_000) }, `tax:${idempotencyKey}`);
    if (!Number.isFinite(tax.data.taxTotal) || tax.data.taxTotal < 0) throw new ProviderError("tax", 502, "Tax provider returned an invalid amount");
    const order = await createOrder({ merchantId: session.merchantId, actorUserId: session.uid, idempotencyKey,
      orderNumber: String(body.orderNumber ?? ""), channel: String(body.channel ?? "manual").slice(0, 32), customerId: body.customerId,
      items, currency: String(body.currency ?? "USD").toUpperCase(), subtotal, taxTotal: tax.data.taxTotal,
      shippingTotal: Number(body.shippingTotal ?? 0), shippingAddress: String(body.shippingAddress ?? "").slice(0, 4_000) });
    return NextResponse.json({ order, tax: { provider: tax.provider, version: tax.version, requestId: tax.requestId, checksum: tax.checksum } }, { status: 201 });
  } catch (error) { return failure(error); }
}
