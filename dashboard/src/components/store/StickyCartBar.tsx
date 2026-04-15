"use client";

import { useCallback, useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useCustomer } from "@/lib/customer-context";
import { useStoreCurrency } from "@/lib/store-currency";
import { formatCurrency, cn } from "@/lib/utils";

const BULK_QTY = [1, 5, 10, 25, 50] as const;

interface StickyCartBarProps {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    price: number;
    inStock: boolean;
  };
}

/**
 * Mobile-only fixed bar when the main add-to-cart block scrolls out of view.
 */
export function StickyCartBar({ product }: StickyCartBarProps) {
  const { addProduct } = useCart();
  const { isMerchant } = useCustomer();
  const { code: currency, convert } = useStoreCurrency();
  const [visible, setVisible] = useState(false);
  const [qty, setQty] = useState(1);
  const [bulkQty, setBulkQty] = useState<(typeof BULK_QTY)[number]>(5);

  useEffect(() => {
    const el = document.getElementById("product-main-add-to-cart");
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { root: null, rootMargin: "0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleAdd = useCallback(() => {
    if (!product.inStock) return;
    const quantity = isMerchant ? bulkQty : qty;
    addProduct({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      quantity,
    });
  }, [addProduct, product, isMerchant, bulkQty, qty]);

  if (!product.inStock) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[85] md:hidden",
        "bottom-[calc(3.75rem+env(safe-area-inset-bottom))]",
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div className="border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{product.name}</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(convert(product.price), currency)}
            </p>
            {isMerchant && (
              <select
                value={bulkQty}
                onChange={(e) =>
                  setBulkQty(Number(e.target.value) as (typeof BULK_QTY)[number])
                }
                className="mt-1 max-w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                aria-label="Bulk quantity"
              >
                {BULK_QTY.map((q) => (
                  <option key={q} value={q}>
                    Qty {q}
                  </option>
                ))}
              </select>
            )}
            {!isMerchant && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="rounded border border-border px-2 py-0.5"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-[1.25rem] text-center font-medium text-foreground">{qty}</span>
                <button
                  type="button"
                  className="rounded border border-border px-2 py-0.5"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
