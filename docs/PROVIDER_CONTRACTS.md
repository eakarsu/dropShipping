# Provider contracts

Every outbound adapter uses an HTTPS base URL in production, bearer authentication, a ten-second timeout, JSON, and an `Idempotency-Key` header. Responses record `X-Request-Id`, `X-Provider-Version`, and a SHA-256 payload checksum in the order event when operational state changes.

Required endpoints:

- Tax: `POST /v1/quotes` returns `{ taxTotal, jurisdiction }`.
- Payment: `POST /v1/payments` and `POST /v1/refunds` return `{ status, reference, failureReason? }`.
- Shipping: `POST /v1/shipments` returns `{ status, reference, trackingNumber? }`.
- Inventory: `POST /v1/reservations`, `POST /v1/reservations/release`, and `POST /v1/fulfillments` return a terminal inventory status plus `reference`.
- Payment, shipping, inventory, and partner: `POST /v1/reconcile` returns `{ matches, differences[] }`.

Inbound provider webhooks use the exact raw body and `X-Webhook-Signature: sha256=<hex HMAC>`. The normalized envelope is `{ eventId, merchantId, orderId, type, details }`. Event IDs are globally unique within a provider. Reuse with different content is rejected, completed duplicates return success without reapplying state, and failed receipts remain available for a same-payload retry.

Supported event types are allowlisted in `src/lib/orders/webhooks.ts`; unknown commands cannot invoke workflow actions. Secrets are provider-specific and must be rotated through the deployment secret store. During rotation, drain webhook delivery or coordinate a cutover with the provider because this release intentionally accepts only one active key per provider.
