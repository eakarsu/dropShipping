import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { OrderAction } from "./state-machine";

export type NormalizedWebhook = {
  eventId: string; merchantId: string; orderId: number; type: string; details?: Record<string, unknown>;
};

export function verifyWebhookSignature(raw: string, signature: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !signature) return false;
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
}

export function webhookPayloadHash(raw: string) { return createHash("sha256").update(raw).digest("hex"); }

export function mapWebhookAction(provider: string, type: string): OrderAction {
  const map: Record<string, OrderAction> = {
    "payment:payment.succeeded": "payment_succeeded",
    "payment:payment.failed": "payment_failed",
    "payment:refund.succeeded": "refund_succeeded",
    "payment:refund.failed": "refund_failed",
    "shipping:shipment.partially_fulfilled": "fulfill",
    "shipping:shipment.fulfilled": "fulfill",
    "shipping:shipment.delivered": "deliver",
    "inventory:inventory.exception": "flag_exception",
    "inventory:inventory.recovered": "recover",
    "partner:order.exception": "flag_exception",
    "partner:order.recovered": "recover",
  };
  const action = map[`${provider}:${type}`];
  if (!action) throw new Error("Unsupported webhook event type");
  return action;
}
