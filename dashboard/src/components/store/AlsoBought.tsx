"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import type { StoreProduct } from "@/lib/store-queries";

interface AlsoBoughtProps {
  productId: string;
  /** Pre-fetched products from server (skips client fetch) */
  initial?: StoreProduct[];
  title?: string;
  className?: string;
}

export function AlsoBought({
  productId,
  initial,
  title = "Customers Also Bought",
  className,
}: AlsoBoughtProps) {
  const [products, setProducts] = useState<StoreProduct[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/store/also-bought?productId=${productId}`);
        const j = await res.json();
        if (!cancelled && j.success && Array.isArray(j.data)) {
          setProducts(j.data);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, initial]);

  if (!loading && products.length === 0) return null;
  if (loading) return null;

  return (
    <section className={className}>
      <h2 className="mb-6 text-xl font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
