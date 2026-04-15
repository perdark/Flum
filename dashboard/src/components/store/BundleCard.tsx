import { ProductCard } from "@/components/store/ProductCard";
import type { StoreProduct } from "@/lib/store-queries";
import { cn } from "@/lib/utils";

interface BundleCardProps {
  product: StoreProduct;
  className?: string;
}

/** Emphasized card wrapper for bundle listings (homepage strip, cross-sell). */
export function BundleCard({ product, className }: BundleCardProps) {
  if (!product.isBundle) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-transparent p-0.5 shadow-sm",
        className,
      )}
    >
      <ProductCard product={product} />
    </div>
  );
}
