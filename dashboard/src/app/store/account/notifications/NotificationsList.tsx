"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, TrendingDown } from "lucide-react";
import { useStoreCurrency } from "@/lib/store-currency";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Alert = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  priceAtSubscribe: number;
  currentPrice: number;
  dropped: boolean;
  dropAmount: number;
  dropPercent: number;
  createdAt: string;
};

export function NotificationsList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { code: currency, convert } = useStoreCurrency();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/store/price-alerts", { cache: "no-store" });
      const j = await res.json();
      if (j.success) setAlerts(j.data);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/store/price-alerts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((a) => a.filter((x) => x.id !== id));
      toast.success("Alert removed");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Bell className="h-7 w-7 text-muted-foreground" />
        </span>
        <h2 className="text-base font-semibold text-foreground">No price alerts yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap "Notify me on price drop" on any product page to track it.
        </p>
        <Link
          href="/store/products"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const triggered = alerts.filter((a) => a.dropped);
  const watching = alerts.filter((a) => !a.dropped);

  return (
    <div className="space-y-8">
      {triggered.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
            Price dropped ({triggered.length})
          </h2>
          <ul className="space-y-3">
            {triggered.map((a) => (
              <AlertRow key={a.id} alert={a} currency={currency} convert={convert} onRemove={remove} highlight />
            ))}
          </ul>
        </section>
      )}

      {watching.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Watching ({watching.length})
          </h2>
          <ul className="space-y-3">
            {watching.map((a) => (
              <AlertRow key={a.id} alert={a} currency={currency} convert={convert} onRemove={remove} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  currency,
  convert,
  onRemove,
  highlight,
}: {
  alert: Alert;
  currency: string;
  convert: (n: number) => number;
  onRemove: (id: string) => void;
  highlight?: boolean;
}) {
  return (
    <li
      className={
        "flex gap-4 rounded-2xl border p-4 shadow-sm transition-colors " +
        (highlight
          ? "border-green-500/40 bg-green-500/5"
          : "border-border bg-card")
      }
    >
      <Link href={`/store/products/${alert.productSlug}`} className="shrink-0">
        {alert.imageUrl ? (
          <img
            src={alert.imageUrl}
            alt=""
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
          href={`/store/products/${alert.productSlug}`}
          className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
        >
          {alert.productName}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">
            Subscribed at {formatCurrency(convert(alert.priceAtSubscribe), currency)}
          </span>
          <span
            className={
              "font-semibold " +
              (alert.dropped ? "text-green-600 dark:text-green-400" : "text-foreground")
            }
          >
            Now {formatCurrency(convert(alert.currentPrice), currency)}
          </span>
          {alert.dropped && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 font-semibold text-green-600 dark:text-green-400">
              −{alert.dropPercent}%
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start">
        <button
          type="button"
          onClick={() => onRemove(alert.id)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove alert"
          title="Stop tracking"
        >
          <BellOff className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
