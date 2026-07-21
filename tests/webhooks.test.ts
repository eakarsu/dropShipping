import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapWebhookAction, verifyWebhookSignature, webhookPayloadHash } from "@/lib/orders/webhooks";

describe("provider webhooks", () => {
  const secret = "webhook-secret-with-more-than-32-characters";
  const body = JSON.stringify({ eventId: "evt-1" });
  it("uses constant-time HMAC verification", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, `sha256=${signature}`, secret)).toBe(true);
    expect(verifyWebhookSignature(`${body}x`, signature, secret)).toBe(false);
  });
  it("normalizes only allowlisted provider events", () => {
    expect(mapWebhookAction("payment", "payment.succeeded")).toBe("payment_succeeded");
    expect(mapWebhookAction("shipping", "shipment.delivered")).toBe("deliver");
    expect(() => mapWebhookAction("payment", "arbitrary.command")).toThrow();
  });
  it("hashes the exact raw payload", () => expect(webhookPayloadHash(body)).toHaveLength(64));
});
