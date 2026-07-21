import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const session = await getRequiredSession(["customer"]);
  if (!session.customerId) redirect("/login");
  const result = await pool.query<{
    id: number; order_number: string; total: string; currency: string; status: string; fulfillment_status: string; created_at: Date;
  }>(`SELECT id,order_number,total,currency,status,fulfillment_status,created_at FROM orders
      WHERE merchant_id=$1 AND customer_id=$2 ORDER BY id DESC LIMIT 200`, [session.merchantId, session.customerId]);
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold tracking-tight">My orders</h1><p className="text-slate-500 text-sm">Current status for orders attached to your customer account.</p></div>
    <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr>
      <th className="text-left px-4 py-3">Order</th><th className="text-left px-4 py-3">Placed</th><th className="text-left px-4 py-3">Total</th><th className="text-left px-4 py-3">Order status</th><th className="text-left px-4 py-3">Fulfillment</th>
    </tr></thead><tbody className="divide-y">{result.rows.map((order) => <tr key={order.id}>
      <td className="px-4 py-3 font-mono">{order.order_number}</td><td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString()}</td>
      <td className="px-4 py-3">{order.currency} {Number(order.total).toFixed(2)}</td><td className="px-4 py-3">{order.status}</td><td className="px-4 py-3">{order.fulfillment_status}</td>
    </tr>)}</tbody></table>{result.rows.length === 0 && <p className="p-8 text-center text-slate-500">No orders are linked to this account.</p>}</div>
  </div>;
}
