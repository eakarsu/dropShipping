import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { OrderWorkflowError, transitionOrder } from "@/lib/orders/service";
import { mapWebhookAction, type NormalizedWebhook, verifyWebhookSignature, webhookPayloadHash } from "@/lib/orders/webhooks";
import { commitProviderInventory, releaseProviderInventory } from "@/lib/orders/providers";

const PROVIDERS = ["payment", "shipping", "inventory", "partner"] as const;

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const provider = (await context.params).provider;
  if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const raw = await request.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const secret = process.env[`WEBHOOK_${provider.toUpperCase()}_SECRET`];
  if (!verifyWebhookSignature(raw, request.headers.get("x-webhook-signature"), secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let event: NormalizedWebhook;
  try { event = JSON.parse(raw) as NormalizedWebhook; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!/^[A-Za-z0-9:_-]{1,160}$/.test(event.eventId ?? "") || !/^[A-Za-z0-9_-]{1,64}$/.test(event.merchantId ?? "") || !Number.isInteger(event.orderId)) {
    return NextResponse.json({ error: "Invalid event envelope" }, { status: 400 });
  }
  const payloadHash = webhookPayloadHash(raw);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO webhook_receipts (merchant_id,provider,provider_event_id,payload_hash,status) VALUES ($1,$2,$3,$4,'processing')
       ON CONFLICT (provider,provider_event_id) DO NOTHING RETURNING id`, [event.merchantId, provider, event.eventId, payloadHash]);
    if (!inserted.rowCount) {
      const existing = await client.query<{ merchant_id: string; payload_hash: string; status: string; created_at: Date }>(
        `SELECT merchant_id,payload_hash,status,created_at FROM webhook_receipts WHERE provider=$1 AND provider_event_id=$2 FOR UPDATE`, [provider, event.eventId]);
      const receipt = existing.rows[0];
      if (!receipt || receipt.payload_hash !== payloadHash || receipt.merchant_id !== event.merchantId) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Event identity conflict" }, { status: 409 });
      }
      if (receipt.status === "processed") {
        await client.query("COMMIT");
        return NextResponse.json({ ok: true, duplicate: true });
      }
      if (receipt.status === "processing" && Date.now() - new Date(receipt.created_at).getTime() < 5 * 60_000) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Event is already processing; retry later" }, { status: 409 });
      }
      await client.query(`UPDATE webhook_receipts SET status='processing',error=NULL WHERE provider=$1 AND provider_event_id=$2`, [provider, event.eventId]);
    }
    await client.query("COMMIT");
  } catch { await client.query("ROLLBACK").catch(() => undefined); return NextResponse.json({ error: "Receipt persistence failed" }, { status: 503 }); }
  finally { client.release(); }

  try {
    const action = mapWebhookAction(provider, event.type);
    let inventoryEvidence: Record<string, unknown> = {};
    if (action === "payment_failed") {
      const released = await releaseProviderInventory({ merchantId: event.merchantId, orderId: event.orderId }, `webhook:${provider}:${event.eventId}:inventory`);
      inventoryEvidence = { inventoryReference: released.data.reference, inventoryChecksum: released.checksum };
    }
    if (action === "fulfill") {
      const committed = await commitProviderInventory({ merchantId: event.merchantId, orderId: event.orderId, lines: event.details?.lines }, `webhook:${provider}:${event.eventId}:inventory`);
      inventoryEvidence = { inventoryReference: committed.data.reference, inventoryChecksum: committed.checksum };
    }
    const result = await transitionOrder({ merchantId: event.merchantId, orderId: event.orderId, action,
      idempotencyKey: `webhook:${provider}:${event.eventId}`, details: { ...event.details, ...inventoryEvidence } });
    await pool.query(`UPDATE webhook_receipts SET status='processed',processed_at=NOW() WHERE provider=$1 AND provider_event_id=$2`, [provider, event.eventId]);
    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    await pool.query(`UPDATE webhook_receipts SET status='failed',error=$1 WHERE provider=$2 AND provider_event_id=$3`,
      [error instanceof Error ? error.message.slice(0, 2_000) : "processing failure", provider, event.eventId]).catch(() => undefined);
    const status = error instanceof OrderWorkflowError ? error.status : 422;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status });
  }
}
