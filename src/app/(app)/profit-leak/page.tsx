"use client";

import { useState } from "react";

const sample = JSON.stringify([
  { sku: "LED-01", price: 39, cost: 18, shipping: 9, adSpend: 7 },
  { sku: "CASE-44", price: 24, cost: 11, shipping: 5, adSpend: 3 }
], null, 2);

export default function ProfitLeakPage() {
  const [payload, setPayload] = useState(sample);
  const [result, setResult] = useState<any>(null);

  async function run() {
    const response = await fetch("/api/profit-leak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: JSON.parse(payload) }),
    });
    setResult(await response.json());
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Profit Leak Scanner</h1>
        <p className="text-sm text-slate-600">Find SKUs where ads, supplier cost, or shipping are eroding dropship margin.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-5">
          <textarea className="h-64 w-full rounded-md border p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} />
          <button className="mt-3 rounded-md bg-slate-950 px-4 py-2 text-white" onClick={run}>Scan leaks</button>
        </section>
        <section className="rounded-lg border bg-white p-5">
          {result ? result.findings.map((row: any) => (
            <div key={row.sku} className="border-b py-3">
              <strong>{row.sku}</strong>
              <div>{row.margin}% margin | {row.leak}</div>
              <p className="text-sm text-slate-600">{row.action}</p>
            </div>
          )) : <p className="text-sm text-slate-600">Run a scan to see margin leakage.</p>}
        </section>
      </div>
    </main>
  );
}
