/**
 * Shared query functions for the public storefront.
 * Used by both Server Components (direct calls) and API routes.
 *
 * SECURITY: Never expose cost, wholesale pricing, SKU, inventory internals,
 * exact stock counts, or customer emails from reviews.
 */

import { getDb } from "@/db";
import {
  products,
  categories,
  productCategories,
  productImages,
  productVariants,
  productOptionGroups,
  productOptionValues,
  reviews,
  offers,
  productOffers,
  productTags,
  bundleItems,
  productPricing,
  orders,
  orderItems,
  storeSettings,
  inventoryItems,
  inventoryTemplates,
} from "@/db/schema";
import { eq, and, isNull, sql, desc, asc, ilike, or, gte, lte, inArray, exists } from "drizzle-orm";
import type { TemplateField } from "@/types";
import { filterFieldsByVisibility } from "@/services/fieldVisibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreBundleLine {
  productName: string;
  slug: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Retail-style bundle value (sum of parts vs bundle list price from DB). */
export interface StoreBundleEconomics {
  itemsTotalAtRetail: number;
  savings: number;
  savingsPercent: number;
  includedNames: string[];
  lines: StoreBundleLine[];
}

/** A bundle that includes a given product (for PDP cross-sell). */
export interface StoreBundleOffer extends StoreBundleEconomics {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  compareAtPrice: number | null;
  inStock: boolean;
  image: { url: string; alt: string | null } | null;
}

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  isBundle: boolean;
  /** Populated for bundle products on listings when economics exist */
  bundleEconomics?: StoreBundleEconomics;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  image: { url: string; alt: string | null } | null;
  category: { name: string; slug: string; icon: string | null } | null;
  tags: Array<{ tag: string; tagGroup: string }>;
}

export interface StoreProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  isBundle: boolean;
  /** When this product is a bundle: line breakdown and savings */
  bundle: StoreBundleEconomics | null;
  /** When this product is not a bundle: bundles that include it */
  bundlesContaining: StoreBundleOffer[];
  averageRating: number;
  ratingCount: number;
  reviewCount: number;
  inStock: boolean;
  videoUrl: string | null;
  videoThumbnail: string | null;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
  optionGroups: Array<{
    id: string;
    name: string;
    sortOrder: number;
    values: Array<{ id: string; value: string; sortOrder: number }>;
  }>;
  variants: Array<{
    id: string;
    optionCombination: Record<string, string>;
    price: number;
    compareAtPrice: number | null;
    inStock: boolean;
    isDefault: boolean;
  }>;
  reviews: {
    items: Array<{
      rating: number;
      title: string | null;
      comment: string | null;
      isVerifiedPurchase: boolean;
      createdAt: string;
    }>;
    total: number;
    averageRating: number;
  };
  relatedProducts: StoreProduct[];
  offers: Array<{ name: string; discountedPrice: number; banner: string | null }>;
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ tag: string; tagGroup: string }>;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  children: StoreCategory[];
}

export interface StoreOffer {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  value: number;
  banner: string | null;
  displayType: string;
  displayPosition: number | null;
  backgroundColor: string | null;
  textColor: string | null;
  showCountdown: boolean;
  ctaText: string | null;
  ctaLink: string | null;
  featuredImage: string | null;
  endDate: string;
}

export interface StoreSettings {
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  enableReviews: boolean;
  contactEmail: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  storeUrl: string | null;
  defaultLanguage: string;
}

// ---------------------------------------------------------------------------
// Base conditions
// ---------------------------------------------------------------------------

const activeProduct = and(
  eq(products.isActive, true),
  isNull(products.deletedAt),
);

const activeCategory = and(
  eq(categories.isActive, true),
  isNull(categories.deletedAt),
);

