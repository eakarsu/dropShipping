"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "./data-table";
import { Icon } from "./icon";
import Link from "next/link";
import type { FeatureDef } from "@/lib/features";

export function FeatureListClient({
  feature, initialRows,
}: { feature: FeatureDef; initialRows: Record<string, unknown>[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState("");

  async function deleteRow(id: number) {
    const res = await fetch(`/api/features/${feature.slug}/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((x) => Number((x as { id: unknown }).id) !== id));
    } else {
      alert("Delete failed");
    }
  }

  const filtered = filter
    ? rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center">
              <Icon name={feature.icon} className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{feature.name}</h1>
          </div>
          <p className="text-slate-500 text-sm">{feature.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {feature.primaryAiTool && (
            <Link href={`/ai/${feature.primaryAiTool}`} className="btn-ghost">
              <Icon name="Sparkles" className="w-4 h-4 text-brand-600" />
              AI assist
            </Link>
          )}
          <button onClick={() => router.push(`/${feature.slug}/new`)} className="btn-primary">
            <Icon name="Plus" className="w-4 h-4" />
            New {feature.singular}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={`Search ${feature.name.toLowerCase()}…`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <DataTable rows={filtered} columns={feature.columns} slug={feature.slug} onDelete={deleteRow} />
    </div>
  );
}
