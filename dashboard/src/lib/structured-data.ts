/**
 * JSON-LD builders for storefront SEO (schema.org).
 * Serialize with JSON.stringify and inject in <script type="application/ld+json">.
 */

export function sanitizeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function organizationJsonLd(opts: {
  url: string;
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name,
    url: opts.url,
  };
  if (opts.logo?.startsWith("http")) node.logo = opts.logo;
  if (opts.email) node.email = opts.email;
  if (opts.phone) node.telephone = opts.phone;
  return node;
}

export function websiteJsonLd(opts: { url: string; name: string; searchUrlTemplate: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: opts.name,
    url: opts.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: opts.searchUrlTemplate,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbListJsonLd(
  origin: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${origin.replace(/\/$/, "")}${it.path.startsWith("/") ? it.path : `/${it.path}`}`,
    })),
  };
}

export function productJsonLd(opts: {
  origin: string;
  name: string;
  description: string | null;
  slug: string;
  imageUrls: string[];
  sku?: string | null;
  price: number;
  currency: string;
  inStock: boolean;
  ratingValue?: number;
  ratingCount?: number;
}) {
  const url = `${opts.origin.replace(/\/$/, "")}/store/products/${opts.slug}`;
  const images = opts.imageUrls
    .map((u) => (u.startsWith("http") ? u : `${opts.origin.replace(/\/$/, "")}${u.startsWith("/") ? u : `/${u}`}`))
    .filter(Boolean);

  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url,
    priceCurrency: opts.currency,
    price: opts.price.toFixed(2),
    availability: opts.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
  };

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description?.slice(0, 5000) || undefined,
    image: images.length ? images : undefined,
    sku: opts.sku || undefined,
    offers,
  };

  if (opts.ratingCount && opts.ratingCount > 0 && opts.ratingValue != null) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: opts.ratingValue,
      reviewCount: opts.ratingCount,
    };
  }

  return node;
}

export function collectionPageJsonLd(opts: {
  origin: string;
  name: string;
  description: string | null;
  path: string;
}) {
  const url = `${opts.origin.replace(/\/$/, "")}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description?.slice(0, 5000) || undefined,
    url,
  };
}

export function resolveStoreOrigin(
  headersList: Headers,
  settingsStoreUrl: string | null | undefined,
): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (settingsStoreUrl?.startsWith("http")) return settingsStoreUrl.replace(/\/$/, "");
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return host ? `${proto}://${host}` : "";
}
