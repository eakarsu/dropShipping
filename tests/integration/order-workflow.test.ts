import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { createOrder, transitionOrder } from "@/lib/orders/service";
import { reconcileProvider } from "@/lib/orders/providers";
import { POST as webhookPost } from "@/app/api/webhooks/[provider]/route";

const merchantId = "merchant-test";
let actorUserId = 0;
let serial = 0;
process.env.ORDER_AUDIT_SIGNING_KEY = "integration-audit-signing-key-at-least-32-chars";
process.env.ORDER_AUDIT_KEY_ID = "test-key";
process.env.WEBHOOK_PAYMENT_SECRET = "integration-webhook-key-at-least-32-characters";

async function newOrder(qty: number, prefix: string) {
  serial += 1;
  return createOrder({ merchantId, actorUserId, idempotencyKey: `order:${prefix}:${serial}:unique`, orderNumber: `ORD-${prefix}-${serial}`,
    channel: "test", items: [{ sku: "SKU-1", title: "Product", qty, price: 10 }], currency: "USD",
    subtotal: qty * 10, taxTotal: 0, shippingTotal: 0, shippingAddress: "Test address" });
}

beforeAll(async () => {
  await pool.query(`TRUNCATE webhook_receipts,refunds,order_events,shipments,returns,orders,inventory,reviews,products,customers,suppliers,users RESTART IDENTITY CASCADE`);
  const user = await pool.query<{ id: number }>(`INSERT INTO users (merchant_id,email,password_hash,name,role) VALUES ($1,'operator@test.invalid','unused','Operator','operator') RETURNING id`, [merchantId]);
  actorUserId = user.rows[0].id;
  const product = await pool.query<{ id: number }>(`INSERT INTO products (merchant_id,sku,title,category) VALUES ($1,'SKU-1','Product','Test') RETURNING id`, [merchantId]);
  await pool.query(`INSERT INTO inventory (merchant_id,product_id,warehouse,on_hand,reserved) VALUES ($1,$2,'test',100,0)`, [merchantId, product.rows[0].id]);
});

afterAll(async () => { await pool.end(); });

