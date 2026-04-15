"use client";

import Link from "next/link";
import { X, Trash2, ShoppingBag, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useStoreCurrency } from "@/lib/store-currency";
import { formatCurrency, cn } from "@/lib/utils";

export function CartDrawer() {
  const {
    lines,
    drawerOpen,
    closeDrawer,
    setQuantity,
    removeLine,
    subtotal,
    couponCode,
    couponDiscount,
    setCouponCode,
    applyCoupon,
  } = useCart();
  const { code: currency, convert } = useStoreCurrency();

  const total = Math.max(0, subtotal - couponDiscount);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close cart"
        onClick={closeDrawer}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            <h2 className="text-base font-bold text-foreground">
              Your cart
              {lines.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {lines.reduce((s, l) => s + l.quantity, 0)}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">Your cart is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add something to get started.
              </p>
              <button
                type="button"
                onClick={closeDrawer}
                className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Browse products
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3 rounded-xl border border-border bg-background/50 p-3">
                  <Link href={`/store/products/${line.slug}`} onClick={closeDrawer} className="shrink-0">
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt=""
                        className="h-16 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/store/products/${line.slug}`}
                      className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                      onClick={closeDrawer}
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(convert(line.price), currency)} each
                    </p>
                    {/* Qty stepper */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(line.id, Math.max(1, line.quantity - 1))}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        disabled={line.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-xs font-semibold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(convert(line.price * line.quantity), currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — only when items present */}
        {lines.length > 0 && (
          <div className="border-t border-border p-4 space-y-3.5">
            {/* Coupon */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={couponCode ?? ""}
                onChange={(e) => setCouponCode(e.target.value || null)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => void applyCoupon()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Apply
              </button>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(convert(subtotal), currency)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(convert(couponDiscount), currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(convert(total), currency)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <Link
                href="/store/checkout"
                onClick={closeDrawer}
                className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Checkout
              </Link>
              <Link
                href="/store/cart"
                onClick={closeDrawer}
                className="flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                View full cart
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Continue shopping
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
