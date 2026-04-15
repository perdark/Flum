import Link from "next/link";
import { Star } from "lucide-react";
import type { StoreTestimonial } from "@/lib/store-queries";
import { HorizontalScroll } from "@/components/store/HorizontalScroll";
import { cn } from "@/lib/utils";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(rating) ? "fill-amber-500 text-amber-500" : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}

export function TestimonialCarousel({ items }: { items: StoreTestimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-foreground">Loved by gamers</h2>
        <p className="mt-1 text-sm text-muted-foreground">What real buyers say about us</p>
      </div>
      <HorizontalScroll gapClassName="gap-4">
        {items.map((t, i) => (
          <article
            key={`${t.productSlug}-${i}`}
            className="flex w-[min(85vw,20rem)] shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Product row */}
            <div className="flex gap-3">
              <Link href={`/store/products/${t.productSlug}`} className="shrink-0">
                <div className="h-14 w-11 overflow-hidden rounded-lg bg-muted">
                  {t.productImageUrl ? (
                    <img
                      src={t.productImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/store/products/${t.productSlug}`}
                  className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {t.productName}
                </Link>
                <div className="mt-1">
                  <StarRow rating={t.rating ?? 5} />
                </div>
              </div>
            </div>

            {/* Review text */}
            {t.comment && (
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.comment}&rdquo;
              </p>
            )}

            {/* Review title if available */}
            {t.title && (
              <p className="mt-3 border-t border-border pt-2.5 text-xs font-medium text-muted-foreground">
                &ldquo;{t.title}&rdquo;
              </p>
            )}
          </article>
        ))}
      </HorizontalScroll>
    </section>
  );
}