describe("transactional order workflow", () => {
  it("deduplicates actions without reserving twice", async () => {
    const order = await newOrder(2, "duplicate");
    const first = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "reserve", idempotencyKey: "reserve:duplicate:one" });
    const second = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "reserve", idempotencyKey: "reserve:duplicate:one" });
    expect(first.duplicate).toBe(false); expect(second.duplicate).toBe(true);
    const stock = await pool.query<{ reserved: number }>(`SELECT reserved FROM inventory WHERE merchant_id=$1`, [merchantId]);
    expect(stock.rows[0].reserved).toBe(2);
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "cancel", idempotencyKey: "cancel:duplicate:one" });
  });

  it("prevents concurrent overselling", async () => {
    await pool.query(`UPDATE inventory SET on_hand=5,reserved=0 WHERE merchant_id=$1`, [merchantId]);
    const [one, two] = await Promise.all([newOrder(4, "oversell-a"), newOrder(4, "oversell-b")]);
    const results = await Promise.allSettled([
      transitionOrder({ merchantId, actorUserId, orderId: one.id, action: "reserve", idempotencyKey: "reserve:oversell:first" }),
      transitionOrder({ merchantId, actorUserId, orderId: two.id, action: "reserve", idempotencyKey: "reserve:oversell:second" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const stock = await pool.query<{ reserved: number }>(`SELECT reserved FROM inventory WHERE merchant_id=$1`, [merchantId]);
    expect(stock.rows[0].reserved).toBe(4);
    const winner = results[0].status === "fulfilled" ? one : two;
    await transitionOrder({ merchantId, actorUserId, orderId: winner.id, action: "cancel", idempotencyKey: "cancel:oversell:winner" });
    await pool.query(`UPDATE inventory SET on_hand=100,reserved=0 WHERE merchant_id=$1`, [merchantId]);
  });

  it("releases reservations after payment failure", async () => {
    const order = await newOrder(3, "payment-fail");
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "reserve", idempotencyKey: "reserve:payment:failed" });
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "begin_payment", idempotencyKey: "begin:payment:failed" });
    const failed = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "payment_failed", idempotencyKey: "result:payment:failed" });
    expect(failed.order.status).toBe("payment_failed");
    const stock = await pool.query<{ reserved: number }>(`SELECT reserved FROM inventory WHERE merchant_id=$1`, [merchantId]);
    expect(stock.rows[0].reserved).toBe(0);
  });

  it("supports partial fulfillment and completes inventory exactly", async () => {
    const order = await newOrder(3, "partial");
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "reserve", idempotencyKey: "reserve:partial:one" });
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "begin_payment", idempotencyKey: "begin:partial:one" });
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "payment_succeeded", idempotencyKey: "paid:partial:one" });
    const partial = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "fulfill", idempotencyKey: "fulfill:partial:one", details: { lines: [{ sku: "SKU-1", qty: 1 }] } });
    expect(partial.order.status).toBe("partially_fulfilled");
    const complete = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "fulfill", idempotencyKey: "fulfill:partial:two", details: { lines: [{ sku: "SKU-1", qty: 2 }] } });
    expect(complete.order.status).toBe("fulfilled");
    const stock = await pool.query<{ on_hand: number; reserved: number }>(`SELECT on_hand,reserved FROM inventory WHERE merchant_id=$1`, [merchantId]);
    expect(stock.rows[0]).toMatchObject({ on_hand: 97, reserved: 0 });
  });

  it("deduplicates signed payment webhooks", async () => {
    const order = await newOrder(1, "webhook");
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "reserve", idempotencyKey: "reserve:webhook:one" });
    await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "begin_payment", idempotencyKey: "begin:webhook:one" });
    const raw = JSON.stringify({ eventId: "evt_duplicate_1", merchantId, orderId: order.id, type: "payment.succeeded", details: { providerReference: "pay-1" } });
    const signature = createHmac("sha256", process.env.WEBHOOK_PAYMENT_SECRET!).update(raw).digest("hex");
    const request = () => new Request("http://localhost/api/webhooks/payment", { method: "POST", body: raw, headers: { "x-webhook-signature": signature } });
    const first = await webhookPost(request(), { params: Promise.resolve({ provider: "payment" }) });
    const second = await webhookPost(request(), { params: Promise.resolve({ provider: "payment" }) });
    expect(first.status).toBe(200); expect(await second.json()).toMatchObject({ ok: true, duplicate: true });
    const events = await pool.query(`SELECT id FROM order_events WHERE merchant_id=$1 AND idempotency_key=$2`, [merchantId, "webhook:payment:evt_duplicate_1"]);
    expect(events.rowCount).toBe(1);
  });

  it("records reconciliation mismatches as recoverable exceptions", async () => {
    let server: Server | undefined;
    await new Promise<void>((resolve) => {
      server = createServer((_request, response) => { response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ matches: false, differences: [{ field: "paymentStatus", internal: "paid", external: "pending" }] })); });
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server!.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind");
    process.env.PAYMENT_PROVIDER_URL = `http://127.0.0.1:${address.port}`;
    process.env.PAYMENT_PROVIDER_API_KEY = "test-provider-key";
    try {
      const order = await newOrder(1, "reconcile");
      const compared = await reconcileProvider("payment", { orderId: order.id }, "reconcile:test:one");
      expect(compared.data.matches).toBe(false);
      const flagged = await transitionOrder({ merchantId, actorUserId, orderId: order.id, action: "flag_exception", idempotencyKey: "reconcile:exception:one", details: { code: "RECONCILIATION_MISMATCH", differences: compared.data.differences } });
      expect(flagged.order.status).toBe("exception");
    } finally { await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); }
  });

  it("database blocks audit mutation", async () => {
    await expect(pool.query(`UPDATE order_events SET action='tampered' WHERE merchant_id=$1`, [merchantId])).rejects.toThrow(/append-only/);
  });
});