async function loadBundleEconomicsForIds(
  db: ReturnType<typeof getDb>,
  bundleIds: string[],
): Promise<Map<string, StoreBundleEconomics>> {
  const map = new Map<string, StoreBundleEconomics>();
  if (bundleIds.length === 0) return map;

  const retailRows = await db
    .select({ id: products.id, basePrice: products.basePrice })
    .from(products)
    .where(inArray(products.id, bundleIds));
  const retailMap = new Map(retailRows.map((r) => [r.id, Number(r.basePrice)]));

  const lineRows = await db
    .select({
      bundleId: bundleItems.bundleProductId,
      productName: bundleItems.productName,
      quantity: bundleItems.quantity,
      priceOverride: bundleItems.priceOverride,
      childBase: products.basePrice,
      childSlug: products.slug,
      lineIndex: bundleItems.lineIndex,
    })
    .from(bundleItems)
    .leftJoin(products, eq(products.id, bundleItems.productId))
    .where(inArray(bundleItems.bundleProductId, bundleIds))
    .orderBy(asc(bundleItems.bundleProductId), asc(bundleItems.lineIndex));

  const grouped = new Map<string, typeof lineRows>();
  for (const row of lineRows) {
    const list = grouped.get(row.bundleId) ?? [];
    list.push(row);
    grouped.set(row.bundleId, list);
  }

  for (const bid of bundleIds) {
    const rowsFor = grouped.get(bid) ?? [];
    const lines: StoreBundleLine[] = [];
    let itemsTotal = 0;
    for (const row of rowsFor) {
      const unit =
        row.priceOverride != null && row.priceOverride !== ""
          ? Number(row.priceOverride)
          : row.childBase != null
            ? Number(row.childBase)
            : 0;
      const lineTotal = unit * row.quantity;
      itemsTotal += lineTotal;
      lines.push({
        productName: row.productName,
        slug: row.childSlug,
        quantity: row.quantity,
        unitPrice: unit,
        lineTotal,
      });
    }
    const bundleRetail = retailMap.get(bid) ?? 0;
    const savings = Math.max(0, itemsTotal - bundleRetail);
    const savingsPercent =
      itemsTotal > 0 ? Math.min(100, Math.round((savings / itemsTotal) * 100)) : 0;
    map.set(bid, {
      itemsTotalAtRetail: itemsTotal,
      savings,
      savingsPercent,
      includedNames: lines.map((l) => l.productName),
      lines,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const db = getDb();
  const [row] = await db
    .select({
      storeName: storeSettings.storeName,
      description: storeSettings.description,
      logoUrl: storeSettings.logoUrl,
      faviconUrl: storeSettings.faviconUrl,
      metaTitle: storeSettings.metaTitle,
      metaDescription: storeSettings.metaDescription,
      enableReviews: storeSettings.enableReviews,
      contactEmail: storeSettings.contactEmail,
      supportEmail: storeSettings.supportEmail,
      supportPhone: storeSettings.supportPhone,
      storeUrl: storeSettings.storeUrl,
      defaultLanguage: storeSettings.defaultLanguage,
    })
    .from(storeSettings)
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type StoreCategoryWithCount = StoreCategory & { productCount: number };

export async function getRootCategoriesWithProductCounts(): Promise<StoreCategoryWithCount[]> {
  const tree = await getCategoryTree();
  const db = getDb();
  const rows = await db
    .select({
      categoryId: productCategories.categoryId,
      n: sql<number>`count(distinct ${productCategories.productId})::int`,
    })
    .from(productCategories)
    .innerJoin(products, eq(productCategories.productId, products.id))
    .where(and(activeProduct))
    .groupBy(productCategories.categoryId);

  const countMap = new Map(rows.map((r) => [r.categoryId, r.n]));

  function decorate(node: StoreCategory): StoreCategoryWithCount {
    return {
      ...node,
      productCount: countMap.get(node.id) ?? 0,
      children: node.children.map(decorate),
    };
  }

  return tree.map(decorate);
}

export interface StoreTestimonial {
  rating: number;
  title: string | null;
  comment: string | null;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
}

export async function getStoreTestimonials(limit = 8): Promise<StoreTestimonial[]> {
  const db = getDb();
  const reviewRows = await db
    .select({
      rating: reviews.rating,
      title: reviews.title,
      comment: reviews.comment,
      productName: products.name,
      productSlug: products.slug,
      productId: products.id,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(
      and(
        eq(reviews.isApproved, true),
        eq(reviews.isActive, true),
        isNull(reviews.deletedAt),
        eq(reviews.rating, 5),
        activeProduct,
      ),
    )
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  if (reviewRows.length === 0) return [];

  const ids = reviewRows.map((r) => r.productId);
  const imgs = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(sql`${productImages.productId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(asc(productImages.sortOrder));

  const firstImg = new Map<string, string>();
  for (const im of imgs) {
    if (!firstImg.has(im.productId)) firstImg.set(im.productId, im.url);
  }

  return reviewRows.map((r) => ({
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    productName: r.productName,
    productSlug: r.productSlug,
    productImageUrl: firstImg.get(r.productId) ?? null,
  }));
}

export async function getCategoryTree(): Promise<StoreCategory[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      icon: categories.icon,
      banner: categories.banner,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(activeCategory)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Build tree
  const map = new Map<string, StoreCategory & { parentId: string | null }>();
  for (const r of rows) {
    map.set(r.id, { ...r, children: [] });
  }
  const tree: StoreCategory[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }
  return tree;
}

export async function getCategoryBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      icon: categories.icon,
      banner: categories.banner,
    })
    .from(categories)
    .where(and(activeCategory, eq(categories.slug, slug)))
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Products — Listing
// ---------------------------------------------------------------------------

type SortOption = "newest" | "price_asc" | "price_desc" | "popular" | "rating" | "featured";

const sortMap: Record<SortOption, any> = {
  newest: desc(products.createdAt),
  price_asc: asc(products.basePrice),
  price_desc: desc(products.basePrice),
  popular: desc(products.salesCount),
  rating: desc(products.averageRating),
  featured: desc(products.isFeatured),
};

export async function getStorePriceBounds(): Promise<{ min: number; max: number }> {
  const db = getDb();
  const [row] = await db
    .select({
      minP: sql<string>`coalesce(min(${products.basePrice}::numeric), 0)`,
      maxP: sql<string>`coalesce(max(${products.basePrice}::numeric), 100)`,
    })
    .from(products)
    .where(activeProduct);

  const min = Math.floor(Number(row?.minP ?? 0));
  const rawMax = Math.ceil(Number(row?.maxP ?? 100));
  const max = Math.max(min + 1, rawMax);
  return { min, max };
}

export async function getActiveProducts(options: {
  categorySlug?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  isNew?: boolean;
  /** Products with compare-at price strictly greater than sale price */
  onSale?: boolean;
  /** When merchant, list wholesale as basePrice and retail as compareAt when pricing rows exist */
  pricingTier?: "retail" | "merchant";
  minPrice?: number;
  maxPrice?: number;
  /** Match any of these tags where tag_group = platform */
  platformTags?: string[];
  /** Match any of these tags where tag_group = region */
  regionTags?: string[];
  /** Match any of these tags where tag_group = type */
  typeTags?: string[];
  /** Stock: unlimited (-1) or quantity > 0 */
  inStockOnly?: boolean;
  /** Minimum average rating (e.g. 4) */
  minRating?: number;
  /** Only bundle products */
  isBundle?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ products: StoreProduct[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(48, Math.max(1, options.limit ?? 20));
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions: any[] = [activeProduct];

  if (options.featured) conditions.push(eq(products.isFeatured, true));
  if (options.isNew) conditions.push(eq(products.isNew, true));
  if (options.isBundle) conditions.push(eq(products.isBundle, true));
  if (options.onSale) {
    conditions.push(
      sql`${products.compareAtPrice} IS NOT NULL AND ${products.compareAtPrice}::numeric > ${products.basePrice}::numeric`,
    );
  }
  if (options.minPrice != null)
    conditions.push(gte(products.basePrice, String(options.minPrice)));
  if (options.maxPrice != null)
    conditions.push(lte(products.basePrice, String(options.maxPrice)));

  if (options.inStockOnly) {
    conditions.push(
      sql`(${products.currentStock} = -1 OR ${products.currentStock} > 0)`,
    );
  }

  if (options.minRating != null && options.minRating > 0) {
    conditions.push(gte(products.averageRating, String(options.minRating)));
  }

  const tagExists = (tagGroup: string, tags: string[]) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(productTags)
        .where(
          and(
            eq(productTags.productId, products.id),
            eq(productTags.tagGroup, tagGroup),
            inArray(productTags.tag, tags),
          ),
        ),
    );

  if (options.platformTags?.length) {
    conditions.push(tagExists("platform", options.platformTags));
  }
  if (options.regionTags?.length) {
    conditions.push(tagExists("region", options.regionTags));
  }
  if (options.typeTags?.length) {
    conditions.push(tagExists("type", options.typeTags));
  }

  if (options.search) {
    conditions.push(
      or(
        ilike(products.name, `%${options.search}%`),
        ilike(products.description, `%${options.search}%`),
      ),
    );
  }

  // Category filter — resolve slug to ID
  let categoryId: string | undefined;
  if (options.categorySlug) {
    const cat = await getCategoryBySlug(options.categorySlug);
    if (!cat) return { products: [], total: 0 };
    categoryId = cat.id;
  }

  // Sorting
  const sortKey = (options.sort ?? "newest") as SortOption;
  const orderBy = sortMap[sortKey] ?? sortMap.newest;

  // Query products
  let query;
  if (categoryId) {
    // Join with productCategories for category filter
    query = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        isBundle: products.isBundle,
        averageRating: products.averageRating,
        reviewCount: products.reviewCount,
        currentStock: products.currentStock,
      })
      .from(products)
      .innerJoin(
        productCategories,
        and(
          eq(productCategories.productId, products.id),
          eq(productCategories.categoryId, categoryId),
        ),
      )
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  } else {
    query = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        isBundle: products.isBundle,
        averageRating: products.averageRating,
        reviewCount: products.reviewCount,
        currentStock: products.currentStock,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  }

  const rows = await query;

  // Count total
  let countQuery;
  if (categoryId) {
    countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(
        productCategories,
        and(
          eq(productCategories.productId, products.id),
          eq(productCategories.categoryId, categoryId),
        ),
      )
      .where(and(...conditions));
  } else {
    countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));
  }
  const [{ count: total }] = await countQuery;

  if (rows.length === 0) return { products: [], total };

  // Batch-fetch first image per product
  const productIds = rows.map((r) => r.id);
  const imageRows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(sql`${productImages.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(asc(productImages.sortOrder));

  // Keep first image per product
  const imageMap = new Map<string, { url: string; alt: string | null }>();
  for (const img of imageRows) {
    if (!imageMap.has(img.productId)) {
      imageMap.set(img.productId, { url: img.url, alt: img.alt });
    }
  }

  // Batch-fetch primary category per product
  const catRows = await db
    .select({
      productId: productCategories.productId,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
    })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(
      and(
        sql`${productCategories.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
        eq(productCategories.isPrimary, true),
      ),
    );

  const catMap = new Map<string, { name: string; slug: string; icon: string | null }>();
  for (const c of catRows) {
    catMap.set(c.productId, { name: c.name, slug: c.slug, icon: c.icon });
  }

  const tagRows = await db
    .select({
      productId: productTags.productId,
      tag: productTags.tag,
      tagGroup: productTags.tagGroup,
    })
    .from(productTags)
    .where(sql`${productTags.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

  const tagsMap = new Map<string, Array<{ tag: string; tagGroup: string }>>();
  for (const t of tagRows) {
    const list = tagsMap.get(t.productId) ?? [];
    list.push({ tag: t.tag, tagGroup: t.tagGroup });
    tagsMap.set(t.productId, list);
  }

  let storeProducts: StoreProduct[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    basePrice: Number(r.basePrice),
    compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice) : null,
    isFeatured: r.isFeatured,
    isNew: r.isNew,
    isBundle: r.isBundle ?? false,
    averageRating: Number(r.averageRating ?? 0),
    reviewCount: r.reviewCount,
    inStock: r.currentStock === -1 || (r.currentStock ?? 0) > 0,
    image: imageMap.get(r.id) ?? null,
    category: catMap.get(r.id) ?? null,
    tags: tagsMap.get(r.id) ?? [],
  }));

  if (options.pricingTier === "merchant" && storeProducts.length > 0) {
    const pids = storeProducts.map((p) => p.id);
    const tiers = await db
      .select({
        productId: productPricing.productId,
        customerType: productPricing.customerType,
        wholesalePrice: productPricing.wholesalePrice,
        retailPrice: productPricing.retailPrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, pids), eq(productPricing.customerType, "merchant")),
      );
    const retailTiers = await db
      .select({
        productId: productPricing.productId,
        retailPrice: productPricing.retailPrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, pids), eq(productPricing.customerType, "retail")),
      );
    const wm = new Map(tiers.map((t) => [t.productId, t]));
    const rm = new Map(retailTiers.map((t) => [t.productId, t]));
    storeProducts = storeProducts.map((p) => {
      const m = wm.get(p.id);
      const r = rm.get(p.id);
      if (!m?.wholesalePrice) return p;
      const wholesale = Number(m.wholesalePrice);
      const retail = r?.retailPrice ? Number(r.retailPrice) : null;
      return {
        ...p,
        basePrice: wholesale,
        compareAtPrice: retail ?? p.compareAtPrice,
      };
    });
  }

  const bundleIds = storeProducts.filter((p) => p.isBundle).map((p) => p.id);
  if (bundleIds.length > 0) {
    const econMap = await loadBundleEconomicsForIds(db, bundleIds);
    storeProducts = storeProducts.map((p) => {
      if (!p.isBundle) return p;
      const econ = econMap.get(p.id);
      return econ ? { ...p, bundleEconomics: econ } : p;
    });
  }

  return { products: storeProducts, total };
}

/** Active bundle products with bundle economics for storefront cards. */
export async function getActiveBundles(opts?: {
  limit?: number;
  sort?: string;
  pricingTier?: "retail" | "merchant";
}): Promise<{ products: StoreProduct[]; total: number }> {
  return getActiveProducts({
    isBundle: true,
    limit: opts?.limit ?? 12,
    sort: opts?.sort ?? "popular",
    page: 1,
    pricingTier: opts?.pricingTier,
  });
}

/** Line items and savings for a bundle product (by bundle product id). */
export async function getBundleContents(
  bundleProductId: string,
): Promise<StoreBundleEconomics | null> {
  const db = getDb();
  const map = await loadBundleEconomicsForIds(db, [bundleProductId]);
  return map.get(bundleProductId) ?? null;
}

/**
 * Bundles that include the given product (for "also available in bundle" on PDP).
 */
export async function getBundlesContainingProduct(
  productId: string,
  opts?: { pricingTier?: "retail" | "merchant" },
): Promise<StoreBundleOffer[]> {
  const db = getDb();
  const linkRows = await db
    .select({ bundleId: bundleItems.bundleProductId })
    .from(bundleItems)
    .innerJoin(products, eq(products.id, bundleItems.bundleProductId))
    .where(
      and(
        eq(bundleItems.productId, productId),
        eq(products.isBundle, true),
        activeProduct,
      ),
    );

  const seen = new Set<string>();
  const bundleIds: string[] = [];
  for (const r of linkRows) {
    if (!seen.has(r.bundleId)) {
      seen.add(r.bundleId);
      bundleIds.push(r.bundleId);
    }
  }
  if (bundleIds.length === 0) return [];

  const econMap = await loadBundleEconomicsForIds(db, bundleIds);

  const bundleRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      currentStock: products.currentStock,
    })
    .from(products)
    .where(inArray(products.id, bundleIds));

  const imageRows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(sql`${productImages.productId} IN (${sql.join(bundleIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(asc(productImages.sortOrder));

  const imageMap = new Map<string, { url: string; alt: string | null }>();
  for (const img of imageRows) {
    if (!imageMap.has(img.productId)) {
      imageMap.set(img.productId, { url: img.url, alt: img.alt });
    }
  }

  let offers: StoreBundleOffer[] = bundleRows.map((row) => {
    const econ = econMap.get(row.id);
    if (!econ) {
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        basePrice: Number(row.basePrice),
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
        inStock: row.currentStock === -1 || (row.currentStock ?? 0) > 0,
        image: imageMap.get(row.id) ?? null,
        itemsTotalAtRetail: 0,
        savings: 0,
        savingsPercent: 0,
        includedNames: [],
        lines: [],
      };
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      basePrice: Number(row.basePrice),
      compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
      inStock: row.currentStock === -1 || (row.currentStock ?? 0) > 0,
      image: imageMap.get(row.id) ?? null,
      ...econ,
    };
  });

  if (opts?.pricingTier === "merchant" && offers.length > 0) {
    const pids = offers.map((o) => o.id);
    const tiers = await db
      .select({
        productId: productPricing.productId,
        wholesalePrice: productPricing.wholesalePrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, pids), eq(productPricing.customerType, "merchant")),
      );
    const retailTiers = await db
      .select({
        productId: productPricing.productId,
        retailPrice: productPricing.retailPrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, pids), eq(productPricing.customerType, "retail")),
      );
    const wm = new Map(tiers.map((t) => [t.productId, t]));
    const rm = new Map(retailTiers.map((t) => [t.productId, t]));
    offers = offers.map((o) => {
      const m = wm.get(o.id);
      const r = rm.get(o.id);
      if (!m?.wholesalePrice) return o;
      const wholesale = Number(m.wholesalePrice);
      const retail = r?.retailPrice ? Number(r.retailPrice) : null;
      return {
        ...o,
        basePrice: wholesale,
        compareAtPrice: retail ?? o.compareAtPrice,
      };
    });
  }

  return offers;
}

// ---------------------------------------------------------------------------
// Products — Detail
// ---------------------------------------------------------------------------

export async function getProductBySlug(
  slug: string,
  opts?: { pricingTier?: "retail" | "merchant" },
): Promise<StoreProductDetail | null> {
  const db = getDb();

  // 1. Fetch product
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      isFeatured: products.isFeatured,
      isNew: products.isNew,
      isBundle: products.isBundle,
      averageRating: products.averageRating,
      ratingCount: products.ratingCount,
      reviewCount: products.reviewCount,
      currentStock: products.currentStock,
      videoUrl: products.videoUrl,
      videoThumbnail: products.videoThumbnail,
    })
    .from(products)
    .where(and(activeProduct, eq(products.slug, slug)))
    .limit(1);

  if (!product) return null;

  // 2. Parallel fetches
  const [
    imageRows,
    groupRows,
    variantRows,
    reviewRows,
    reviewCountRow,
    catRows,
    offerRows,
  ] = await Promise.all([
    // Images
    db
      .select({
        id: productImages.id,
        url: productImages.url,
        alt: productImages.alt,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),

    // Option groups + values
    db
      .select({
        groupId: productOptionGroups.id,
        groupName: productOptionGroups.name,
        groupSortOrder: productOptionGroups.sortOrder,
        valueId: productOptionValues.id,
        valueText: productOptionValues.value,
        valueSortOrder: productOptionValues.sortOrder,
      })
      .from(productOptionGroups)
      .leftJoin(
        productOptionValues,
        eq(productOptionValues.optionGroupId, productOptionGroups.id),
      )
      .where(eq(productOptionGroups.productId, product.id))
      .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionValues.sortOrder)),

    // Variants
    db
      .select({
        id: productVariants.id,
        optionCombination: productVariants.optionCombination,
        price: productVariants.price,
        compareAtPrice: productVariants.compareAtPrice,
        stockCount: productVariants.stockCount,
        isDefault: productVariants.isDefault,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, product.id),
          eq(productVariants.isActive, true),
        ),
      ),

    // Reviews (latest 10)
    db
      .select({
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, product.id),
          eq(reviews.isApproved, true),
          eq(reviews.isActive, true),
          isNull(reviews.deletedAt),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(10),

    // Review total count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, product.id),
          eq(reviews.isApproved, true),
          eq(reviews.isActive, true),
          isNull(reviews.deletedAt),
        ),
      ),

    // Categories
    db
      .select({
        name: categories.name,
        slug: categories.slug,
      })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, product.id)),

    // Active offers
    db
      .select({
        name: offers.name,
        discountedPrice: productOffers.discountedPrice,
        banner: offers.banner,
      })
      .from(productOffers)
      .innerJoin(offers, eq(offers.id, productOffers.offerId))
      .where(
        and(
          eq(productOffers.productId, product.id),
          eq(offers.isActive, true),
          isNull(offers.deletedAt),
          lte(offers.startDate, sql`NOW()`),
          gte(offers.endDate, sql`NOW()`),
        ),
      ),

  ]);

  // Tags (separate query to avoid overloading connection pool)
  const tagRows = await db
    .select({
      tag: productTags.tag,
      tagGroup: productTags.tagGroup,
    })
    .from(productTags)
    .where(eq(productTags.productId, product.id));

  // Build option groups
  const groupMap = new Map<string, {
    id: string;
    name: string;
    sortOrder: number;
    values: Array<{ id: string; value: string; sortOrder: number }>;
  }>();
  for (const row of groupRows) {
    if (!groupMap.has(row.groupId)) {
      groupMap.set(row.groupId, {
        id: row.groupId,
        name: row.groupName,
        sortOrder: row.groupSortOrder,
        values: [],
      });
    }
    if (row.valueId) {
      groupMap.get(row.groupId)!.values.push({
        id: row.valueId,
        value: row.valueText!,
        sortOrder: row.valueSortOrder!,
      });
    }
  }

  // Similar products (tag-based with category fallback)
  const relatedProducts = await getSimilarProducts(product.id, {
    limit: 8,
    pricingTier: opts?.pricingTier,
    categorySlug: catRows[0]?.slug,
  });

  let basePrice = Number(product.basePrice);
  let compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  if (opts?.pricingTier === "merchant") {
    const [m] = await db
      .select({ wholesalePrice: productPricing.wholesalePrice })
      .from(productPricing)
      .where(
        and(eq(productPricing.productId, product.id), eq(productPricing.customerType, "merchant")),
      )
      .limit(1);
    const [r] = await db
      .select({ retailPrice: productPricing.retailPrice })
      .from(productPricing)
      .where(
        and(eq(productPricing.productId, product.id), eq(productPricing.customerType, "retail")),
      )
      .limit(1);
    if (m?.wholesalePrice) {
      basePrice = Number(m.wholesalePrice);
      compareAtPrice = r?.retailPrice ? Number(r.retailPrice) : compareAtPrice;
    }
  }

  let bundle: StoreBundleEconomics | null = null;
  let bundlesContaining: StoreBundleOffer[] = [];
  if (product.isBundle) {
    const econMap = await loadBundleEconomicsForIds(db, [product.id]);
    bundle = econMap.get(product.id) ?? null;
  } else {
    bundlesContaining = await getBundlesContainingProduct(product.id, opts);
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice,
    compareAtPrice,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBundle: product.isBundle,
    bundle,
    bundlesContaining,
    averageRating: Number(product.averageRating ?? 0),
    ratingCount: product.ratingCount,
    reviewCount: product.reviewCount,
    inStock: product.currentStock === -1 || (product.currentStock ?? 0) > 0,
    videoUrl: product.videoUrl,
    videoThumbnail: product.videoThumbnail,
    images: imageRows,
    optionGroups: Array.from(groupMap.values()),
    variants: variantRows.map((v) => ({
      id: v.id,
      optionCombination: v.optionCombination,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      inStock: v.stockCount > 0,
      isDefault: v.isDefault,
    })),
    reviews: {
      items: reviewRows.map((r) => ({
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt.toISOString(),
      })),
      total: reviewCountRow[0]?.count ?? 0,
      averageRating: Number(product.averageRating ?? 0),
    },
    relatedProducts,
    offers: offerRows.map((o) => ({
      name: o.name,
      discountedPrice: Number(o.discountedPrice),
      banner: o.banner,
    })),
    categories: catRows,
    tags: tagRows,
  };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export async function getActiveOffers(displayType?: string): Promise<StoreOffer[]> {
  const db = getDb();
  const conditions: any[] = [
    eq(offers.isActive, true),
    isNull(offers.deletedAt),
    lte(offers.startDate, sql`NOW()`),
    gte(offers.endDate, sql`NOW()`),
  ];

  if (displayType) {
    conditions.push(eq(offers.displayType, displayType));
  }

  const rows = await db
    .select({
      id: offers.id,
      name: offers.name,
      slug: offers.slug,
      description: offers.description,
      type: offers.type,
      value: offers.value,
      banner: offers.banner,
      displayType: offers.displayType,
      displayPosition: offers.displayPosition,
      backgroundColor: offers.backgroundColor,
      textColor: offers.textColor,
      showCountdown: offers.showCountdown,
      ctaText: offers.ctaText,
      ctaLink: offers.ctaLink,
      featuredImage: offers.featuredImage,
      endDate: offers.endDate,
    })
    .from(offers)
    .where(and(...conditions))
    .orderBy(asc(offers.displayPosition));

  return rows.map((r) => ({
    ...r,
    value: Number(r.value),
    endDate: r.endDate.toISOString(),
  }));
}

/** Filter inventory `values` to keys visible to storefront customers (parallel to `items`). */
async function customerDeliveryRowsForItems(
  items: Array<{
    productId: string | null;
    deliveredInventoryIds: unknown;
  }>
): Promise<Record<string, unknown>[][]> {
  const db = getDb();
  const out: Record<string, unknown>[][] = [];

  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))] as string[];
  if (productIds.length === 0) {
    return items.map(() => []);
  }

  const prows = await db
    .select({
      id: products.id,
      inventoryTemplateId: products.inventoryTemplateId,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const templateIds = [...new Set(prows.map((p) => p.inventoryTemplateId).filter(Boolean))] as string[];
  const trows =
    templateIds.length > 0
      ? await db
          .select({
            id: inventoryTemplates.id,
            fieldsSchema: inventoryTemplates.fieldsSchema,
          })
          .from(inventoryTemplates)
          .where(inArray(inventoryTemplates.id, templateIds))
      : [];

  const schemaByTpl = new Map<string, TemplateField[]>();
  for (const t of trows) {
    const fs = t.fieldsSchema;
    schemaByTpl.set(t.id, Array.isArray(fs) ? (fs as TemplateField[]) : []);
  }
  const visibleNamesByProduct = new Map<string, Set<string>>();
  for (const p of prows) {
    if (!p.inventoryTemplateId) continue;
    const fields = schemaByTpl.get(p.inventoryTemplateId) ?? [];
    const names = filterFieldsByVisibility(fields, "customer").map((f) => f.name);
    visibleNamesByProduct.set(p.id, new Set(names));
  }

  const allInvIds = new Set<string>();
  for (const it of items) {
    const raw = it.deliveredInventoryIds;
    const ids = Array.isArray(raw) ? (raw as string[]).filter((x) => typeof x === "string") : [];
    for (const id of ids) allInvIds.add(id);
  }

  const invById = new Map<string, Record<string, unknown>>();
  if (allInvIds.size > 0) {
    const invRows = await db
      .select({ id: inventoryItems.id, values: inventoryItems.values })
      .from(inventoryItems)
      .where(inArray(inventoryItems.id, [...allInvIds]));
    for (const r of invRows) {
      invById.set(r.id, (r.values || {}) as Record<string, unknown>);
    }
  }

  for (const it of items) {
    const pid = it.productId;
    const raw = it.deliveredInventoryIds;
    const ids = Array.isArray(raw) ? (raw as string[]).filter((x) => typeof x === "string") : [];
    if (!pid || ids.length === 0) {
      out.push([]);
      continue;
    }
    const allowed = visibleNamesByProduct.get(pid) ?? new Set();
    const rows: Record<string, unknown>[] = [];
    for (const invId of ids) {
      const vals = invById.get(invId);
      if (!vals) continue;
      const filtered: Record<string, unknown> = {};
      for (const name of allowed) {
        if (name === "_metadata") continue;
        if (vals[name] !== undefined) filtered[name] = vals[name];
      }
      rows.push(filtered);
    }
    out.push(rows);
  }

  return out;
}

/** Public order view after checkout (token proves link ownership). */
export async function getStoreOrderPublic(orderNumber: string, checkoutToken: string | null) {
  if (!checkoutToken) return null;
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;
  const meta = order.metadata as Record<string, unknown> | null;
  if (!meta || meta.checkoutToken !== checkoutToken) return null;
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productSlug: orderItems.productSlug,
      quantity: orderItems.quantity,
      price: orderItems.price,
      subtotal: orderItems.subtotal,
      deliveredInventoryIds: orderItems.deliveredInventoryIds,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const deliveryRows = await customerDeliveryRowsForItems(items);
  const itemsWithDelivery = items.map((it, i) => ({
    ...it,
    customerDelivery: deliveryRows[i] ?? [],
  }));

  return { order, items: itemsWithDelivery };
}

export async function getOrdersForCustomer(customerId: string, limit = 50) {
  const db = getDb();
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      currency: orders.currency,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), isNull(orders.deletedAt)))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getCustomerOrderDetail(customerId: string, orderNumber: string) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        eq(orders.customerId, customerId),
        isNull(orders.deletedAt),
      ),
    )
    .limit(1);
  if (!order) return null;
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productSlug: orderItems.productSlug,
      quantity: orderItems.quantity,
      price: orderItems.price,
      subtotal: orderItems.subtotal,
      deliveredInventoryIds: orderItems.deliveredInventoryIds,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const deliveryRows = await customerDeliveryRowsForItems(items);
  const itemsWithDelivery = items.map((it, i) => ({
    ...it,
    customerDelivery: deliveryRows[i] ?? [],
  }));

  return { order, items: itemsWithDelivery };
}

export type CustomerOrderDetail = NonNullable<Awaited<ReturnType<typeof getCustomerOrderDetail>>>;
export type CustomerOrderLineItem = CustomerOrderDetail["items"][number];

export type ReorderLinePayload = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  currentPrice: number;
  orderUnitPrice: number;
  inStock: boolean;
  priceChanged: boolean;
};

/** Current catalog state for re-adding order lines to the cart (storefront). */
export async function getReorderPayload(
  customerId: string,
  orderNumber: string,
  pricingTier: "retail" | "merchant",
): Promise<{ lines: ReorderLinePayload[]; warnings: string[] } | null> {
  const detail = await getCustomerOrderDetail(customerId, orderNumber);
  if (!detail) return null;

  const agg = new Map<
    string,
    { quantity: number; orderUnit: number; name: string; slug: string }
  >();
  for (const it of detail.items) {
    if (!it.productId) continue;
    const q = it.quantity;
    const unit = Number(it.price);
    const prev = agg.get(it.productId);
    if (prev) {
      agg.set(it.productId, {
        quantity: prev.quantity + q,
        orderUnit: prev.orderUnit,
        name: prev.name,
        slug: prev.slug,
      });
    } else {
      agg.set(it.productId, {
        quantity: q,
        orderUnit: unit,
        name: it.productName,
        slug: it.productSlug,
      });
    }
  }

  const warnings: string[] = [];
  if (agg.size === 0) {
    warnings.push("This order has no linked products to reorder.");
    return { lines: [], warnings };
  }

  const db = getDb();
  const ids = [...agg.keys()];
  const prodRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      basePrice: products.basePrice,
      currentStock: products.currentStock,
      isActive: products.isActive,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .where(inArray(products.id, ids));

  const imageRows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(sql`${productImages.productId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(asc(productImages.sortOrder));

  const imageMap = new Map<string, string>();
  for (const im of imageRows) {
    if (!imageMap.has(im.productId)) imageMap.set(im.productId, im.url);
  }

  let merchantMap = new Map<string, number>();
  let retailMap = new Map<string, number>();
  if (pricingTier === "merchant" && ids.length > 0) {
    const mt = await db
      .select({
        productId: productPricing.productId,
        wholesalePrice: productPricing.wholesalePrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, ids), eq(productPricing.customerType, "merchant")),
      );
    merchantMap = new Map(mt.map((r) => [r.productId, Number(r.wholesalePrice ?? 0)]));
    const rt = await db
      .select({
        productId: productPricing.productId,
        retailPrice: productPricing.retailPrice,
      })
      .from(productPricing)
      .where(
        and(inArray(productPricing.productId, ids), eq(productPricing.customerType, "retail")),
      );
    retailMap = new Map(rt.map((r) => [r.productId, Number(r.retailPrice ?? 0)]));
  }

  const lines: ReorderLinePayload[] = [];
  for (const [pid, a] of agg) {
    const p = prodRows.find((r) => r.id === pid);
    if (!p || !p.isActive || p.deletedAt) {
      warnings.push(`${a.name} is no longer available.`);
      continue;
    }

    let currentPrice = Number(p.basePrice);
    if (pricingTier === "merchant") {
      const w = merchantMap.get(pid);
      if (w != null && w > 0) currentPrice = w;
    }

    const inStock = p.currentStock === -1 || (p.currentStock ?? 0) > 0;
    if (!inStock) {
      warnings.push(`${p.name} is out of stock — not added to cart.`);
    }

    const priceChanged = Math.abs(currentPrice - a.orderUnit) > 0.01;

    lines.push({
      productId: pid,
      slug: p.slug,
      name: p.name,
      imageUrl: imageMap.get(pid) ?? null,
      quantity: a.quantity,
      currentPrice,
      orderUnitPrice: a.orderUnit,
      inStock,
      priceChanged,
    });
  }

  return { lines, warnings };
}

// ---------------------------------------------------------------------------
// Similar Products (tag-based)
// ---------------------------------------------------------------------------

/**
 * Find products similar to the given product based on shared tags.
 * Falls back to same-category products if no tag matches found.
 */
export async function getSimilarProducts(
  productId: string,
  opts?: {
    limit?: number;
    pricingTier?: "retail" | "merchant";
    categorySlug?: string;
  },
): Promise<StoreProduct[]> {
  const db = getDb();
  const maxItems = opts?.limit ?? 8;

  // 1. Tag-similarity: find products sharing the most tags with current product
  const similarRows = await db.execute<{ id: string; similarity_score: number }>(sql`
    SELECT p."id", COUNT(*)::int AS similarity_score
    FROM ${products} p
    JOIN ${productTags} pt ON pt."product_id" = p."id"
    WHERE pt."tag" IN (
      SELECT "tag" FROM ${productTags} WHERE "product_id" = ${productId}
    )
    AND p."id" != ${productId}
    AND p."is_active" = true
    AND p."deleted_at" IS NULL
    GROUP BY p."id"
    ORDER BY similarity_score DESC
    LIMIT ${maxItems + 1}
  `);

  const similarIds = (similarRows.rows as any[]).map((r) => r.id as string);

  if (similarIds.length > 0) {
    // Fetch full StoreProduct data for the matched IDs
    const result = await getActiveProducts({
      limit: 48,
      pricingTier: opts?.pricingTier,
    });
    const productMap = new Map(result.products.map((p) => [p.id, p]));
    const ordered = similarIds
      .map((id) => productMap.get(id))
      .filter((p): p is StoreProduct => !!p)
      .slice(0, maxItems);
    if (ordered.length > 0) return ordered;
  }

  // 2. Fallback: same-category products
  if (opts?.categorySlug) {
    const result = await getActiveProducts({
      categorySlug: opts.categorySlug,
      limit: maxItems + 1,
      sort: "popular",
      pricingTier: opts?.pricingTier,
    });
    return result.products.filter((p) => p.id !== productId).slice(0, maxItems);
  }

  return [];
}

// ---------------------------------------------------------------------------
// "Customers Also Bought" (co-occurrence)
// ---------------------------------------------------------------------------

/**
 * Find products frequently purchased alongside the given product.
 * Uses order-item co-occurrence: counts how often other products appear
 * in the same orders as the target product.
 */
export async function getAlsoBought(
  productId: string,
  opts?: { limit?: number; pricingTier?: "retail" | "merchant" },
): Promise<StoreProduct[]> {
  const db = getDb();
  const maxItems = opts?.limit ?? 4;

  const coRows = await db.execute<{ product_id: string; co_count: number }>(sql`
    SELECT oi2."product_id", COUNT(*)::int AS co_count
    FROM ${orderItems} oi1
    JOIN ${orderItems} oi2 ON oi1."order_id" = oi2."order_id"
    JOIN ${products} p ON p."id" = oi2."product_id"
    WHERE oi1."product_id" = ${productId}
      AND oi2."product_id" != ${productId}
      AND p."is_active" = true
      AND p."deleted_at" IS NULL
    GROUP BY oi2."product_id"
    ORDER BY co_count DESC
    LIMIT ${maxItems + 1}
  `);

  const ids = (coRows.rows as any[]).map((r) => r.product_id as string);
  if (ids.length === 0) return [];

  const result = await getActiveProducts({
    limit: 48,
    pricingTier: opts?.pricingTier,
  });
  const productMap = new Map(result.products.map((p) => [p.id, p]));
  return ids
    .map((id) => productMap.get(id))
    .filter((p): p is StoreProduct => !!p)
    .slice(0, maxItems);
}
