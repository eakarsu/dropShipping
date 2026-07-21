import { createHash } from "node:crypto";

export type ProviderName = "tax" | "payment" | "shipping" | "inventory" | "partner";
export type ProviderResponse<T> = { provider: ProviderName; version: string; requestId: string; checksum: string; data: T };

const CONFIG: Record<ProviderName, { url: string; key: string }> = {
  tax: { url: "TAX_PROVIDER_URL", key: "TAX_PROVIDER_API_KEY" },
  payment: { url: "PAYMENT_PROVIDER_URL", key: "PAYMENT_PROVIDER_API_KEY" },
  shipping: { url: "SHIPPING_PROVIDER_URL", key: "SHIPPING_PROVIDER_API_KEY" },
  inventory: { url: "INVENTORY_PROVIDER_URL", key: "INVENTORY_PROVIDER_API_KEY" },
  partner: { url: "PARTNER_PROVIDER_URL", key: "PARTNER_PROVIDER_API_KEY" },
};

export class ProviderError extends Error {
  constructor(public readonly provider: ProviderName, public readonly status: number, message: string) { super(message); }
}

export async function callProvider<T>(provider: ProviderName, operation: string, payload: Record<string, unknown>, idempotencyKey: string): Promise<ProviderResponse<T>> {
  const baseUrl = process.env[CONFIG[provider].url];
  const apiKey = process.env[CONFIG[provider].key];
  if (!baseUrl || !apiKey) throw new ProviderError(provider, 503, `${provider} provider is not configured`);
  const parsed = new URL(baseUrl);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new ProviderError(provider, 503, `${provider} provider must use HTTPS`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(new URL(operation.replace(/^\//, ""), `${parsed.toString().replace(/\/$/, "")}/`), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "idempotency-key": idempotencyKey, accept: "application/json" },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new ProviderError(provider, response.status, `${provider} rejected ${operation}`);
    if (raw.length > 1_000_000) throw new ProviderError(provider, 502, `${provider} response was too large`);
    const data = JSON.parse(raw) as T;
    const requestId = response.headers.get("x-request-id") ?? "unavailable";
    return { provider, version: response.headers.get("x-provider-version") ?? "unspecified", requestId,
      checksum: createHash("sha256").update(raw).digest("hex"), data };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(provider, 502, error instanceof Error && error.name === "AbortError" ? `${provider} timed out` : `${provider} request failed`);
  } finally { clearTimeout(timeout); }
}

export function quoteTax(payload: Record<string, unknown>, key: string) {
  return callProvider<{ taxTotal: number; jurisdiction: string }>("tax", "/v1/quotes", payload, key);
}
export function beginPayment(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "pending" | "succeeded" | "failed"; reference: string; failureReason?: string }>("payment", "/v1/payments", payload, key);
}
export function requestRefund(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "pending" | "succeeded" | "failed"; reference: string; failureReason?: string }>("payment", "/v1/refunds", payload, key);
}
export function createShipment(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "accepted" | "rejected"; trackingNumber?: string; reference: string }>("shipping", "/v1/shipments", payload, key);
}
export function reserveProviderInventory(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "reserved"; reference: string }>("inventory", "/v1/reservations", payload, key);
}
export function releaseProviderInventory(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "released"; reference: string }>("inventory", "/v1/reservations/release", payload, key);
}
export function commitProviderInventory(payload: Record<string, unknown>, key: string) {
  return callProvider<{ status: "committed"; reference: string }>("inventory", "/v1/fulfillments", payload, key);
}
export function reconcileProvider(provider: ProviderName, payload: Record<string, unknown>, key: string) {
  return callProvider<{ matches: boolean; differences: Array<{ field: string; internal: unknown; external: unknown }> }>(provider, "/v1/reconcile", payload, key);
}
