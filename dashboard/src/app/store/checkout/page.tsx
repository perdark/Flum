"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShoppingBag, Zap, CreditCard } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useCustomer } from "@/lib/customer-context";
import { useStoreCurrency } from "@/lib/store-currency";
import { formatCurrency, cn } from "@/lib/utils";

const inputClass = cn(
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  "transition-colors",
);

export default function CheckoutPage() {
  const router = useRouter();
  const {
    lines,
    subtotal,
    couponCode,
    couponDiscount,
    clear,
  } = useCart();
  const { code: currency, convert } = useStoreCurrency();
  const { customer } = useCustomer();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [useDifferentContact, setUseDifferentContact] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("zain_cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Math.max(0, subtotal - couponDiscount);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const chosenEmail = (useDifferentContact ? email : customer?.email || email).trim();
    const chosenName = (useDifferentContact ? name : customer?.name || name).trim();
    if (!chosenEmail) {
      setError("Email is required");
      return;
    }
    if (!lines.length) {
      setError("Your cart is empty");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: chosenEmail,
          customerName: chosenName || undefined,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          couponCode: couponCode || undefined,
          paymentMethod,
          currency,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || "Checkout failed");
        return;
      }
      clear();
      const t = encodeURIComponent(j.data.checkoutToken);
      router.push(`/store/order/${j.data.orderNumber}?t=${t}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </span>
        <h1 className="text-xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add some products before checking out.</p>
        <Link
          href="/store/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">Digital delivery — no shipping address needed.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Left: form */}
        <div className="space-y-5 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Contact</h2>
            {customer && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                Signed in as <span className="font-medium">{customer.email}</span>
                <label className="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useDifferentContact}
                    onChange={(e) => setUseDifferentContact(e.target.checked)}
                    className="accent-primary"
                  />
                  <span>Use different email/name for this order</span>
                </label>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={customer && !useDifferentContact ? customer.email : "you@example.com"}
                  value={useDifferentContact ? email : customer?.email || email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={Boolean(customer && !useDifferentContact)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Name{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder={customer && !useDifferentContact ? customer.name : "Your name"}
                  value={useDifferentContact ? name : customer?.name || name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={Boolean(customer && !useDifferentContact)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Payment method</h2>
            <div className="space-y-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  paymentMethod === "zain_cash"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary",
                )}
              >
                <input
                  type="radio"
                  name="pay"
                  className="accent-primary"
                  checked={paymentMethod === "zain_cash"}
                  onChange={() => setPaymentMethod("zain_cash")}
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">ZainCash</p>
                  <p className="text-xs text-muted-foreground">Primary payment method</p>
                </div>
              </label>

              <label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border p-4 opacity-50">
                <input type="radio" name="pay" disabled className="accent-primary" />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Card</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing order…
              </>
            ) : (
              "Place order"
            )}
          </button>
        </div>

        {/* Right: summary */}
        <aside className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Order summary</h2>
            <ul className="space-y-3 text-sm">
              {lines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-foreground">
                    {l.name}
                    <span className="text-muted-foreground"> × {l.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatCurrency(convert(l.price * l.quantity), currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
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
          </div>
        </aside>
      </form>
    </div>
  );
}
