"use client";

import { useState } from "react";
import { ShoppingCart, Zap, Check, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useCustomer } from "@/lib/customer-context";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    price: number;
    inStock: boolean;
  };
  variant?: {
    id: string;
    price: number;
    inStock: boolean;
  } | null;
  className?: string;
}

const BULK_QTY = [1, 5, 10, 25, 50] as const;

export function AddToCartButton({
  product,
  variant,
  className,
}: AddToCartButtonProps) {
  const { addProduct } = useCart();
  const { isMerchant } = useCustomer();
  const [qty, setQty] = useState(1);
  const [bulkQty, setBulkQty] = useState<(typeof BULK_QTY)[number]>(1);
  const [added, setAdded] = useState(false);

  const inStock = variant ? variant.inStock : product.inStock;
  const price = variant?.price ?? product.price;

  const handleAdd = () => {
    if (!inStock) return;
    const quantity = isMerchant ? bulkQty : qty;
    addProduct({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      price,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    const quantity = isMerchant ? bulkQty : qty;
    addProduct({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      price,
      quantity,
    });
    window.location.href = "/store/checkout";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quantity selector */}
      {inStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Quantity
          </span>
          {isMerchant ? (
            <select
              value={bulkQty}
              onChange={(e) =>
                setBulkQty(Number(e.target.value) as (typeof BULK_QTY)[number])
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
            >
              {BULK_QTY.map((q) => (
                <option key={q} value={q}>
                  {q} {q > 1 ? "units" : "unit"}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                -
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-semibold">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                +
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add to Cart */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!inStock}
        className={cn(
          "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-base font-semibold transition-all",
          inStock
            ? added
              ? "bg-success text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            : "cursor-not-allowed bg-secondary text-muted-foreground",
        )}
      >
        {added ? (
          <>
            <Check className="h-5 w-5" />
            Added to Cart
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            {!inStock
              ? "Out of Stock"
              : isMerchant
                ? "Add Bulk to Cart"
                : "Add to Cart"}
          </>
        )}
      </button>

      {/* Buy Now */}
      {inStock && (
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 py-3 text-base font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.98]"
        >
          <Zap className="h-5 w-5" />
          Buy Now
        </button>
      )}
    </div>
  );
}
