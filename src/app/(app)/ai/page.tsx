import Link from "next/link";
import { AI_TOOLS, TOOL_CATEGORIES } from "@/lib/ai-tools";

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { aiRuns } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function AiCenterPage() {
  const recent = await db.select().from(aiRuns).orderBy(desc(aiRuns.id)).limit(5);
  const stats = (await db.execute<{ total: string; ok: string }>(
    sql.raw(`SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status='ok')::text AS ok FROM ai_runs`),
  )).rows[0] ?? { total: "0", ok: "0" };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 grid place-items-center">
              <Icon name="Sparkles" className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Center</h1>
          </div>
          <p className="text-slate-500 text-sm">
            All AI capabilities, in one place. {AI_TOOLS.length} tools across {TOOL_CATEGORIES.length} categories.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Total runs</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
      </div>

      {TOOL_CATEGORIES.map((cat) => (
        <section key={cat}>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{cat}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_TOOLS.filter((t) => t.category === cat).map((t) => (
              <Link
                key={t.slug}
                href={`/ai/${t.slug}`}
                className="card p-5 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 grid place-items-center mb-3">
                  <Icon name={t.icon} className="w-5 h-5 text-brand-600" />
                </div>
                <div className="font-semibold mb-1">{t.name}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{t.description}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent runs</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Tool</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Tokens</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.tool}</td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${r.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{r.tokensUsed}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
