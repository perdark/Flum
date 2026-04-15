import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getActiveProducts, getCategoryTree, getStorePriceBounds, getStoreSettings } from "@/lib/store-queries";
import { JsonLd } from "@/components/store/JsonLd";
import { breadcrumbListJsonLd, resolveStoreOrigin } from "@/lib/structured-data";
import { ProductGrid } from "@/components/store/ProductGrid";
import { ProductFilters } from "@/components/store/ProductFilters";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products",
};

function tagList(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function finiteFloat(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function flattenCategories(cats: any[]): Array<{ name: string; slug: string }> {
  const flat: Array<{ name: string; slug: string }> = [];
  for (const cat of cats) {
    flat.push({ name: cat.name, slug: cat.slug });
    if (cat.children) flat.push(...flattenCategories(cat.children));
  }
  return flat;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const page = positiveInt(params.page, 1);
  const limit = 24;

  const [{ products, total }, categoryTree, priceBounds] = await Promise.all([
    getActiveProducts({
      categorySlug: params.category,
      search: params.search,
      sort: params.sort || "newest",
      featured: params.featured === "true" || undefined,
      isNew: params.new === "true" || undefined,
      isBundle: params.bundle === "1" || undefined,
      onSale: params.deals === "1" || params.onSale === "1" || undefined,
      minPrice: finiteFloat(params.minPrice),
      maxPrice: finiteFloat(params.maxPrice),
      platformTags: tagList(params.platforms),
      regionTags: tagList(params.regions),
      typeTags: tagList(params.types),
      inStockOnly: params.inStock === "1" || undefined,
      minRating: finiteFloat(params.minRating),
      page,
      limit,
    }),
    getCategoryTree(),
    getStorePriceBounds(),
  ]);

  const totalPages = Math.ceil(total / limit);
  const flatCats = flattenCategories(categoryTree);

  // Build breadcrumb
  const breadcrumbs = [{ label: "Home", href: "/store" }, { label: "Products" }];
  if (params.search) {
    breadcrumbs.push({ label: `"${params.search}"` });
  }

  const headersList = await headers();
  const settings = await getStoreSettings();
  const origin = resolveStoreOrigin(headersList, settings?.storeUrl ?? null);
  const bcItems = [{ name: "Home", path: "/store" }, { name: "Products", path: "/store/products" }];
  if (params.search) {
    bcItems.push({
      name: `“${params.search}”`,
      path: `/store/products?search=${encodeURIComponent(params.search)}`,
    });
  }
  const breadcrumbLd = origin ? breadcrumbListJsonLd(origin, bcItems) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {origin && breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {params.search
            ? `Results for "${params.search}"`
            : params.featured === "true"
              ? "Featured Products"
              : params.new === "true"
                ? "New Arrivals"
                : params.deals === "1" || params.onSale === "1"
                  ? "Flash deals"
                  : params.bundle === "1"
                    ? "Bundle deals"
                    : "All Products"}
        </h1>
        <span className="text-sm text-muted-foreground">{total} products</span>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-56 shrink-0">
          <Suspense>
            <ProductFilters categories={flatCats} priceBounds={priceBounds} />
          </Suspense>
        </aside>

        {/* Product grid + pagination */}
        <div className="flex-1 min-w-0">
          {/* Mobile filters */}
          <div className="lg:hidden mb-4">
            <Suspense>
              <ProductFilters categories={flatCats} priceBounds={priceBounds} />
            </Suspense>
          </div>

          <ProductGrid products={products} />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <PaginationLink page={page - 1} params={params}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </PaginationLink>
              )}
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <PaginationLink page={page + 1} params={params}>
                  Next <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PaginationLink({
  page,
  params,
  children,
}: {
  page: number;
  params: Record<string, string | undefined>;
  children: React.ReactNode;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") sp.set(k, v);
  }
  sp.set("page", String(page));

  return (
    <Link
      href={`/store/products?${sp.toString()}`}
      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
    >
      {children}
    </Link>
  );
}
