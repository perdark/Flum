"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  className?: string;
}

export function PriceDropToggle({ productId, className }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/price-alerts", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) setLoading(false);
          return;
        }
        const j = await res.json();
        if (!cancelled && j.success) {
          setSubscribed(j.data.some((a: any) => a.productId === productId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function toggle() {
    setBusy(true);
    try {
      if (subscribed) {
        const res = await fetch(`/api/store/price-alerts?productId=${productId}`, { method: "DELETE" });
        if (res.ok) {
          setSubscribed(false);
          toast.success("Price alert removed");
        }
      } else {
        const res = await fetch("/api/store/price-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, source: "product" }),
        });
        if (res.status === 401) {
          toast.error("Sign in to get price drop alerts");
          return;
        }
        const j = await res.json();
        if (j.success) {
          setSubscribed(true);
          toast.success("We'll notify you on price drops");
        } else {
          toast.error(j.error || "Could not subscribe");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || busy}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
        subscribed
          ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
          : "border-border text-foreground hover:bg-secondary",
        (loading || busy) && "opacity-60",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {subscribed ? "Alerting on price drops" : "Notify me on price drop"}
    </button>
  );
}
