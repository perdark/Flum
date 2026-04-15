import Link from "next/link";
import {
  getActiveProducts,
  getActiveBundles,
  getActiveOffers,
  getRootCategoriesWithProductCounts,
  getStoreTestimonials,
} from "@/lib/store-queries";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { ProductGrid } from "@/components/store/ProductGrid";
import { ProductCard } from "@/components/store/ProductCard";
import { BundleCard } from "@/components/store/BundleCard";
import { HorizontalScroll } from "@/components/store/HorizontalScroll";
import { TrustBar } from "@/components/store/TrustBar";
import { FlashDeals } from "@/components/store/FlashDeals";
import { PlatformShowcase } from "@/components/store/PlatformShowcase";
import { TestimonialCarousel } from "@/components/store/TestimonialCarousel";
import { NewsletterSignup } from "@/components/store/NewsletterSignup";
import { ArrowRight } from "lucide-react";

function SectionHeader({
  title,
  subtitle,
  href,
  hrefLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {hrefLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function ProductStrip({
  title,
  subtitle,
  href,
  products,
}: {
  title: string;
  subtitle?: string;
  href: string;
  products: Awaited<ReturnType<typeof getActiveProducts>>["products"];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader title={title} subtitle={subtitle} href={href} />
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

export default async function StoreHomePage() {
  /* Flash-deals countdown anchor (48h from request). Server-only. */
  // eslint-disable-next-line react-hooks/purity -- time anchor for marketing countdown
  const flashEnds = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const [
    heroOffers,
    featuredResult,
    newArrivalsResult,
    popularResult,
    flashResult,
    bundleDealsResult,
    categories,
    testimonials,
  ] = await Promise.all([
    getActiveOffers("hero"),
    getActiveProducts({ featured: true, limit: 10, sort: "newest" }),
    getActiveProducts({ isNew: true, limit: 10, sort: "newest" }),
    getActiveProducts({ limit: 8, sort: "popular" }),
    getActiveProducts({ onSale: true, limit: 12, sort: "popular" }),
    getActiveBundles({ limit: 12, sort: "popular" }),
    getRootCategoriesWithProductCounts(),
    getStoreTestimonials(10),
  ]);

  return (
    <div className="space-y-14 pb-20 md:pb-16">
      {heroOffers.length > 0 && (
        <section className="relative w-full overflow-hidden">
          <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">
            <HeroCarousel offers={heroOffers} />
          </div>
        </section>
      )}

      <TrustBar />

      <FlashDeals products={flashResult.products} endsAt={flashEnds} />

      {bundleDealsResult.products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Bundle deals — save more"
            subtitle="Curated packs at a better price than buying each item alone"
            href="/store/products?bundle=1"
            hrefLabel="View all bundles"
          />
          <HorizontalScroll gapClassName="gap-3 md:gap-4">
            {bundleDealsResult.products.map((p) => (
              <div key={p.id} className="w-[11rem] shrink-0 snap-start sm:w-[13rem]">
                <BundleCard product={p} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      <ProductStrip
        title="Featured picks"
        subtitle="Staff favourites and spotlight titles"
        href="/store/products?featured=true"
        products={featuredResult.products}
      />

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Browse categories"
            subtitle="Explore catalogs with live product counts"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/store/categories/${cat.slug}`}
                className="group relative min-h-[160px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                {cat.banner && (
                  <img
                    src={cat.banner}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-300 group-hover:opacity-30"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-4">
                  {cat.icon && (
                    <span className="mb-2 text-2xl leading-none">{cat.icon}</span>
                  )}
                  <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Popular right now"
          href="/store/products?sort=popular"
        />
        <ProductGrid products={popularResult.products} columns={4} />
      </section>

      <ProductStrip
        title="New arrivals"
        subtitle="Fresh keys and digital goods"
        href="/store/products?new=true"
        products={newArrivalsResult.products}
      />

      <PlatformShowcase />

      <TestimonialCarousel items={testimonials} />

      <NewsletterSignup />
    </div>
  );
}
