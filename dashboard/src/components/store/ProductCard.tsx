"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Eye } from "lucide-react";
import { cn, calculateDiscountPercentage, formatCurrency } from "@/lib/utils";
import { RatingStars } from "@/components/ui/rating-stars";
import { PlatformBadge } from "@/components/store/PlatformBadge";
import { DeliveryBadge } from "@/components/store/DeliveryBadge";
import { useCart } from "@/lib/cart-store";
import { useStoreCurrency } from "@/lib/store-currency";
import { useCustomer } from "@/lib/customer-context";
import { useQuickView } from "@/lib/quick-view-store";
import type { StoreProduct } from "@/lib/store-queries";

interface ProductCardProps {
  product: StoreProduct;
  className?: string;
}

function tagLabel(product: StoreProduct, group: string): string | null {
  const row = product.tags.find((t) => t.tagGroup === group);
  return row?.tag?.trim() ? row.tag : null;
}

const BULK_QTY = [1, 5, 10, 25, 50] as const;

export function ProductCard({ product, className }: ProductCardProps) {
  const { addProduct } = useCart();
  const { code: currency, convert } = useStoreCurrency();
  const { isMerchant } = useCustomer();
  const { open: openQuickView } = useQuickView();
  const [bulkQty, setBulkQty] = useState<(typeof BULK_QTY)[number]>(1);
  const [wishlisted, setWishlisted] = useState(false);
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.basePrice;
  const pct = hasDiscount
    ? calculateDiscountPercentage(product.compareAtPrice!, product.basePrice)
    : 0;

  const platform =
    tagLabel(product, "platform") ??
    product.category?.name ??
    null;
  const region = tagLabel(product, "region");

  const imgUrl = product.image?.url ?? null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addProduct({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: imgUrl,
      price: product.basePrice,
      quantity: isMerchant ? bulkQty : 1,
    });
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn("group relative", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card transition-[transform,box-shadow] duration-300",
          "hover:scale-[1.02] hover:shadow-[var(--store-glow)]",
        )}
      >
        <Link href={`/store/products/${product.slug}`} className="block">
          <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
            {product.image ? (
              <img
                src={product.image.url}
                alt={product.image.alt || product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            <div className="absolute left-2 top-2 z-[1] flex flex-col gap-1">
              {product.isBundle && (
                <div className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 shadow-md">
                  Bundle
                </div>
              )}
              {hasDiscount && (
                <div className="rounded-md bg-[var(--store-discount)] px-2 py-1 text-xs font-extrabold text-[var(--brand-foreground)] shadow-md">
                  -{pct}%
                </div>
              )}
            </div>

            <div className="absolute right-2 top-2 flex flex-col gap-1.5">
              <button
                type="button"
                aria-pressed={wishlisted}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWishlisted((v) => !v);
                }}
              >
                <Heart
                  className={cn("h-4 w-4", wishlisted && "fill-destructive text-destructive")}
                />
              </button>
              <button
                type="button"
                aria-label="Quick view"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm opacity-0 transition-all group-hover:opacity-100 hover:bg-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openQuickView(product.slug);
                }}
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-between gap-1.5 bg-gradient-to-t from-background/90 to-transparent px-2 pb-2 pt-8">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {platform ? <PlatformBadge label={platform} /> : null}
                {region ? (
                  <PlatformBadge label={region} className="max-w-[5.5rem] text-[9px]" />
                ) : null}
              </div>
              {product.inStock ? <DeliveryBadge className="shrink-0" /> : null}
            </div>

            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <span className="rounded-full bg-foreground/80 px-3 py-1 text-xs font-semibold text-background">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 p-3.5">
            {product.category && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {product.category.name}
              </p>
            )}
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>

            {product.isBundle &&
              product.bundleEconomics &&
              product.bundleEconomics.includedNames.length > 0 && (
                <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {product.bundleEconomics.includedNames.slice(0, 4).join(" · ")}
                  {product.bundleEconomics.includedNames.length > 4 &&
                    ` +${product.bundleEconomics.includedNames.length - 4}`}
                </p>
              )}

            {product.isBundle &&
              product.bundleEconomics &&
              product.bundleEconomics.savings > 0 && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Save {product.bundleEconomics.savingsPercent}% vs buying separately
                </p>
              )}

            <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(convert(product.basePrice), currency)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(convert(product.compareAtPrice!), currency)}
                  </span>
                  <span className="text-xs font-bold text-[var(--store-discount)]">{pct}% off</span>
                </>
              )}
            </div>

            {product.reviewCount > 0 && (
              <RatingStars
                rating={product.averageRating}
                count={product.reviewCount}
                showCount
                size="sm"
              />
            )}
          </div>
        </Link>

        {product.inStock && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full border-t border-border bg-card/95 p-2 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:pointer-events-auto max-sm:static max-sm:translate-y-0 max-sm:opacity-100">
            {isMerchant && (
              <div className="pointer-events-auto mb-2 flex items-center justify-center gap-2">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">Qty</span>
                <select
                  value={bulkQty}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setBulkQty(Number(e.target.value) as (typeof BULK_QTY)[number])}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  {BULK_QTY.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={handleAddToCart}
              className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ShoppingCart className="h-4 w-4" />
              {isMerchant ? "Add bulk to cart" : "Add to cart"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
