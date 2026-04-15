"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const [wishlisted, setWishlisted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const list = JSON.parse(
        localStorage.getItem("store-wishlist") || "[]",
      ) as string[];
      return list.includes(productId);
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setWishlisted((prev) => {
      const next = !prev;
      try {
        const list = JSON.parse(
          localStorage.getItem("store-wishlist") || "[]",
        ) as string[];
        if (next) {
          if (!list.includes(productId)) list.push(productId);
        } else {
          const idx = list.indexOf(productId);
          if (idx >= 0) list.splice(idx, 1);
        }
        localStorage.setItem("store-wishlist", JSON.stringify(list));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
        wishlisted
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive",
        className,
      )}
    >
      <Heart
        className={cn("h-5 w-5", wishlisted && "fill-current")}
      />
      {wishlisted ? "Wishlisted" : "Add to Wishlist"}
    </button>
  );
}
