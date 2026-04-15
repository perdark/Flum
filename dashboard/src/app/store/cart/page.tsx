"use client";

import Link from "next/link";
import { Trash2, ShoppingBag, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useStoreCurrency } from "@/lib/store-currency";
import { formatCurrency } from "@/lib/utils";
import { AlsoBought } from "@/components/store/AlsoBought";

export default function StoreCartPage() {
  const { lines, setQuantity, removeLine, clear } = useCart();
  const { code: currency, convert } = useStoreCurrency();

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </span>
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse the store and add digital products here.
        </p>
        <Link
          href="/store/products"
          className="mt-8 inline-flex items-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="h-5 w-5 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">
            Cart
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({lines.reduce((s, l) => s + l.quantity, 0)} items)
            </span>
          </h1>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Item list */}
        <div className="lg:col-span-2">
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <Link href={`/store/products/${line.slug}`} className="shrink-0">
                  {line.imageUrl ? (
                    <img
                      src={line.imageUrl}
                      alt={line.name}
                      className="h-20 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-14 items-center justify-center rounded-xl bg-secondary text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/store/products/${line.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(convert(line.price), currency)} each
                  </p>
                  {/* Qty stepper */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setQuantity(line.id, Math.max(1, line.quantity - 1))}
                        disabled={line.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(convert(line.price * line.quantity), currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary sidebar */}
        <div>
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({lines.reduce((s, l) => s + l.quantity, 0)} items)</span>
                <span>{formatCurrency(convert(subtotal), currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(convert(subtotal), currency)}</span>
              </div>
            </div>

            <Link
              href="/store/checkout"
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/store/products"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>

      {/* You might also like */}
      {lines[0] && (
        <AlsoBought
          productId={lines[0].productId}
          title="You Might Also Like"
          className="mt-12 border-t border-border pt-10"
        />
      )}
    </div>
  );
}
