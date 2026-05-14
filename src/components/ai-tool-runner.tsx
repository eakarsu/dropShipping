"use client";

import { useState } from "react";
import { AiResponse } from "./ai-response";
import { Icon } from "./icon";
import type { AiToolDef } from "@/lib/ai-tools";

// Server components can't pass functions across the boundary, so the runner
// only receives the serializable fields.
export type AiToolClient = Omit<AiToolDef, "buildMessages">;

export function AiToolRunner({ tool, prefill }: { tool: AiToolClient; prefill?: Record<string, string> }) {
  const initial = Object.fromEntries(
    tool.fields.map((f) => [f.name, prefill?.[f.name] ?? f.default ?? ""]),
  ) as Record<string, string>;
  const [input, setInput] = useState<Record<string, string>>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ output: string; model: string; tokensUsed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/ai/${tool.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setLoading(false);
    const j = await res.json();
    if (!res.ok) { setError(j.error ?? "AI request failed"); return; }
    setResult({ output: j.output, model: j.model, tokensUsed: j.tokensUsed });
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center shrink-0">
            <Icon name={tool.icon} className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-semibold">{tool.name}</div>
            <div className="text-sm text-slate-500">{tool.description}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tool.fields.map((f) => (
            <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
              <label className="label">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
              {f.type === "textarea" ? (
                <textarea
                  className="input min-h-[110px]"
                  value={input[f.name] ?? ""}
                  onChange={(e) => setInput({ ...input, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                />
              ) : f.type === "select" ? (
                <select
                  className="input"
                  value={input[f.name] ?? ""}
                  onChange={(e) => setInput({ ...input, [f.name]: e.target.value })}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type === "number" ? "number" : "text"}
                  value={input[f.name] ?? ""}
                  onChange={(e) => setInput({ ...input, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Powered by <span className="font-mono">{process.env.NEXT_PUBLIC_OPENROUTER_MODEL ?? "OpenRouter"}</span>
          </div>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Icon name="Sparkles" className="w-4 h-4" />
                Run AI
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {result && (
        <AiResponse
          output={result.output}
          model={result.model}
          tokensUsed={result.tokensUsed}
          tool={tool.slug}
        />
      )}
    </div>
  );
}
