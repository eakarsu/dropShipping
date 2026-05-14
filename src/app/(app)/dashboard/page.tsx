import Link from "next/link";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

import { sql } from "drizzle-orm";
import { FEATURES } from "@/lib/features";
import { AI_TOOLS } from "@/lib/ai-tools";
import { Icon } from "@/components/icon";

async function counts() {
  const tables = ["products", "suppliers", "orders", "customers", "inventory", "campaigns", "channels", "pricing_rules", "reviews", "returns", "shipments", "ai_runs"] as const;
  const out: Record<string, number> = {};
  for (const t of tables) {
    const r = await db.execute<{ c: string }>(sql.raw(`SELECT COUNT(*)::text AS c FROM ${t}`));
    out[t] = Number((r.rows[0]?.c ?? "0"));
  }
  return out;
}

async function recentOrders() {
  return db.select().from(schema.orders).orderBy(sql`created_at DESC`).limit(5);
}

async function topProducts() {
  return db.select().from(schema.products).limit(4);
}

const slugToTable: Record<string, string> = {
  products: "products",
  suppliers: "suppliers",
  orders: "orders",
  customers: "customers",
  inventory: "inventory",
  campaigns: "campaigns",
  channels: "channels",
  "pricing-rules": "pricing_rules",
  reviews: "reviews",
  returns: "returns",
  shipments: "shipments",
};

export default async function DashboardPage() {
  const [c, latest, prods] = await Promise.all([counts(), recentOrders(), topProducts()]);

  const totalRevenue = (await db.execute<{ s: string }>(
    sql.raw(`SELECT COALESCE(SUM(total),0)::text AS s FROM orders WHERE status IN ('paid','shipped','delivered')`),
  )).rows[0]?.s ?? "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of your dropshipping operation across Amazon, Shopify, and Etsy.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="DollarSign" label="Revenue (paid+)" value={`$${Number(totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} accent="from-emerald-500 to-teal-600" />
        <KpiCard icon="ShoppingCart" label="Orders" value={String(c.orders ?? 0)} accent="from-brand-500 to-purple-600" />
        <KpiCard icon="Users" label="Customers" value={String(c.customers ?? 0)} accent="from-orange-500 to-amber-600" />
        <KpiCard icon="Sparkles" label="AI runs" value={String(c.ai_runs ?? 0)} accent="from-pink-500 to-rose-600" />
      </div>

      {/* Feature cards (clickable → routes to feature) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.slug}
              href={`/${f.slug}`}
              className="card p-4 hover:shadow-md hover:border-brand-300 hover:-translate-y-0.5 transition group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center group-hover:from-brand-50 group-hover:to-brand-100 transition">
                  <Icon name={f.icon} className="w-5 h-5 text-slate-700 group-hover:text-brand-700" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {c[slugToTable[f.slug]!] ?? 0}
                </div>
              </div>
              <div className="font-semibold text-slate-900">{f.name}</div>
              <div className="text-xs text-slate-500 line-clamp-2">{f.description}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI tools highlight */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 via-white to-purple-50 border-brand-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold">AI Center</h2>
          </div>
          <Link href="/ai" className="text-xs text-brand-700 hover:text-brand-900">See all {AI_TOOLS.length} tools →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {AI_TOOLS.slice(0, 5).map((t) => (
            <Link
              key={t.slug}
              href={`/ai/${t.slug}`}
              className="card p-3 hover:border-brand-400 hover:shadow transition cursor-pointer"
            >
              <Icon name={t.icon} className="w-4 h-4 text-brand-600 mb-1.5" />
              <div className="text-sm font-medium leading-tight">{t.name}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/orders" className="text-xs text-brand-600 hover:text-brand-800">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-2">Order</th>
                  <th className="py-2">Channel</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latest.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono text-xs">
                      <Link href={`/orders/${o.id}`} className="text-brand-600 hover:text-brand-800">{o.orderNumber}</Link>
                    </td>
                    <td className="py-2.5"><span className="badge bg-slate-100 text-slate-700">{o.channel}</span></td>
                    <td className="py-2.5">${Number(o.total).toFixed(2)}</td>
                    <td className="py-2.5"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Top products</h2>
            <Link href="/products" className="text-xs text-brand-600 hover:text-brand-800">All →</Link>
          </div>
          <div className="space-y-2">
            {prods.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 transition">
                <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center text-xs font-mono text-slate-500">
                  {p.sku.slice(-3)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-xs text-slate-500">${Number(p.price).toFixed(2)} · {p.category}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-blue-100 text-blue-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`badge ${map[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</span>;
}
