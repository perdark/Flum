"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, Heart, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { CartIcon } from "./CartIcon";
import { CurrencySelector } from "./CurrencySelector";
import { AccountMenu } from "./AccountMenu";
import { PriceDropBell } from "./PriceDropBell";
import type { StoreCategory } from "@/lib/store-queries";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/lib/customer-context";

function MobileCategoryTree({
  categories,
  onPick,
  depth = 0,
}: {
  categories: StoreCategory[];
  onPick: () => void;
  depth?: number;
}) {
  return (
    <>
      {categories.map((node) => (
        <div key={node.id}>
          <Link
            href={`/store/categories/${node.slug}`}
            onClick={onPick}
            className={cn(
              "block rounded-lg py-1.5 text-sm hover:bg-secondary",
              depth === 0 ? "px-3 font-semibold text-foreground" : "px-3 text-muted-foreground",
            )}
          >
            {node.name}
          </Link>
          {node.children.length > 0 && (
            <div className="ml-2 border-l border-border pl-2">
              <MobileCategoryTree categories={node.children} onPick={onPick} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function StoreHeader() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { customer, refresh } = useCustomer();

  useEffect(() => {
    fetch("/api/store/categories")
      .then((r) => r.json())
      .then((data: { success?: boolean; data?: StoreCategory[] }) => {
        if (data.success && Array.isArray(data.data)) setCategories(data.data);
      })
      .catch(() => {});
  }, []);

  async function signOutFromMobile() {
    await fetch("/api/store/auth/logout", { method: "POST", credentials: "include" });
    await refresh();
    setMobileOpen(false);
  }

  useEffect(() => {
    lastScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y < 48) {
        setHeaderHidden(false);
        return;
      }
      if (delta > 8) setHeaderHidden(true);
      else if (delta < -8) setHeaderHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md transition-transform duration-300 ease-out will-change-transform",
        headerHidden && "-translate-y-full pointer-events-none",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[3.5rem] items-center gap-3 py-2">
          <Logo href="/store" variant="full" className="shrink-0" />

          <SearchBar className="min-w-0 flex-1" />

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <CurrencySelector />
            <ThemeToggle />
            <AccountMenu />
            <PriceDropBell />
            <Link
              href="/store/account/wishlist"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary"
              aria-label="Wishlist"
            >
              <Heart className="h-4 w-4" />
            </Link>
            <CartIcon />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card md:hidden"
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {customer ? (
                <>
                  <Link
                    href="/store/account"
                    onClick={() => setMobileOpen(false)}
                    className="mr-auto text-sm font-medium text-primary"
                  >
                    My account
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOutFromMobile()}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/store/login"
                    onClick={() => setMobileOpen(false)}
                    className="mr-auto text-sm font-medium text-primary"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/store/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Register
                  </Link>
                </>
              )}
              <CurrencySelector inline />
              <ThemeToggle />
              <PriceDropBell onNavigate={() => setMobileOpen(false)} />
              <Link
                href="/store/account/wishlist"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary"
                aria-label="Wishlist"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <CartIcon onNavigate={() => setMobileOpen(false)} />
            </div>
            <nav className="max-h-[50vh] space-y-1 overflow-y-auto">
              <MobileCategoryTree categories={categories} onPick={() => setMobileOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
