import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreOrderPublic } from "@/lib/store-queries";
import { CheckCircle2, Mail, Package, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/15 text-green-600 dark:text-green-400",
  cancelled: "bg-destructive/15 text-destructive",
};

export default async function StoreOrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderNumber } = await params;
  const { t } = await searchParams;
  const data = await getStoreOrderPublic(orderNumber, t ?? null);
  if (!data) notFound();

  const { order, items } = data;
  const statusKey = (order.status || "pending").toLowerCase();
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.pending;
  const fulfillmentDone =
    String(order.fulfillmentStatus || "").toLowerCase() === "delivered" ||
    statusKey === "completed";
  const emailQ = encodeURIComponent(order.customerEmail || "");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full",
            fulfillmentDone ? "bg-green-500/15 text-green-500" : "bg-amber-500/15 text-amber-600",
          )}
        >
          {fulfillmentDone ? <CheckCircle2 className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
        </span>
        <h1 className="mt-5 text-3xl font-bold text-foreground">
          {fulfillmentDone ? "Order confirmed!" : "Order received"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {fulfillmentDone
            ? "Thanks for your purchase. Your digital items are below."
            : "We received your order. Staff will complete fulfillment — this page updates when your items are ready."}
        </p>
      </div>

      {!fulfillmentDone && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium text-foreground">Wait for fulfillment</p>
          <p className="mt-1 text-muted-foreground">
            Sign in with the same email to see this order under your account and get updates when it completes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/store/login?next=${encodeURIComponent(`/store/account/orders/${order.orderNumber}`)}`}
              className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              href={`/store/register?email=${emailQ}`}
              className="inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order</p>
          <p className="font-mono text-lg font-bold text-foreground">{order.orderNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              statusStyle,
            )}
          >
            {statusKey}
          </span>
          {order.fulfillmentStatus && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Fulfillment: {String(order.fulfillmentStatus)}
            </span>
          )}
          {order.paymentStatus && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Payment: {order.paymentStatus}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Confirmation sent to <span className="font-medium text-foreground">{order.customerEmail}</span>.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
        </div>
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="px-5 py-3.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground">
                  {it.productName}{" "}
                  <span className="text-muted-foreground">× {it.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold text-muted-foreground">{it.subtotal}</span>
              </div>
              {Array.isArray(it.customerDelivery) && it.customerDelivery.length > 0 && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  {it.customerDelivery.map((row, j) => (
                    <div key={j} className="font-mono text-foreground">
                      {Object.entries(row).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k}:</span> {String(v)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">{order.total}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/store/account/orders"
          className="flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          View all orders
        </Link>
        <Link
          href="/store"
          className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
