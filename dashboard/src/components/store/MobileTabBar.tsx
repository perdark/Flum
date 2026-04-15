"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useCustomer } from "@/lib/customer-context";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const pathname = usePathname();
  const { itemCount, openDrawer, drawerOpen } = useCart();
  const { customer } = useCustomer();

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("store-open-search"));
  };

  const homeActive = pathname === "/store";
  const shopActive =
    pathname.startsWith("/store/products") || pathname.startsWith("/store/categories");
  const cartActive = pathname.startsWith("/store/cart") || drawerOpen;
  const accountActive =
    pathname.startsWith("/store/login") ||
    pathname.startsWith("/store/register") ||
    pathname.startsWith("/store/account");

  const tab = (
    href: string,
    label: string,
    Icon: typeof Home,
    active: boolean,
    extra?: { badge?: number },
  ) => (
    <li className="flex-1">
      <Link
        href={href}
        className={cn("flex flex-col items-center py-2", active && "text-primary")}
      >
        <span className="relative inline-flex">
          <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
          {extra?.badge != null && extra.badge > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {extra.badge > 99 ? "99+" : extra.badge}
            </span>
          )}
        </span>
        <span
          className={cn(
            "mt-0.5 max-w-[4rem] truncate text-[10px] font-medium",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-between gap-1">
        {tab("/store", "Home", Home, homeActive)}
        {tab("/store/products", "Shop", LayoutGrid, shopActive)}
        <li className="flex-1">
          <button
            type="button"
            onClick={openSearch}
            className="flex w-full flex-col items-center py-2 text-foreground"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="mt-0.5 max-w-[4rem] truncate text-[10px] font-medium text-muted-foreground">
              Search
            </span>
          </button>
        </li>
        <li className="flex-1">
          <button
            type="button"
            onClick={() => openDrawer()}
            className={cn("flex w-full flex-col items-center py-2", cartActive && "text-primary")}
          >
            <span className="relative inline-flex">
              <ShoppingBag
                className={cn("h-5 w-5", cartActive ? "text-primary" : "text-muted-foreground")}
              />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </span>
            <span
              className={cn(
                "mt-0.5 max-w-[4rem] truncate text-[10px] font-medium",
                cartActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              Cart
            </span>
          </button>
        </li>
        {tab(customer ? "/store/account" : "/store/login", "Account", User, accountActive)}
      </ul>
    </nav>
  );
}
