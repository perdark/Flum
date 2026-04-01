"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const ROUTE_META: { match: string; title: string; eyebrow: string }[] = [
  { match: "/dashboard/manual-sell", title: "Manual Sell", eyebrow: "Point of sale" },
  { match: "/dashboard/inventory", title: "Inventory", eyebrow: "Stock & fulfillment" },
  { match: "/dashboard/orders", title: "Orders", eyebrow: "Sales pipeline" },
  { match: "/dashboard/products", title: "Products", eyebrow: "Catalog" },
  { match: "/dashboard/analytics", title: "Analytics", eyebrow: "Reports" },
  { match: "/dashboard/categories", title: "Categories", eyebrow: "Catalog" },
  { match: "/dashboard/settings", title: "Settings", eyebrow: "Administration" },
  { match: "/dashboard/staff", title: "Staff", eyebrow: "Team" },
  { match: "/dashboard/users", title: "Users", eyebrow: "Accounts" },
  { match: "/dashboard/coupons", title: "Coupons", eyebrow: "Promotions" },
  { match: "/dashboard/offers", title: "Offers", eyebrow: "Promotions" },
  { match: "/dashboard/reviews", title: "Reviews", eyebrow: "Moderation" },
  { match: "/dashboard/activity-logs", title: "Activity", eyebrow: "Audit" },
];

function resolveMeta(pathname: string) {
  const sorted = [...ROUTE_META].sort((a, b) => b.match.length - a.match.length);
  for (const r of sorted) {
    if (pathname === r.match || pathname.startsWith(`${r.match}/`)) {
      return r;
    }
  }
  if (pathname === "/dashboard") {
    return { title: "Overview", eyebrow: "Today at a glance" };
  }
  return { title: "Dashboard", eyebrow: "Fulmen Empire" };
}

const QUICK_LINKS = [
  { href: "/dashboard/manual-sell", label: "Sell", short: "POS", icon: "bolt" as const },
  { href: "/dashboard/inventory", label: "Stock", short: "Inv", icon: "box" as const },
  { href: "/dashboard/orders", label: "Orders", short: "Ord", icon: "cart" as const },
  { href: "/dashboard/inventory/search", label: "Find", short: "⌕", icon: "search" as const },
];

function QuickIcon({ name }: { name: (typeof QUICK_LINKS)[number]["icon"] }) {
  const cls = "w-4 h-4 shrink-0";
  switch (name) {
    case "bolt":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "box":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      );
    case "cart":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
  }
}

export function DashboardHeader({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname() || "";
  const meta = resolveMeta(pathname);

  return (
    <header className="dashboard-header border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 shadow-[0_1px_0_0_rgba(15,23,42,0.06)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.eyebrow}</p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">{meta.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Welcome back, <span className="text-foreground font-medium">{userName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav
            className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1"
            aria-label="Quick navigation"
          >
            {QUICK_LINKS.map((q) => {
              const active = pathname === q.href || pathname.startsWith(`${q.href}/`);
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all sm:px-3 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                  title={q.label}
                >
                  <QuickIcon name={q.icon} />
                  <span className="hidden sm:inline">{q.label}</span>
                  <span className="sm:hidden">{q.short}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto lg:ml-0">
            <ThemeToggle />

            <div className="hidden sm:block text-right leading-tight">
              <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{userName}</p>
              <p className="text-[10px] uppercase tracking-wide text-brand">{userRole}</p>
            </div>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <span className="text-white font-semibold text-sm">{userName.charAt(0).toUpperCase()}</span>
            </div>

            <form action="/api/auth/logout" method="POST" className="hidden sm:block">
              <button
                type="submit"
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-accent transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
