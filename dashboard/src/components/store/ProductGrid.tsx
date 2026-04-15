"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/lib/store-queries";

interface ProductGridProps {
  products: StoreProduct[];
  columns?: 2 | 3 | 4;
  loading?: boolean;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  columns = 4,
  loading = false,
  emptyMessage = "No products found.",
}: ProductGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  if (loading) {
    return (
      <div className={cn("grid gap-4", gridCols[columns])}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3.5 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4", gridCols[columns])}
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={fadeUp}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}
