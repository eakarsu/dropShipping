"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewOrderForm() {
  const router = useRouter();
  const [form, setForm] = useState({ orderNumber: "", channel: "manual", currency: "USD", sku: "", title: "", qty: "1", price: "", shippingTotal: "0", shippingAddress: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  function field(name: keyof typeof form) { return { value: form[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [name]: event.target.value }) }; }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ orderNumber: form.orderNumber, channel: form.channel, currency: form.currency,
        items: [{ sku: form.sku, title: form.title, qty: Number(form.qty), price: Number(form.price) }],
        shippingTotal: Number(form.shippingTotal), shippingAddress: form.shippingAddress }) });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(result.error ?? "Order creation failed"); return; }
    router.push(`/orders/${result.order.id}`); router.refresh();
  }
  return <div className="max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold">Create governed order</h1><p className="text-sm text-slate-500">Tax is quoted by the configured provider; inventory is reserved in the next audited step.</p></div>
    <form onSubmit={submit} className="card p-5 grid gap-4 md:grid-cols-2">
      <label className="label">Order number<input required className="input mt-1" {...field("orderNumber")} /></label>
      <label className="label">Channel<select className="input mt-1" {...field("channel")}><option>manual</option><option>shopify</option><option>amazon</option><option>etsy</option></select></label>
      <label className="label">SKU<input required className="input mt-1" {...field("sku")} /></label>
      <label className="label">Title<input required className="input mt-1" {...field("title")} /></label>
      <label className="label">Quantity<input required min="1" step="1" type="number" className="input mt-1" {...field("qty")} /></label>
      <label className="label">Unit price<input required min="0" step="0.01" type="number" className="input mt-1" {...field("price")} /></label>
      <label className="label">Currency<input required pattern="[A-Z]{3}" maxLength={3} className="input mt-1" {...field("currency")} /></label>
      <label className="label">Shipping total<input required min="0" step="0.01" type="number" className="input mt-1" {...field("shippingTotal")} /></label>
      <label className="label md:col-span-2">Shipping address<textarea required maxLength={4000} className="input mt-1 min-h-24" {...field("shippingAddress")} /></label>
      {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
      <div className="md:col-span-2"><button disabled={busy} className="btn-primary">{busy ? "Creating…" : "Quote tax and create order"}</button></div>
    </form></div>;
}
