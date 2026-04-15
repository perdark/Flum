import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { StoreProduct } from "@/lib/store-queries";
import { ProductCard } from "@/components/store/ProductCard";
import { HorizontalScroll } from "@/components/store/HorizontalScroll";
import { CountdownTimer } from "@/components/store/CountdownTimer";

export function FlashDeals({
  products,
  endsAt,
}: {
  products: StoreProduct[];
  endsAt: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Title */}
        <div className="mr-auto flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <Zap className="h-4 w-4 fill-amber-500" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-none">Flash deals</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Limited-time prices on top titles</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Ends in</span>
          <CountdownTimer endAt={endsAt} className="font-mono font-semibold text-amber-500" />
        </div>

        {/* View all */}
        <Link
          href="/store/products?deals=1"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <HorizontalScroll gapClassName="gap-3 md:gap-4">
        {products.map((p) => (
          <div key={p.id} className="w-[11rem] shrink-0 snap-start sm:w-[13rem]">
            <ProductCard product={p} />
          </div>
        ))}
      </HorizontalScroll>
    </section>
  );
}
