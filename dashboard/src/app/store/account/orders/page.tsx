import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import { getOrdersForCustomer } from "@/lib/store-queries";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderBuyAgainButton } from "@/components/store/OrderBuyAgainButton";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/15 text-green-600 dark:text-green-400",
  cancelled: "bg-destructive/15 text-destructive",
};

export default async function AccountOrdersPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login?next=/store/account/orders");

  const rows = await getOrdersForCustomer(customer.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/store/account" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Account
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/store/products"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((o) => {
            const statusKey = (o.status || "pending").toLowerCase();
            const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.pending;
            const dateStr = o.createdAt?.toISOString?.().slice(0, 10) ?? "";
            return (
              <li key={o.id}>
                <div className="flex items-stretch gap-2 rounded-xl border border-border bg-card transition-colors hover:bg-secondary">
                  <Link
                    href={`/store/account/orders/${encodeURIComponent(o.orderNumber)}`}
                    className="group flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                      <Package className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {o.orderNumber}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            statusStyle,
                          )}
                        >
                          {statusKey}
                        </span>
                      </div>
                      {dateStr && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{dateStr}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-foreground">
                      {o.total} {o.currency || "USD"}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                  <div className="flex shrink-0 items-center border-l border-border px-2">
                    <OrderBuyAgainButton orderNumber={o.orderNumber} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
