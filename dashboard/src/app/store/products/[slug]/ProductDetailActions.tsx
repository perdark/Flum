"use client";

import { AddToCartButton } from "@/components/store/AddToCartButton";
import { WishlistButton } from "@/components/store/WishlistButton";
import { ShareButtons } from "@/components/store/ShareButtons";
import { PriceDropToggle } from "@/components/store/PriceDropToggle";

interface ProductDetailActionsProps {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    price: number;
    inStock: boolean;
  };
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  return (
    <div id="product-main-add-to-cart" className="space-y-4 pt-2">
      <AddToCartButton product={product} />

      <div className="flex items-center gap-3">
        <WishlistButton productId={product.id} className="flex-1" />
        <ShareButtons productName={product.name} />
      </div>

      <PriceDropToggle productId={product.id} />
    </div>
  );
}
