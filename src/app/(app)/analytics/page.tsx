import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Icon } from "@/components/icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function metric(q: string) {
  const r = await db.execute<{ v: string }>(sql.raw(q));
  return r.rows[0]?.v ?? "0";
}

export default async function AnalyticsPage() {
  const [totalRevenue, paidOrders, aov, returnRate, topCat, byChannel, byStatus] = await Promise.all([
    metric(`SELECT COALESCE(SUM(total),0)::text AS v FROM orders WHERE status IN ('paid','shipped','delivered')`),
    metric(`SELECT COUNT(*)::text AS v FROM orders WHERE status IN ('paid','shipped','delivered')`),
    metric(`SELECT COALESCE(AVG(total),0)::text AS v FROM orders WHERE status IN ('paid','shipped','delivered')`),
    metric(`SELECT (CASE WHEN (SELECT COUNT(*) FROM orders) = 0 THEN 0 ELSE (SELECT COUNT(*) FROM returns) * 100.0 / (SELECT COUNT(*) FROM orders) END)::text AS v`),
    db.execute<{ category: string; n: string }>(sql.raw(`SELECT category, COUNT(*)::text AS n FROM products GROUP BY category ORDER BY COUNT(*) DESC LIMIT 5`)),
    db.execute<{ channel: string; n: string; rev: string }>(sql.raw(`SELECT channel, COUNT(*)::text AS n, COALESCE(SUM(total),0)::text AS rev FROM orders GROUP BY channel`)),
    db.execute<{ status: string; n: string }>(sql.raw(`SELECT status, COUNT(*)::text AS n FROM orders GROUP BY status`)),
  ]);

  const aovNum = Number(aov);
  const returnPct = Number(returnRate);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-slate-500 text-sm">Real-time business performance across your sales channels.</p>
        </div>
        <Link href="/ai/executive-summary" className="btn-primary">
          <Icon name="Sparkles" className="w-4 h-4" />
          AI Executive Summary
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon="DollarSign" label="Revenue" value={`$${Number(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="from-emerald-500 to-teal-600" />
        <Kpi icon="ShoppingCart" label="Paid orders" value={paidOrders} accent="from-brand-500 to-purple-600" />
        <Kpi icon="TrendingUp" label="Avg order value" value={`$${aovNum.toFixed(2)}`} accent="from-orange-500 to-amber-600" />
        <Kpi icon="PackageX" label="Return rate" value={`${returnPct.toFixed(1)}%`} accent="from-pink-500 to-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="Network" className="w-4 h-4" /> By channel</h2>
          <div className="space-y-2">
            {byChannel.rows.map((r) => {
              const max = Math.max(1, ...byChannel.rows.map((x) => Number(x.rev)));
              const pct = (Number(r.rev) / max) * 100;
              return (
                <div key={r.channel}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{r.channel}</span>
                    <span className="text-slate-500">${Number(r.rev).toFixed(2)} · {r.n} orders</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-purple-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="Activity" className="w-4 h-4" /> Order status</h2>
          <div className="space-y-2">
            {byStatus.rows.map((r) => {
              const max = Math.max(1, ...byStatus.rows.map((x) => Number(x.n)));
              const pct = (Number(r.n) / max) * 100;
              return (
                <div key={r.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{r.status}</span>
                    <span className="text-slate-500">{r.n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Icon name="LayoutGrid" className="w-4 h-4" /> Top categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {topCat.rows.map((r) => (
            <div key={r.category} className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs text-slate-500">{r.category}</div>
              <div className="text-lg font-bold">{r.n}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} grid place-items-center mb-3`}>
        <Icon name={icon} className="w-4 h-4 text-white" />
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
