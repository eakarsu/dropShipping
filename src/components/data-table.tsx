"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@/lib/features";
import { Icon } from "./icon";

export function DataTable({
  rows, columns, slug, onDelete,
}: {
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
  slug: string;
  onDelete: (id: number) => void;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-500">
        <Icon name="Inbox" className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <div className="font-medium text-slate-700">No items yet</div>
        <div className="text-sm">Click <strong>New</strong> above to create one.</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((c) => (
                <th key={c.name} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-[150px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const id = Number(row.id);
              return (
                <tr
                  key={id}
                  className="table-row-clickable"
                  onClick={() => router.push(`/${slug}/${id}`)}
                >
                  {columns.map((c) => (
                    <td key={c.name} className="px-4 py-3 align-middle">
                      <CellValue value={row[c.name]} format={c.format} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => router.push(`/${slug}/${id}`)}
                        className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded transition"
                        title="View / Edit"
                      >
                        <Icon name="Pencil" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this item?")) onDelete(id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Icon name="Trash2" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
        Showing <strong>{rows.length}</strong> {rows.length === 1 ? "item" : "items"} · click any row to view details
      </div>
    </div>
  );
}

function CellValue({ value, format }: { value: unknown; format?: ColumnDef["format"] }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;

  if (format === "money") {
    const n = Number(value);
    return <span className="font-mono">${Number.isFinite(n) ? n.toFixed(2) : String(value)}</span>;
  }
  if (format === "date") {
    const d = new Date(String(value));
    return <span className="text-slate-600">{d.toLocaleDateString()}</span>;
  }
  if (format === "rating") {
    const n = Number(value);
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name={i < Math.round(n) ? "Star" : "Star"} className={i < Math.round(n) ? "w-3.5 h-3.5 fill-amber-400" : "w-3.5 h-3.5 text-slate-200"} />
        ))}
        <span className="ml-1 text-xs text-slate-600">{Number.isFinite(n) ? n.toFixed(1) : String(value)}</span>
      </span>
    );
  }
  if (format === "badge") {
    const s = String(value);
    return <span className={`badge ${badgeClass(s)}`}>{s}</span>;
  }
  if (format === "json") {
    return <span className="font-mono text-xs text-slate-600">{JSON.stringify(value).slice(0, 60)}…</span>;
  }
  if (typeof value === "boolean") {
    return <span className={`badge ${value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{value ? "yes" : "no"}</span>;
  }
  if (typeof value === "object") {
    return <span className="font-mono text-xs text-slate-600">{JSON.stringify(value).slice(0, 60)}</span>;
  }
  const s = String(value);
  return <span>{s.length > 60 ? s.slice(0, 60) + "…" : s}</span>;
}

function badgeClass(v: string): string {
  const m: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    paid: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    shipped: "bg-indigo-100 text-indigo-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    draft: "bg-slate-100 text-slate-600",
    completed: "bg-emerald-100 text-emerald-700",
    connected: "bg-emerald-100 text-emerald-700",
    needs_reauth: "bg-amber-100 text-amber-700",
    disconnected: "bg-red-100 text-red-700",
    shopify: "bg-emerald-100 text-emerald-700",
    amazon: "bg-orange-100 text-orange-700",
    etsy: "bg-rose-100 text-rose-700",
    positive: "bg-emerald-100 text-emerald-700",
    negative: "bg-red-100 text-red-700",
    neutral: "bg-slate-100 text-slate-700",
    requested: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    received: "bg-indigo-100 text-indigo-700",
    refunded: "bg-emerald-100 text-emerald-700",
    denied: "bg-red-100 text-red-700",
    in_transit: "bg-blue-100 text-blue-700",
    out_for_delivery: "bg-indigo-100 text-indigo-700",
    label_created: "bg-slate-100 text-slate-700",
    exception: "bg-red-100 text-red-700",
    new: "bg-blue-100 text-blue-700",
    loyal: "bg-emerald-100 text-emerald-700",
    vip: "bg-purple-100 text-purple-700",
    at_risk: "bg-amber-100 text-amber-700",
    markup: "bg-blue-100 text-blue-700",
    match: "bg-slate-100 text-slate-700",
    undercut: "bg-orange-100 text-orange-700",
    global: "bg-slate-100 text-slate-700",
    category: "bg-blue-100 text-blue-700",
    product: "bg-purple-100 text-purple-700",
    google: "bg-blue-100 text-blue-700",
    facebook: "bg-indigo-100 text-indigo-700",
    tiktok: "bg-slate-900 text-white",
    instagram: "bg-pink-100 text-pink-700",
    email: "bg-emerald-100 text-emerald-700",
  };
  return m[v.toLowerCase?.() ?? v] ?? "bg-slate-100 text-slate-700";
}
