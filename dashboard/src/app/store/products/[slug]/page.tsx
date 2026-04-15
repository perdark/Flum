import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getAlsoBought } from "@/lib/store-queries";
import type { StoreBundleOffer, StoreProduct } from "@/lib/store-queries";
import { getStoreCustomer } from "@/lib/customer-auth";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ImageGallery } from "@/components/store/ImageGallery";
import { VariantSelector } from "@/components/store/VariantSelector";
import { ProductGrid } from "@/components/store/ProductGrid";
import { ProductTabs } from "@/components/store/ProductTabs";
import { AlsoBought } from "@/components/store/AlsoBought";
import { PlatformBadge } from "@/components/store/PlatformBadge";
import { DeliveryBadge } from "@/components/store/DeliveryBadge";
import { PriceDisplay } from "@/components/ui/currency-display";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { calculateDiscountPercentage } from "@/lib/utils";
import { ProductDetailActions } from "./ProductDetailActions";
import { BundleContents } from "@/components/store/BundleContents";
import { BundleCard } from "@/components/store/BundleCard";
import { HorizontalScroll } from "@/components/store/HorizontalScroll";
import { StickyCartBar } from "@/components/store/StickyCartBar";
import { JsonLd } from "@/components/store/JsonLd";
import { headers } from "next/headers";
import {
  breadcrumbListJsonLd,
  productJsonLd,
  resolveStoreOrigin,
} from "@/lib/structured-data";
import { getStoreSettings } from "@/lib/store-queries";

function bundleOfferToProduct(o: StoreBundleOffer): StoreProduct {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    description: null,
    basePrice: o.basePrice,
    compareAtPrice: o.compareAtPrice,
    isFeatured: false,
    isNew: false,
    isBundle: true,
    bundleEconomics: {
      itemsTotalAtRetail: o.itemsTotalAtRetail,
      savings: o.savings,
      savingsPercent: o.savingsPercent,
      includedNames: o.includedNames,
      lines: o.lines,
    },
    averageRating: 0,
    reviewCount: 0,
    inStock: o.inStock,
    image: o.image,
    category: null,
    tags: [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.description?.slice(0, 160) || "",
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const customer = await getStoreCustomer();
  const product = await getProductBySlug(slug, {
    pricingTier: customer?.type === "merchant" ? "merchant" : "retail",
  });
  if (!product) notFound();

  const primaryCategory = product.categories[0];
  const breadcrumbs = [
    { label: "Home", href: "/store" },
    ...(primaryCategory
      ? [{ label: primaryCategory.name, href: `/store/categories/${primaryCategory.slug}` }]
      : []),
    { label: product.name },
  ];

  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.basePrice;

  const platformTag = product.tags.find((t) => t.tagGroup === "platform");
  const regionTag = product.tags.find((t) => t.tagGroup === "region");

  const pricingTier = customer?.type === "merchant" ? "merchant" as const : "retail" as const;
  const alsoBought = await getAlsoBought(product.id, { limit: 4, pricingTier });

  const headersList = await headers();
  const settings = await getStoreSettings();
  const origin = resolveStoreOrigin(headersList, settings?.storeUrl ?? null);
  const currency = "USD";

  const breadcrumbLd =
    origin &&
    breadcrumbListJsonLd(origin, [
      { name: "Home", path: "/store" },
      ...(primaryCategory
        ? [{ name: primaryCategory.name, path: `/store/categories/${primaryCategory.slug}` }]
        : []),
      { name: product.name, path: `/store/products/${product.slug}` },
    ]);

  const productLd =
    origin &&
    productJsonLd({
      origin,
      name: product.name,
      description: product.description,
      slug: product.slug,
      imageUrls: product.images.map((im) => im.url),
      price: product.basePrice,
      currency,
      inStock: product.inStock,
      ratingValue: product.averageRating,
      ratingCount: product.reviewCount,
    });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {origin && breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      {origin && productLd && <JsonLd data={productLd} />}
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Images */}
        <ImageGallery
          images={product.images}
          productName={product.name}
          videoUrl={product.videoUrl}
          videoThumbnail={product.videoThumbnail}
        />

        {/* Right: Product info — sticky on desktop */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-5">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {product.isBundle && (
              <Badge className="border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-200">
                Bundle
              </Badge>
            )}
            {product.isNew && <Badge variant="new">New</Badge>}
            {hasDiscount && (
              <Badge variant="sale">
                -{calculateDiscountPercentage(product.compareAtPrice!, product.basePrice)}% Off
              </Badge>
            )}
            {platformTag && <PlatformBadge label={platformTag.tag} />}
            {regionTag && <PlatformBadge label={regionTag.tag} />}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <RatingStars
              rating={product.averageRating}
              count={product.reviewCount}
              showCount
              size="md"
            />
          )}

          {/* Price — larger display */}
          <div className="flex items-baseline gap-3">
            <PriceDisplay
              price={product.basePrice}
              compareAtPrice={product.compareAtPrice ?? undefined}
              className="text-2xl"
            />
          </div>

          {product.isBundle && product.bundle && product.bundle.lines.length > 0 && (
            <BundleContents economics={product.bundle} bundlePrice={product.basePrice} detailed />
          )}

          {/* Stock + Delivery */}
          <div className="flex items-center gap-4">
            {product.inStock ? (
              <p className="flex items-center gap-2 text-sm text-success font-medium">
                <span className="h-2 w-2 rounded-full bg-success" />
                In Stock
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-destructive font-medium">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Out of Stock
              </p>
            )}
            {product.inStock && <DeliveryBadge />}
          </div>

          {/* Variant selector */}
          <VariantSelector
            optionGroups={product.optionGroups}
            variants={product.variants}
            basePrice={product.basePrice}
            compareAtPrice={product.compareAtPrice}
          />

          {/* Active offers */}
          {product.offers.length > 0 && (
            <div className="space-y-2">
              {product.offers.map((offer, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-brand">{offer.name}</span>
                  {offer.discountedPrice > 0 && (
                    <span className="text-muted-foreground ml-2">
                      Special price: ${offer.discountedPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons (client component) */}
          <ProductDetailActions
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: product.images[0]?.url ?? null,
              price: product.basePrice,
              inStock: product.inStock,
            }}
          />
          <StickyCartBar
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: product.images[0]?.url ?? null,
              price: product.basePrice,
              inStock: product.inStock,
            }}
          />
        </div>
      </div>

      {product.bundlesContaining.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="mb-6 text-xl font-bold text-foreground">Also available in a bundle</h2>
          <HorizontalScroll gapClassName="gap-3 md:gap-4">
            {product.bundlesContaining.map((o) => (
              <div key={o.id} className="w-[11rem] shrink-0 snap-start sm:w-[13rem]">
                <BundleCard product={bundleOfferToProduct(o)} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Tabbed content below fold */}
      <section className="mt-16 border-t border-border pt-10">
        <ProductTabs
          description={product.description}
          videoUrl={product.videoUrl}
          productName={product.name}
          productId={product.id}
          reviews={product.reviews}
          categories={product.categories}
          tags={product.tags}
        />
      </section>

      {/* Similar Products */}
      {product.relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="mb-6 text-xl font-bold text-foreground">Similar Products</h2>
          <ProductGrid products={product.relatedProducts} />
        </section>
      )}

      {/* Customers Also Bought */}
      {alsoBought.length > 0 && (
        <AlsoBought
          productId={product.id}
          initial={alsoBought}
          className="mt-16 border-t border-border pt-10"
        />
      )}
    </div>
  );
}
