"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OrderBuyAgainButton({
  orderNumber,
  className,
}: {
  orderNumber: string;
  className?: string;
}) {
  const { addProduct } = useCart();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/store/account/orders/${encodeURIComponent(orderNumber)}/buy-again`,
        { method: "POST" },
      );
      const j = await res.json();
      if (!res.ok || !j.success) {
        toast.error(j.error || "Could not load order items");
        return;
      }

      const lines = j.data.lines as Array<{
        productId: string;
        slug: string;
        name: string;
        imageUrl: string | null;
        quantity: number;
        currentPrice: number;
        orderUnitPrice: number;
        inStock: boolean;
        priceChanged: boolean;
      }>;
      const warnings: string[] = j.data.warnings ?? [];

      let added = 0;
      for (const line of lines) {
        if (!line.inStock) continue;
        const q = line.quantity;
        addProduct({
          productId: line.productId,
          slug: line.slug,
          name: line.name,
          imageUrl: line.imageUrl,
          price: line.currentPrice,
          quantity: q,
        });
        added += 1;
        if (line.priceChanged) {
          toast(`${line.name}: was ${line.orderUnitPrice.toFixed(2)}, now ${line.currentPrice.toFixed(2)} each`);
        }
      }

      for (const w of warnings) toast(w);

      if (added === 0) {
        toast.error("Nothing was added — check stock or availability.");
      } else {
        toast.success(`Added ${added} product${added === 1 ? "" : "s"} to cart`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onClick();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50",
        className,
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Buy again
    </button>
  );
}
