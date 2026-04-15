import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getCategoryBySlug,
  getActiveProducts,
  getCategoryTree,
  getStorePriceBounds,
} from "@/lib/store-queries";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { ProductGrid } from "@/components/store/ProductGrid";
import { ProductFilters } from "@/components/store/ProductFilters";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/store/JsonLd";
import {
  breadcrumbListJsonLd,
  collectionPageJsonLd,
  resolveStoreOrigin,
} from "@/lib/structured-data";
import { getStoreSettings } from "@/lib/store-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found" };
  return {
    title: category.name,
    description: category.description || `Browse ${category.name} products`,
  };
}

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

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = positiveInt(sp.page, 1);
  const limit = 24;

  const [category, { products, total }, categoryTree, priceBounds] = await Promise.all([
    getCategoryBySlug(slug),
    getActiveProducts({
      categorySlug: slug,
      search: sp.search,
      sort: sp.sort || "newest",
      isBundle: sp.bundle === "1" || undefined,
      onSale: sp.deals === "1" || sp.onSale === "1" || undefined,
      minPrice: finiteFloat(sp.minPrice),
      maxPrice: finiteFloat(sp.maxPrice),
      platformTags: tagList(sp.platforms),
      regionTags: tagList(sp.regions),
      typeTags: tagList(sp.types),
      inStockOnly: sp.inStock === "1" || undefined,
      minRating: finiteFloat(sp.minRating),
      page,
      limit,
    }),
    getCategoryTree(),
    getStorePriceBounds(),
  ]);

  if (!category) notFound();

  const totalPages = Math.ceil(total / limit);
  const flatCats = flattenCategories(categoryTree);

  const headersList = await headers();
  const settings = await getStoreSettings();
  const origin = resolveStoreOrigin(headersList, settings?.storeUrl ?? null);
  const breadcrumbLd =
    origin &&
    breadcrumbListJsonLd(origin, [
      { name: "Home", path: "/store" },
      { name: category.name, path: `/store/categories/${slug}` },
    ]);
  const collectionLd =
    origin &&
    collectionPageJsonLd({
      origin,
      name: category.name,
      description: category.description,
      path: `/store/categories/${slug}`,
    });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {origin && breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      {origin && collectionLd && <JsonLd data={collectionLd} />}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/store" },
          { label: category.name },
        ]}
        className="mb-6"
      />

      {/* Category header */}
      <div className="mb-8">
        {category.banner && (
          <div className="relative h-40 md:h-56 rounded-xl overflow-hidden mb-4">
            <img
              src={category.banner}
              alt={category.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h1 className="absolute bottom-4 left-6 text-2xl md:text-3xl font-bold text-white">
              {category.name}
            </h1>
          </div>
        )}
        {!category.banner && (
          <h1 className="text-2xl font-bold">{category.name}</h1>
        )}
        {category.description && (
          <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
        )}
        <span className="text-sm text-muted-foreground mt-1 block">{total} products</span>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <Suspense>
            <ProductFilters
              categories={flatCats}
              priceBounds={priceBounds}
              listingPath={`/store/categories/${slug}`}
              hideCategoryPicker
            />
          </Suspense>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-4">
            <Suspense>
              <ProductFilters
                categories={flatCats}
                priceBounds={priceBounds}
                listingPath={`/store/categories/${slug}`}
                hideCategoryPicker
              />
            </Suspense>
          </div>

          <ProductGrid products={products} />

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <PaginationLink slug={slug} page={page - 1} sp={sp}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </PaginationLink>
              )}
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <PaginationLink slug={slug} page={page + 1} sp={sp}>
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
  slug,
  page,
  sp,
  children,
}: {
  slug: string;
  page: number;
  sp: Record<string, string | undefined>;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") qs.set(k, v);
  }
  qs.set("page", String(page));

  return (
    <Link
      href={`/store/categories/${slug}?${qs.toString()}`}
      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
    >
      {children}
    </Link>
  );
}
