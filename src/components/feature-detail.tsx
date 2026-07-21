"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeatureForm } from "./feature-form";
import { Icon } from "./icon";
import Link from "next/link";
import type { FeatureDef } from "@/lib/features";
import { OrderActions } from "./order-actions";

export function FeatureDetailClient({
  feature, row, id, governed = false, canDelete = false, role,
}: { feature: FeatureDef; row: Record<string, unknown>; id: number; governed?: boolean; canDelete?: boolean; role: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/features/${feature.slug}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push(`/${feature.slug}`);
    else alert("Delete failed");
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/${feature.slug}`} className="hover:text-brand-700">{feature.name}</Link>
        <Icon name="ChevronRight" className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-mono">#{id}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {String(row.title ?? row.name ?? row.orderNumber ?? row.email ?? `${feature.singular} #${id}`)}
          </h1>
          <p className="text-slate-500 text-sm">{feature.singular} details and actions.</p>
        </div>
        <div className="flex items-center gap-2">
          {!governed && !editing && (
            <button onClick={() => setEditing(true)} className="btn-ghost">
              <Icon name="Pencil" className="w-4 h-4" />
              Edit
            </button>
          )}
          {!governed && canDelete && <button onClick={del} disabled={busy} className="btn-danger">
            <Icon name="Trash2" className="w-4 h-4" />
            Delete
          </button>}
        </div>
      </div>

      {feature.slug === "orders" && <OrderActions order={row} role={role} />}

      {editing ? (
        <FeatureForm slug={feature.slug} fields={feature.fields} initial={row} mode="edit" id={id} />
      ) : (
        <div className="card p-5">
          <dl className="grid gap-4 md:grid-cols-2">
            {feature.fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <dt className="label">{f.label}</dt>
                <dd className="text-sm text-slate-900 break-words">{formatValue(row[f.name])}</dd>
              </div>
            ))}
            {row.createdAt ? (
              <div>
                <dt className="label">Created</dt>
                <dd className="text-sm text-slate-700">{new Date(String(row.createdAt)).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
    </div>
  );
}

function formatValue(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-slate-400">—</span>;
  if (typeof v === "object") return <pre className="text-xs bg-slate-50 p-2 rounded overflow-x-auto">{JSON.stringify(v, null, 2)}</pre>;
  return String(v);
}
