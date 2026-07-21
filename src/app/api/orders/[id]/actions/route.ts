import { NextResponse } from "next/server";
import { AuthError, getRequiredSession } from "@/lib/auth";
import { beginPayment, commitProviderInventory, createShipment, ProviderError, releaseProviderInventory, requestRefund, reserveProviderInventory } from "@/lib/orders/providers";
import { getOrder, OrderWorkflowError, transitionOrder } from "@/lib/orders/service";
import type { OrderAction } from "@/lib/orders/state-machine";

function failure(error: unknown) {
  const status = error instanceof AuthError ? error.status : error instanceof OrderWorkflowError ? error.status : error instanceof ProviderError ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Workflow request failed" }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession(["operator", "merchant_admin"]);
    const orderId = Number((await context.params).id);
    if (!Number.isInteger(orderId) || orderId <= 0) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const body = await request.json() as { action?: OrderAction; details?: Record<string, unknown> };
    if (!body.action) return NextResponse.json({ error: "Action is required" }, { status: 400 });
    const operatorActions: OrderAction[] = ["reserve", "begin_payment", "fulfill", "cancel", "request_refund", "flag_exception", "recover"];
    if (!operatorActions.includes(body.action)) return NextResponse.json({ error: "This transition requires a signed provider result" }, { status: 403 });
    if (body.action === "recover" && session.role !== "merchant_admin") return NextResponse.json({ error: "Only merchant administrators can recover exceptions" }, { status: 403 });

    if (body.action === "reserve") {
      const order = await getOrder(session.merchantId, orderId);
      const provider = await reserveProviderInventory({ merchantId: session.merchantId, orderId, lines: order.items_json }, idempotencyKey);
      try {
        return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
          action: "reserve", idempotencyKey, details: { providerReference: provider.data.reference, checksum: provider.checksum } }));
      } catch (error) {
        await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId, action: "flag_exception",
          idempotencyKey: `${idempotencyKey}:exception`, details: { code: "INVENTORY_RESERVATION_SAGA_FAILURE", providerReference: provider.data.reference } }).catch(() => undefined);
        throw error;
      }
    }

    if (body.action === "cancel") {
      const provider = await releaseProviderInventory({ merchantId: session.merchantId, orderId }, idempotencyKey);
      return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
        action: "cancel", idempotencyKey, details: { providerReference: provider.data.reference, checksum: provider.checksum } }));
    }

    if (body.action === "begin_payment") {
      const pending = await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId, action: "begin_payment", idempotencyKey: `${idempotencyKey}:begin`, details: {} });
      if (pending.duplicate) return NextResponse.json(pending);
      try {
        const provider = await beginPayment({ merchantId: session.merchantId, orderId, amount: pending.order.total }, idempotencyKey);
        if (provider.data.status === "succeeded" || provider.data.status === "failed") {
          let inventoryRelease: { reference: string; checksum: string } | undefined;
          if (provider.data.status === "failed") {
            const released = await releaseProviderInventory({ merchantId: session.merchantId, orderId }, `${idempotencyKey}:release`);
            inventoryRelease = { reference: released.data.reference, checksum: released.checksum };
          }
          return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
            action: provider.data.status === "succeeded" ? "payment_succeeded" : "payment_failed", idempotencyKey: `${idempotencyKey}:result`,
            details: { providerReference: provider.data.reference, reason: provider.data.failureReason, checksum: provider.checksum, inventoryRelease } }));
        }
        return NextResponse.json({ ...pending, provider: { status: "pending", reference: provider.data.reference, checksum: provider.checksum } });
      } catch (error) {
        await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId, action: "flag_exception",
          idempotencyKey: `${idempotencyKey}:exception`, details: { code: "PAYMENT_PROVIDER_FAILURE" } }).catch(() => undefined);
        throw error;
      }
    }

    if (body.action === "fulfill") {
      const provider = await createShipment({ merchantId: session.merchantId, orderId, lines: body.details?.lines }, idempotencyKey);
      if (provider.data.status !== "accepted") throw new ProviderError("shipping", 409, "Shipment was rejected");
      try {
        const inventory = await commitProviderInventory({ merchantId: session.merchantId, orderId, lines: body.details?.lines }, `${idempotencyKey}:inventory`);
        return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
          action: "fulfill", idempotencyKey, details: { ...body.details, providerReference: provider.data.reference,
            trackingNumber: provider.data.trackingNumber, checksum: provider.checksum, inventoryReference: inventory.data.reference,
            inventoryChecksum: inventory.checksum } }));
      } catch (error) {
        await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId, action: "flag_exception",
          idempotencyKey: `${idempotencyKey}:exception`, details: { code: "SHIPMENT_INVENTORY_SAGA_FAILURE", providerReference: provider.data.reference } }).catch(() => undefined);
        throw error;
      }
    }

    if (body.action === "request_refund") {
      const requested = await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
        action: "request_refund", idempotencyKey: `${idempotencyKey}:request`, details: body.details });
      if (requested.duplicate) return NextResponse.json(requested);
      let provider;
      try { provider = await requestRefund({ merchantId: session.merchantId, orderId, amount: body.details?.amount }, idempotencyKey); }
      catch (error) {
        await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId, action: "flag_exception",
          idempotencyKey: `${idempotencyKey}:exception`, details: { code: "REFUND_PROVIDER_FAILURE" } }).catch(() => undefined);
        throw error;
      }
      if (provider.data.status === "succeeded" || provider.data.status === "failed") {
        return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
          action: provider.data.status === "succeeded" ? "refund_succeeded" : "refund_failed", idempotencyKey: `${idempotencyKey}:result`,
          details: { providerReference: provider.data.reference, reason: provider.data.failureReason, checksum: provider.checksum } }));
      }
      return NextResponse.json(requested);
    }

    return NextResponse.json(await transitionOrder({ merchantId: session.merchantId, actorUserId: session.uid, orderId,
      action: body.action, idempotencyKey, details: body.details }));
  } catch (error) { return failure(error); }
}
