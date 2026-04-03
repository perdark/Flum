"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, type ReactNode } from "react";
import { DollarSign } from "lucide-react";
import type { Permission } from "@/types";
import { PERMISSIONS } from "@/types";

interface SidebarProps {
  userRole: "admin" | "staff";
  permissions: Permission[];
}

type NavEntry = {
  href: string;
  label: string;
  icon: ReactNode;
  permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
};

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function Sidebar({ userRole, permissions }: SidebarProps) {
  const pathname = usePathname() || "";
  const userPermissions = permissions;

  const navSections: Array<{
    id: string;
    label: string;
    defaultOpen: boolean;
    items: NavEntry[];
  }> = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        defaultOpen: true,
        items: [
          {
            href: "/dashboard",
            label: "Overview",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_ANALYTICS,
          },
          {
            href: "/dashboard/analytics",
            label: "Analytics",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_ANALYTICS,
          },
        ],
      },
      {
        id: "inventory",
        label: "Inventory",
        defaultOpen: true,
        items: [
          {
            href: "/dashboard/inventory",
            label: "Stock & batches",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_INVENTORY,
          },
          {
            href: "/dashboard/inventory/add",
            label: "Add stock batch",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_INVENTORY,
          },
          {
            href: "/dashboard/inventory/templates",
            label: "Templates",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_INVENTORY,
          },
          {
            href: "/dashboard/inventory/search",
            label: "Search",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_INVENTORY,
          },
          {
            href: "/dashboard/costs",
            label: "Costs & Debts",
            icon: <DollarSign className="w-5 h-5" strokeWidth={2} />,
            permission: PERMISSIONS.MANAGE_INVENTORY,
          },
        ],
      },
      {
        id: "catalog",
        label: "Catalog",
        defaultOpen: true,
        items: [
          {
            href: "/dashboard/products",
            label: "Products",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_PRODUCTS,
          },
          {
            href: "/dashboard/products/relations",
            label: "Product links",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_PRODUCTS,
          },
          {
            href: "/dashboard/categories",
            label: "Categories",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_PRODUCTS,
          },
          {
            href: "/dashboard/currencies",
            label: "Currencies",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_SETTINGS,
          },
        ],
      },
      {
        id: "sales",
        label: "Sales",
        defaultOpen: true,
        items: [
          {
            href: "/dashboard/orders",
            label: "Orders",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_ORDERS,
          },
          {
            href: "/dashboard/manual-sell",
            label: "Manual sell",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            permission: PERMISSIONS.PROCESS_ORDERS,
          },
        ],
      },
      {
        id: "admin",
        label: "Administration",
        defaultOpen: false,
        items: [
          {
            href: "/dashboard/users",
            label: "Users",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_ORDERS,
          },
          {
            href: "/dashboard/reviews",
            label: "Reviews",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_PRODUCTS,
          },
          {
            href: "/dashboard/coupons",
            label: "Coupons",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_COUPONS,
          },
          {
            href: "/dashboard/offers",
            label: "Special offers",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_OFFERS,
          },
          {
            href: "/dashboard/staff",
            label: "Staff",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_STAFF,
          },
          {
            href: "/dashboard/activity-logs",
            label: "Activity logs",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
            permission: PERMISSIONS.VIEW_ACTIVITY_LOGS,
          },
          {
            href: "/dashboard/settings",
            label: "Settings",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            permission: PERMISSIONS.MANAGE_SETTINGS,
          },
        ],
      },
    ],
    []
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((s) => {
      initial[s.id] = s.defaultOpen;
    });
    return initial;
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const canSell = userPermissions.includes(PERMISSIONS.PROCESS_ORDERS);
  const canInventory = userPermissions.includes(PERMISSIONS.MANAGE_INVENTORY);
  const canOrders = userPermissions.includes(PERMISSIONS.VIEW_ORDERS);

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-sidebar via-sidebar to-muted/20 border-r border-border text-sidebar-foreground min-h-screen p-4 flex flex-col">
      <div className="mb-5 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20 ring-2 ring-background">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">Fulmen Empire</h1>
            <p className="text-muted-foreground text-xs capitalize">{userRole} · Console</p>
          </div>
        </div>
      </div>

      {(canSell || canInventory || canOrders) && (
        <div className="mb-5 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
            Fast lane
          </p>
          <div className="grid grid-cols-2 gap-2">
            {canSell && (
              <Link
                href="/dashboard/manual-sell"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-all ${
                  pathname?.startsWith("/dashboard/manual-sell")
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Sell</span>
              </Link>
            )}
            {canInventory && (
              <Link
                href="/dashboard/inventory"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-all ${
                  pathname?.startsWith("/dashboard/inventory")
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Stock</span>
              </Link>
            )}
            {canOrders && (
              <Link
                href="/dashboard/orders"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-all ${
                  pathname?.startsWith("/dashboard/orders")
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Orders</span>
              </Link>
            )}
            {canInventory && (
              <Link
                href="/dashboard/inventory/search"
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-all ${
                  pathname?.startsWith("/dashboard/inventory/search")
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Search</span>
              </Link>
            )}
          </div>
        </div>
      )}

      <nav className="space-y-2 flex-1 overflow-y-auto min-h-0">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            userPermissions.includes(item.permission)
          );
          if (visibleItems.length === 0) return null;

          const open = openSections[section.id] ?? true;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {section.label}
                <Chevron open={open} />
              </button>
              {open && (
                <div className="mt-1 space-y-0.5 pl-0">
                  {visibleItems.map((item) => {
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          active
                            ? "bg-primary/10 text-primary font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Fulmen Empire
        </p>
      </div>
    </aside>
  );
}
