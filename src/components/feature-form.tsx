"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/features";
import { Icon } from "./icon";

export function FeatureForm({
  slug,
  fields,
  initial,
  mode,
  id,
}: {
  slug: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  mode: "create" | "edit";
  id?: number;
}) {
  const router = useRouter();
  const init = Object.fromEntries(fields.map((f) => {
    let v = initial[f.name];
    if (v === undefined || v === null) v = f.default ?? "";
    return [f.name, String(v ?? "")];
  })) as Record<string, string>;

  const [values, setValues] = useState<Record<string, string>>(init);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = mode === "create" ? `/api/features/${slug}` : `/api/features/${slug}/${id}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? "Save failed"); return; }
    if (mode === "create") {
      router.push(`/${slug}/${j.row.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <label className="label">
              {f.label}{f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                className="input min-h-[100px]"
                value={values[f.name] ?? ""}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                placeholder={f.placeholder}
                required={f.required}
              />
            ) : f.type === "select" ? (
              <select
                className="input"
                value={values[f.name] ?? ""}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                required={f.required}
              >
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={f.type === "number" ? "number" : "text"}
                step={f.type === "number" ? "any" : undefined}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                placeholder={f.placeholder}
                required={f.required}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button type="submit" disabled={loading} className="btn-primary">
          <Icon name={loading ? "Loader2" : mode === "create" ? "Plus" : "Save"} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
