"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { sku: string; qty: number; fulfilledQty?: number };

export function OrderActions({ order, role }: { order: Record<string, unknown>; role: string }) {
  const router = useRouter();
  const status = String(order.status);
  const items = (order.itemsJson ?? []) as Item[];
  const [sku, setSku] = useState(items.find((item) => (item.fulfilledQty ?? 0) < item.qty)?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState(String(order.total ?? ""));
  const [provider, setProvider] = useState("payment");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: string, details: Record<string, unknown> = {}) {
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/orders/${order.id}/actions`, { method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ action, details }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Order action failed"); return; }
    setMessage("Action recorded."); router.refresh();
  }

  async function reconcile() {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/reconciliation", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, provider }) });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Reconciliation failed"); return; }
    setMessage(result.matches ? "Provider and internal state match." : "Mismatch recorded as an exception."); router.refresh();
  }

  return <section className="card p-5 space-y-4">
    <div><h2 className="font-semibold">Governed order actions</h2><p className="text-xs text-slate-500">Every action requires a new idempotency key and appends a signed audit event.</p></div>
    <div className="flex flex-wrap gap-2">
      {status === "draft" && <button disabled={busy} onClick={() => act("reserve")} className="btn-primary">Reserve inventory</button>}
      {status === "reserved" && <button disabled={busy} onClick={() => act("begin_payment")} className="btn-primary">Collect payment</button>}
      {["draft", "reserved", "payment_failed"].includes(status) && <button disabled={busy} onClick={() => act("cancel")} className="btn-danger">Cancel order</button>}
    </div>
    {["paid", "partially_fulfilled"].includes(status) && <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
      <select className="input" value={sku} onChange={(event) => setSku(event.target.value)}>{items.map((item) => <option key={item.sku} value={item.sku}>{item.sku} ({(item.fulfilledQty ?? 0)}/{item.qty})</option>)}</select>
      <input className="input" type="number" min={1} step={1} value={qty} onChange={(event) => setQty(Number(event.target.value))} />
      <button disabled={busy || !sku} onClick={() => act("fulfill", { lines: [{ sku, qty }] })} className="btn-primary">Create shipment</button>
    </div>}
    {["paid", "partially_fulfilled", "fulfilled", "delivered", "refund_failed"].includes(status) && <div className="grid gap-2 sm:grid-cols-[160px_auto] max-w-md">
      <input className="input" type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
      <button disabled={busy} onClick={() => act("request_refund", { amount: Number(refundAmount) })} className="btn-danger">Request refund</button>
    </div>}
    {status === "exception" && role === "merchant_admin" && <div className="flex gap-2"><select className="input max-w-xs" id="recovery-state"><option value="draft">draft</option><option value="reserved">reserved</option><option value="payment_failed">payment failed</option><option value="paid">paid</option><option value="partially_fulfilled">partially fulfilled</option><option value="fulfilled">fulfilled</option></select>
      <button disabled={busy} onClick={() => act("recover", { recoveryState: (document.getElementById("recovery-state") as HTMLSelectElement).value })} className="btn-primary">Recover after investigation</button></div>}
    {role === "merchant_admin" && <div className="flex gap-2 border-t pt-4"><select className="input max-w-xs" value={provider} onChange={(event) => setProvider(event.target.value)}><option>payment</option><option>shipping</option><option>inventory</option><option>partner</option></select><button disabled={busy} onClick={reconcile} className="btn-ghost">Reconcile provider</button></div>}
    {message && <p className="text-sm text-slate-700" role="status">{message}</p>}
  </section>;
}
