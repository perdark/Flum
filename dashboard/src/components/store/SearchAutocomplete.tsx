"use client";

import Link from "next/link";
import { useStoreCurrency } from "@/lib/store-currency";
import { cn, formatCurrency, calculateDiscountPercentage } from "@/lib/utils";

export type SearchHit = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  compareAtPrice: number | null;
  image: { url: string; alt: string | null } | null;
  inStock: boolean;
};

export function SearchAutocomplete({
  results,
  loading,
  query,
  onPick,
  className,
}: {
  results: SearchHit[];
  loading: boolean;
  query: string;
  onPick?: () => void;
  className?: string;
}) {
  const { code, convert } = useStoreCurrency();

  if (query.trim().length < 2) return null;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-border bg-card py-2 shadow-xl",
        className,
      )}
    >
      {loading && (
        <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
      )}
      {!loading && results.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground">No products found.</p>
      )}
      {!loading &&
        results.map((p) => {
          const hasDisc = p.compareAtPrice != null && p.compareAtPrice > p.basePrice;
          const pct = hasDisc
            ? calculateDiscountPercentage(p.compareAtPrice!, p.basePrice)
            : 0;
          return (
            <Link
              key={p.id}
              href={`/store/products/${p.slug}`}
              onClick={() => onPick?.()}
              className="flex gap-3 px-3 py-2.5 hover:bg-secondary"
            >
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.image ? (
                  <img
                    src={p.image.url}
                    alt={p.image.alt || p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(convert(p.basePrice), code)}
                  </span>
                  {hasDisc && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(convert(p.compareAtPrice!), code)}
                      </span>
                      <span className="rounded bg-[var(--store-discount)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--store-discount)]">
                        -{pct}%
                      </span>
                    </>
                  )}
                  {!p.inStock && (
                    <span className="text-[10px] font-medium text-muted-foreground">Out of stock</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
    </div>
  );
}
