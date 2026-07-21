import { createHash, createHmac } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { nextOrderState, type OrderAction, type OrderState } from "./state-machine";

export type OrderItem = { sku: string; title: string; qty: number; price: number; fulfilledQty?: number };
export type OrderRecord = {
  id: number; merchant_id: string; order_number: string; idempotency_key: string;
  status: OrderState; payment_status: string; fulfillment_status: string; refund_status: string;
  items_json: OrderItem[]; total: string; row_version: number; exception_code: string | null;
};

export class OrderWorkflowError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 409) { super(message); }
}

function auditKey() {
  const key = process.env.ORDER_AUDIT_SIGNING_KEY;
  if (!key || key.length < 32) throw new OrderWorkflowError("ORDER_AUDIT_SIGNING_KEY must contain at least 32 characters", "AUDIT_KEY_MISSING", 503);
  return key;
}

function validItems(value: unknown): value is OrderItem[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && value.every((item) => {
    const row = item as OrderItem;
    return typeof row.sku === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(row.sku) &&
      typeof row.title === "string" && row.title.length <= 300 && Number.isInteger(row.qty) && row.qty > 0 && row.qty <= 10_000 &&
      Number.isFinite(row.price) && row.price >= 0;
  });
}

async function appendEvent(client: PoolClient, args: {
  merchantId: string; orderId: number; actorUserId?: number; action: string; fromState: string;
  toState: string; idempotencyKey: string; details?: Record<string, unknown>;
}) {
  const previous = await client.query<{ event_hash: string }>(
    `SELECT event_hash FROM order_events WHERE merchant_id = $1 AND order_id = $2 ORDER BY id DESC LIMIT 1`,
    [args.merchantId, args.orderId],
  );
  const previousHash = previous.rows[0]?.event_hash ?? null;
  const details = args.details ?? {};
  const material = JSON.stringify({ ...args, details, previousHash });
  const eventHash = createHash("sha256").update(material).digest("hex");
  const signature = createHmac("sha256", auditKey()).update(eventHash).digest("hex");
  await client.query(
    `INSERT INTO order_events
      (merchant_id, order_id, actor_user_id, action, from_state, to_state, idempotency_key, details, previous_hash, event_hash, signature, signing_key_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [args.merchantId, args.orderId, args.actorUserId ?? null, args.action, args.fromState, args.toState,
      args.idempotencyKey, JSON.stringify(details), previousHash, eventHash, signature, process.env.ORDER_AUDIT_KEY_ID ?? "primary"],
  );
}

async function rollback(client: PoolClient) { await client.query("ROLLBACK").catch(() => undefined); }

export async function createOrder(input: {
  merchantId: string; actorUserId: number; idempotencyKey: string; orderNumber: string; channel: string;
  customerId?: number; items: OrderItem[]; currency: string; subtotal: number; taxTotal: number;
  shippingTotal: number; shippingAddress: string;
}): Promise<OrderRecord> {
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(input.idempotencyKey)) throw new OrderWorkflowError("Invalid idempotency key", "INVALID_IDEMPOTENCY", 400);
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(input.orderNumber) || !validItems(input.items)) throw new OrderWorkflowError("Invalid order data", "INVALID_ORDER", 400);
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new OrderWorkflowError("Invalid currency", "INVALID_CURRENCY", 400);
  const expectedSubtotal = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  if (Math.abs(expectedSubtotal - input.subtotal) > 0.005 || [input.subtotal, input.taxTotal, input.shippingTotal].some((n) => !Number.isFinite(n) || n < 0)) {
    throw new OrderWorkflowError("Order totals do not reconcile", "TOTAL_MISMATCH", 400);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const existing = await client.query<OrderRecord>(`SELECT * FROM orders WHERE merchant_id=$1 AND idempotency_key=$2`, [input.merchantId, input.idempotencyKey]);
    if (existing.rows[0]) { await client.query("COMMIT"); return existing.rows[0]; }
    const total = input.subtotal + input.taxTotal + input.shippingTotal;
    const inserted = await client.query<OrderRecord>(
      `INSERT INTO orders
       (merchant_id, order_number, idempotency_key, channel, customer_id, total, status, currency, subtotal, tax_total, shipping_total, items_json, shipping_address)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10,$11,$12) RETURNING *`,
      [input.merchantId, input.orderNumber, input.idempotencyKey, input.channel, input.customerId ?? null, total.toFixed(2),
        input.currency, input.subtotal.toFixed(2), input.taxTotal.toFixed(2), input.shippingTotal.toFixed(2), JSON.stringify(input.items), input.shippingAddress],
    );
    const order = inserted.rows[0];
    await appendEvent(client, { merchantId: input.merchantId, orderId: order.id, actorUserId: input.actorUserId,
      action: "created", fromState: "draft", toState: "draft", idempotencyKey: `create:${input.idempotencyKey}`,
      details: { orderNumber: input.orderNumber, total: total.toFixed(2), currency: input.currency } });
    await client.query("COMMIT");
    return order;
  } catch (error) { await rollback(client); throw error; } finally { client.release(); }
}

async function reserveInventory(client: PoolClient, order: OrderRecord) {
  for (const item of order.items_json) {
    const found = await client.query<{ id: number; on_hand: number; reserved: number }>(
      `SELECT i.id, i.on_hand, i.reserved FROM products p JOIN inventory i ON i.product_id=p.id AND i.merchant_id=p.merchant_id
       WHERE p.merchant_id=$1 AND p.sku=$2 ORDER BY i.id LIMIT 1 FOR UPDATE OF i`, [order.merchant_id, item.sku]);
    const stock = found.rows[0];
    if (!stock || stock.on_hand - stock.reserved < item.qty) throw new OrderWorkflowError(`Insufficient inventory for ${item.sku}`, "OVERSELL_PREVENTED");
    await client.query(`UPDATE inventory SET reserved=reserved+$1 WHERE id=$2 AND merchant_id=$3`, [item.qty, stock.id, order.merchant_id]);
  }
}

async function releaseInventory(client: PoolClient, order: OrderRecord) {
  for (const item of order.items_json) {
    const remaining = item.qty - (item.fulfilledQty ?? 0);
    if (remaining <= 0) continue;
    await client.query(
      `UPDATE inventory i SET reserved=GREATEST(0,reserved-$1) FROM products p
       WHERE i.product_id=p.id AND i.merchant_id=p.merchant_id AND p.merchant_id=$2 AND p.sku=$3`,
      [remaining, order.merchant_id, item.sku],
    );
  }
}

async function fulfillInventory(client: PoolClient, order: OrderRecord, lines: Array<{ sku: string; qty: number }>) {
  const items = order.items_json.map((item) => ({ ...item }));
  for (const line of lines) {
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(line.sku) || !Number.isInteger(line.qty) || line.qty <= 0) throw new OrderWorkflowError("Invalid fulfillment", "INVALID_FULFILLMENT", 400);
    const item = items.find((candidate) => candidate.sku === line.sku);
    if (!item || (item.fulfilledQty ?? 0) + line.qty > item.qty) throw new OrderWorkflowError(`Fulfillment exceeds ordered quantity for ${line.sku}`, "OVER_FULFILLMENT");
    const updated = await client.query(
      `UPDATE inventory i SET reserved=reserved-$1, on_hand=on_hand-$1 FROM products p
       WHERE i.product_id=p.id AND i.merchant_id=p.merchant_id AND p.merchant_id=$2 AND p.sku=$3
         AND i.reserved >= $1 AND i.on_hand >= $1 RETURNING i.id`, [line.qty, order.merchant_id, line.sku]);
    if (!updated.rowCount) throw new OrderWorkflowError(`Inventory changed for ${line.sku}`, "INVENTORY_CONFLICT");
    item.fulfilledQty = (item.fulfilledQty ?? 0) + line.qty;
  }
  return { items, allFulfilled: items.every((item) => (item.fulfilledQty ?? 0) === item.qty) };
}

export async function transitionOrder(input: {
  merchantId: string; actorUserId?: number; orderId: number; action: OrderAction; idempotencyKey: string;
  details?: Record<string, unknown>;
}): Promise<{ order: OrderRecord; duplicate: boolean }> {
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(input.idempotencyKey)) throw new OrderWorkflowError("Invalid idempotency key", "INVALID_IDEMPOTENCY", 400);
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const duplicate = await client.query(`SELECT order_id FROM order_events WHERE merchant_id=$1 AND idempotency_key=$2`, [input.merchantId, input.idempotencyKey]);
    if (duplicate.rows[0]) {
      if (duplicate.rows[0].order_id !== input.orderId) throw new OrderWorkflowError("Idempotency key belongs to another order", "IDEMPOTENCY_CONFLICT");
      const result = await client.query<OrderRecord>(`SELECT * FROM orders WHERE id=$1 AND merchant_id=$2`, [input.orderId, input.merchantId]);
      await client.query("COMMIT");
      return { order: result.rows[0], duplicate: true };
    }
    const selected = await client.query<OrderRecord>(`SELECT * FROM orders WHERE id=$1 AND merchant_id=$2 FOR UPDATE`, [input.orderId, input.merchantId]);
    const order = selected.rows[0];
    if (!order) throw new OrderWorkflowError("Order not found", "ORDER_NOT_FOUND", 404);
    let items = order.items_json;
    let allFulfilled = false;
    if (input.action === "reserve") await reserveInventory(client, order);
    if (input.action === "payment_failed" || input.action === "cancel") await releaseInventory(client, order);
    if (input.action === "fulfill") {
      const lines = input.details?.lines;
      if (!Array.isArray(lines)) throw new OrderWorkflowError("Fulfillment lines are required", "INVALID_FULFILLMENT", 400);
      const fulfilled = await fulfillInventory(client, order, lines as Array<{ sku: string; qty: number }>);
      items = fulfilled.items; allFulfilled = fulfilled.allFulfilled;
    }
    const recoveryState = input.details?.recoveryState as OrderState | undefined;
    const next = nextOrderState(order.status, input.action, { allFulfilled, recoveryState });
    let paymentStatus = order.payment_status;
    let fulfillmentStatus = order.fulfillment_status;
    let refundStatus = order.refund_status;
    let exceptionCode = order.exception_code;
    if (input.action === "begin_payment") paymentStatus = "pending";
    if (input.action === "payment_succeeded") paymentStatus = "paid";
    if (input.action === "payment_failed") paymentStatus = "failed";
    if (input.action === "fulfill") fulfillmentStatus = allFulfilled ? "fulfilled" : "partial";
    if (input.action === "deliver") fulfillmentStatus = "delivered";
    if (input.action === "request_refund") {
      const amount = Number(input.details?.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(order.total)) throw new OrderWorkflowError("Invalid refund amount", "INVALID_REFUND", 400);
      refundStatus = "pending";
      await client.query(`INSERT INTO refunds (merchant_id,order_id,idempotency_key,amount) VALUES ($1,$2,$3,$4)`, [input.merchantId, order.id, input.idempotencyKey, amount.toFixed(2)]);
    }
    if (input.action === "refund_succeeded" || input.action === "refund_failed") {
      refundStatus = input.action === "refund_succeeded" ? "refunded" : "failed";
      await client.query(`UPDATE refunds SET status=$1, provider_reference=$2, failure_reason=$3, updated_at=NOW()
        WHERE id=(SELECT id FROM refunds WHERE merchant_id=$4 AND order_id=$5 AND status='pending' ORDER BY id DESC LIMIT 1)`,
        [refundStatus, String(input.details?.providerReference ?? "").slice(0, 160) || null,
          input.action === "refund_failed" ? String(input.details?.reason ?? "provider failure").slice(0, 2_000) : null, input.merchantId, order.id]);
    }
    if (input.action === "flag_exception") exceptionCode = String(input.details?.code ?? "UNCLASSIFIED").slice(0, 64);
    if (input.action === "recover") exceptionCode = null;
    const updated = await client.query<OrderRecord>(
      `UPDATE orders SET status=$1,payment_status=$2,fulfillment_status=$3,refund_status=$4,items_json=$5,
       exception_code=$6,row_version=row_version+1,updated_at=NOW() WHERE id=$7 AND merchant_id=$8 RETURNING *`,
      [next, paymentStatus, fulfillmentStatus, refundStatus, JSON.stringify(items), exceptionCode, order.id, input.merchantId]);
    await appendEvent(client, { ...input, fromState: order.status, toState: next, details: input.details });
    await client.query("COMMIT");
    return { order: updated.rows[0], duplicate: false };
  } catch (error) { await rollback(client); throw error; } finally { client.release(); }
}

export async function listOrders(merchantId: string) {
  const result = await pool.query<OrderRecord>(`SELECT * FROM orders WHERE merchant_id=$1 ORDER BY id DESC LIMIT 500`, [merchantId]);
  return result.rows;
}

export async function getOrder(merchantId: string, orderId: number) {
  const result = await pool.query<OrderRecord>(`SELECT * FROM orders WHERE merchant_id=$1 AND id=$2`, [merchantId, orderId]);
  if (!result.rows[0]) throw new OrderWorkflowError("Order not found", "ORDER_NOT_FOUND", 404);
  return result.rows[0];
}

export async function getOrderHistory(merchantId: string, orderId: number) {
  const result = await pool.query(`SELECT id,order_id,actor_user_id,action,from_state,to_state,details,previous_hash,event_hash,signature,signing_key_id,created_at
    FROM order_events WHERE merchant_id=$1 AND order_id=$2 ORDER BY id`, [merchantId, orderId]);
  return result.rows;
}
