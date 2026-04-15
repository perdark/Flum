"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingCart, Check, Loader2, Eye } from "lucide-react";
import { cn, calculateDiscountPercentage, formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { useStoreCurrency } from "@/lib/store-currency";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/store/PlatformBadge";
import { DeliveryBadge } from "@/components/store/DeliveryBadge";

interface QuickViewModalProps {
  slug: string | null;
  onClose: () => void;
}

interface QuickProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  isNew: boolean;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  images: Array<{ id: string; url: string; alt: string | null }>;
  optionGroups: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; value: string }>;
  }>;
  variants: Array<{
    id: string;
    optionCombination: Record<string, string>;
    price: number;
    compareAtPrice: number | null;
    inStock: boolean;
    isDefault: boolean;
  }>;
  tags: Array<{ tag: string; tagGroup: string }>;
}

export function QuickViewModal({ slug, onClose }: QuickViewModalProps) {
  const [product, setProduct] = useState<QuickProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const { addProduct } = useCart();
  const { code: currency, convert } = useStoreCurrency();

  // Fetch product data
  useEffect(() => {
    if (!slug) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAdded(false);
    setQty(1);
    setSelectedImageIdx(0);
    (async () => {
      try {
        const res = await fetch(`/api/store/products/${slug}`);
        const j = await res.json();
        if (!cancelled && j.success) {
          const p = j.data as QuickProduct;
          setProduct(p);
          // Init variant selections from default
          const def = p.variants.find((v) => v.isDefault) || p.variants[0];
          if (def) {
            const init: Record<string, string> = {};
            for (const g of p.optionGroups) {
              init[g.name] = def.optionCombination[g.name] || "";
            }
            setSelections(init);
          } else {
            setSelections({});
          }
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Lock body scroll
  useEffect(() => {
    if (slug) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [slug]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Matched variant
  const matchedVariant =
    product && product.optionGroups.length > 0
      ? product.variants.find((v) =>
          product.optionGroups.every(
            (g) => v.optionCombination[g.name] === selections[g.name],
          ),
        ) ?? null
      : null;

  const displayPrice = matchedVariant?.price ?? product?.basePrice ?? 0;
  const displayCompare =
    matchedVariant?.compareAtPrice ?? product?.compareAtPrice ?? null;
  const inStock = matchedVariant ? matchedVariant.inStock : (product?.inStock ?? false);

  const hasDiscount = displayCompare && displayCompare > displayPrice;
  const discountPct = hasDiscount
    ? calculateDiscountPercentage(displayCompare!, displayPrice)
    : 0;

  const platformTag = product?.tags.find((t) => t.tagGroup === "platform");
  const regionTag = product?.tags.find((t) => t.tagGroup === "region");

  const handleAddToCart = () => {
    if (!product || !inStock) return;
    addProduct({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      price: displayPrice,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <AnimatePresence>
      {slug && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="py-24 text-center text-muted-foreground">
                Failed to load product details.
              </div>
            )}

            {product && !loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                {/* Left: Image */}
                <div className="relative aspect-[3/4] sm:aspect-auto bg-secondary">
                  {product.images.length > 0 ? (
                    <>
                      <img
                        src={product.images[selectedImageIdx]?.url ?? product.images[0].url}
                        alt={product.images[selectedImageIdx]?.alt || product.name}
                        className="h-full w-full object-cover"
                      />
                      {product.images.length > 1 && (
                        <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1.5">
                          {product.images.slice(0, 5).map((img, i) => (
                            <button
                              key={img.id}
                              onClick={() => setSelectedImageIdx(i)}
                              className={cn(
                                "h-2 w-2 rounded-full transition-all",
                                i === selectedImageIdx
                                  ? "bg-primary scale-125"
                                  : "bg-white/50 hover:bg-white/80",
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full min-h-[300px] w-full items-center justify-center text-muted-foreground">
                      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Discount badge */}
                  {hasDiscount && (
                    <div className="absolute left-3 top-3 rounded-md bg-[var(--store-discount)] px-2.5 py-1 text-xs font-extrabold text-gray-900 shadow">
                      -{discountPct}%
                    </div>
                  )}
                </div>

                {/* Right: Info */}
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh] sm:max-h-none">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {product.isNew && <Badge variant="new" size="sm">New</Badge>}
                    {platformTag && <PlatformBadge label={platformTag.tag} />}
                    {regionTag && <PlatformBadge label={regionTag.tag} />}
                  </div>

                  {/* Name */}
                  <h2 className="text-lg font-bold leading-snug">{product.name}</h2>

                  {/* Rating */}
                  {product.reviewCount > 0 && (
                    <RatingStars
                      rating={product.averageRating}
                      count={product.reviewCount}
                      showCount
                      size="sm"
                    />
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">
                      {formatCurrency(convert(displayPrice), currency)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(convert(displayCompare!), currency)}
                        </span>
                        <span className="text-xs font-bold text-[var(--store-discount)]">
                          {discountPct}% off
                        </span>
                      </>
                    )}
                  </div>

                  {/* Stock + Delivery */}
                  <div className="flex items-center gap-3">
                    {inStock ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        In Stock
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        Out of Stock
                      </span>
                    )}
                    {inStock && <DeliveryBadge />}
                  </div>

                  {/* Variant selector */}
                  {product.optionGroups.length > 0 && product.variants.length > 1 && (
                    <div className="space-y-3">
                      {product.optionGroups.map((group) => (
                        <div key={group.id}>
                          <label className="text-xs font-medium mb-1.5 block">
                            {group.name}
                            {selections[group.name] && (
                              <span className="text-muted-foreground font-normal ml-1">
                                — {selections[group.name]}
                              </span>
                            )}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {group.values.map((val) => {
                              const isSelected = selections[group.name] === val.value;
                              return (
                                <button
                                  key={val.id}
                                  onClick={() =>
                                    setSelections((prev) => ({
                                      ...prev,
                                      [group.name]: val.value,
                                    }))
                                  }
                                  className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary/50",
                                  )}
                                >
                                  {val.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity + Add to Cart */}
                  {inStock && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Qty</span>
                        <div className="flex items-center rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            className="px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
                          >
                            -
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty((q) => q + 1)}
                            className="px-2.5 py-1.5 text-sm font-medium hover:bg-secondary"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                          added
                            ? "bg-success text-white"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                        )}
                      >
                        {added ? (
                          <>
                            <Check className="h-4 w-4" />
                            Added!
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* View Full Details */}
                  <Link
                    href={`/store/products/${product.slug}`}
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <Eye className="h-4 w-4" />
                    View Full Details
                  </Link>

                  {/* Description preview */}
                  {product.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
