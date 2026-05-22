"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { AI_TOOLS } from "@/lib/ai-tools";
import { Icon } from "./icon";
import clsx from "clsx";

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold">
          D
        </div>
        <div>
          <div className="font-semibold leading-tight">Dropship Mgr</div>
          <div className="text-xs text-slate-400">Amazon · Shopify · Etsy</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        <NavSection title="Overview">
          <NavLink href="/dashboard" icon="LayoutDashboard" label="Dashboard" active={isActive("/dashboard")} />
          <NavLink href="/analytics" icon="BarChart3" label="Analytics" active={isActive("/analytics")} />
        </NavSection>

        <NavSection title="Operations">
          {FEATURES.filter((f) =>
            ["products", "suppliers", "orders", "customers", "inventory", "shipments", "returns"].includes(f.slug),
          ).map((f) => (
            <NavLink
              key={f.slug}
              href={`/${f.slug}`}
              icon={f.icon}
              label={f.name}
              active={isActive(`/${f.slug}`)}
            />
          ))}
        </NavSection>

        <NavSection title="Growth">
          {FEATURES.filter((f) =>
            ["channels", "campaigns", "pricing-rules", "reviews"].includes(f.slug),
          ).map((f) => (
            <NavLink
              key={f.slug}
              href={`/${f.slug}`}
              icon={f.icon}
              label={f.name}
              active={isActive(`/${f.slug}`)}
            />
          ))}
        </NavSection>

        <NavSection title="AI Center" highlight>
          <NavLink href="/ai" icon="Sparkles" label="All AI Tools" active={path === "/ai"} />
          <NavLink href="/profit-leak" icon="BadgeDollarSign" label="Profit Leak Scanner" active={path === "/profit-leak"} />
          {AI_TOOLS.slice(0, 6).map((t) => (
            <NavLink
              key={t.slug}
              href={`/ai/${t.slug}`}
              icon={t.icon}
              label={t.name}
              active={path === `/ai/${t.slug}`}
              dim
            />
          ))}
          <Link
            href="/ai"
            className="block text-[11px] text-brand-300 hover:text-brand-200 pl-9 mt-1"
          >
            + see all {AI_TOOLS.length} AI tools →
          </Link>
        </NavSection>
      </nav>

      <div className="border-t border-slate-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 grid place-items-center font-semibold text-sm">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-sm leading-tight">{userName}</div>
            <div className="text-[11px] text-slate-400">admin</div>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-100" title="Logout">
          <Icon name="LogOut" className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

function NavSection({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <div className={clsx(
        "px-2 mb-1 text-[10px] uppercase tracking-widest font-semibold",
        highlight ? "text-brand-300" : "text-slate-500",
      )}>{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href, icon, label, active, dim,
}: { href: string; icon: string; label: string; active: boolean; dim?: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition",
        active
          ? "bg-brand-600 text-white"
          : dim
            ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            : "text-slate-200 hover:bg-slate-800",
      )}
    >
      <Icon name={icon} className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
