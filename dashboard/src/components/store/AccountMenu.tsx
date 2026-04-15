"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, UserPlus, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/lib/customer-context";

export function AccountMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { customer, loading, refresh, isMerchant } = useCustomer();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function signOut() {
    await fetch("/api/store/auth/logout", { method: "POST", credentials: "include" });
    await refresh();
    setOpen(false);
  }

  const label = customer
    ? isMerchant
      ? customer.businessName || "Business"
      : customer.name.split(" ")[0] || "Account"
    : "Account";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 max-w-[10rem] items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground hover:bg-secondary"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="truncate">{loading ? "…" : label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-52 rounded-xl border border-border bg-card py-1.5 shadow-xl"
        >
          {customer ? (
            <>
              {/* User info header */}
              <div className="border-b border-border px-3 pb-2.5 pt-2">
                <p className="text-xs font-semibold text-foreground truncate">
                  {customer.name || "Customer"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{customer.email}</p>
              </div>

              <Link
                href="/store/account"
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                My account
              </Link>
              <Link
                href="/store/account/orders"
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <span className="h-4 w-4 text-muted-foreground flex items-center">📦</span>
                Orders
              </Link>
              {isMerchant && (
                <Link
                  href="/store/account/business"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  onClick={() => setOpen(false)}
                >
                  <span className="h-4 w-4 text-muted-foreground flex items-center">🏢</span>
                  Business profile
                </Link>
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  onClick={() => void signOut()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/store/login"
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <LogIn className="h-4 w-4 text-muted-foreground" />
                Sign in
              </Link>
              <Link
                href="/store/register"
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Create account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
