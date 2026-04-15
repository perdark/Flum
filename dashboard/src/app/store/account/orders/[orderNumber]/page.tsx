import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import { getCustomerOrderDetail, type CustomerOrderLineItem } from "@/lib/store-queries";
import { cn } from "@/lib/utils";
import { ChevronLeft, Clock, Package } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/15 text-green-600 dark:text-green-400",
  cancelled: "bg-destructive/15 text-destructive",
};

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login");

  const { orderNumber } = await params;
  const data = await getCustomerOrderDetail(customer.id, decodeURIComponent(orderNumber));
  if (!data) notFound();

  const statusKey = (data.order.status || "pending").toLowerCase();
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.pending;
  const createdDate = data.order.createdAt?.toISOString?.().slice(0, 10) ?? "";
  const fulfillmentDone =
    String(data.order.fulfillmentStatus || "").toLowerCase() === "delivered" ||
    statusKey === "completed";
  const emailQ = encodeURIComponent(data.order.customerEmail || "");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/store/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order number
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold text-foreground">
              {data.order.orderNumber}
            </h1>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              statusStyle,
            )}
          >
            {statusKey}
          </span>
        </div>

        {createdDate && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Placed on {createdDate}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="mt-5 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
        </div>
        <ul className="divide-y divide-border">
          {data.items.map((it: CustomerOrderLineItem) => (
            <li key={it.id} className="px-5 py-3.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground">
                  {it.productName}{" "}
                  <span className="text-muted-foreground">× {it.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold text-foreground">{it.subtotal}</span>
              </div>
              {it.customerDelivery.length > 0 && (
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
          <span className="text-lg font-bold text-foreground">{data.order.total}</span>
        </div>
      </div>

      {!fulfillmentDone && (
        <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Staff is preparing your order. You are signed in — refresh this page later, or check email. Invite another
          device:{" "}
          <Link className="font-medium underline" href={`/store/register?email=${emailQ}`}>
            register
          </Link>{" "}
          if you have not yet.
        </p>
      )}
      {fulfillmentDone && (
        <p className="mt-5 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          Your customer-visible delivery fields are shown above per line.
        </p>
      )}
    </div>
  );
}
