import { pool } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

async function metric(q: string, merchantId: string) {
  const r = await pool.query<{ v: string }>(q, [merchantId]);
  return r.rows[0]?.v ?? "0";
}

export default async function AnalyticsPage() {
  const session = await getRequiredSession(["operator", "merchant_admin"]);
  const merchantId = session.merchantId;
  const [totalRevenue, paidOrders, aov, returnRate, topCat, byChannel, byStatus] = await Promise.all([
    metric(`SELECT COALESCE(SUM(total),0)::text AS v FROM orders WHERE merchant_id=$1 AND payment_status='paid' AND refund_status <> 'refunded'`, merchantId),
    metric(`SELECT COUNT(*)::text AS v FROM orders WHERE merchant_id=$1 AND payment_status='paid'`, merchantId),
    metric(`SELECT COALESCE(AVG(total),0)::text AS v FROM orders WHERE merchant_id=$1 AND payment_status='paid'`, merchantId),
    metric(`SELECT CASE WHEN COUNT(*)=0 THEN '0' ELSE (COUNT(*) FILTER (WHERE refund_status IN ('pending','refunded','failed')) * 100.0 / COUNT(*))::text END AS v FROM orders WHERE merchant_id=$1`, merchantId),
    pool.query<{ category: string; n: string }>(`SELECT category,COUNT(*)::text AS n FROM products WHERE merchant_id=$1 GROUP BY category ORDER BY COUNT(*) DESC LIMIT 5`, [merchantId]),
    pool.query<{ channel: string; n: string; rev: string }>(`SELECT channel,COUNT(*)::text AS n,COALESCE(SUM(total),0)::text AS rev FROM orders WHERE merchant_id=$1 GROUP BY channel`, [merchantId]),
    pool.query<{ status: string; n: string }>(`SELECT status,COUNT(*)::text AS n FROM orders WHERE merchant_id=$1 GROUP BY status`, [merchantId]),
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
