/**
 * Products API Routes
 *
 * GET /api/products - List all products (with filtering, pagination)
 * POST /api/products - Create a new product (admin/staff only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  products,
  productCategories,
  productImages,
  categories,
  inventoryTemplates,
  inventoryUnits,
  bundleItems,
  productPricing,
} from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, like, or, desc, asc, sql, and, inArray } from "drizzle-orm";
import { logProductCreated } from "@/services/activityLog";
import { generateSlug } from "@/lib/utils";

// ============================================================================
// GET /api/products - List products
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build query conditions
    const conditions = [sql`products.deleted_at IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.nameAr || "", `%${search}%`),
          like(products.description || "", `%${search}%`),
          like(products.descriptionAr || "", `%${search}%`),
          like(products.sku || "", `%${search}%`)
        )!
      );
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(products.isActive, isActive === "true"));
    }

    if (categoryId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM product_categories pc
          WHERE pc.product_id = products.id AND pc.category_id = ${categoryId}
        )`
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Get products with related data
    const productsList = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        nameAr: products.nameAr,
        description: products.description,
        descriptionAr: products.descriptionAr,
        sku: products.sku,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        deliveryType: products.deliveryType,
        inventoryTemplateId: products.inventoryTemplateId,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        maxQuantity: products.maxQuantity,
        stockCount: products.stockCount,
        totalSold: products.totalSold,
        currentStock: products.currentStock,
        videoUrl: products.videoUrl,
        videoThumbnail: products.videoThumbnail,
        views: products.views,
        salesCount: products.salesCount,
        averageRating: products.averageRating,
        ratingCount: products.ratingCount,
        reviewCount: products.reviewCount,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        templateName: inventoryTemplates.name,
        // Multi-sell fields
        multiSellEnabled: products.multiSellEnabled,
        multiSellFactor: products.multiSellFactor,
        cooldownEnabled: products.cooldownEnabled,
        cooldownDurationHours: products.cooldownDurationHours,
        // Bundle fields
        isBundle: products.isBundle,
        bundleTemplateId: products.bundleTemplateId,
      })
      .from(products)
      .leftJoin(inventoryTemplates, eq(products.inventoryTemplateId, inventoryTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        (() => {
          const validSortColumns: Record<string, any> = {
            name: products.name,
            basePrice: products.basePrice,
            stockCount: products.stockCount,
            totalSold: products.totalSold,
            averageRating: products.averageRating,
            createdAt: products.createdAt,
          };
          const sortColumn = validSortColumns[sortBy] || products.createdAt;
          return sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
        })()
      )
      .limit(limit)
      .offset(offset);

    // Get categories and images for each product
    const productIds = productsList.map((p) => p.id);

    // Only query related data if we have products
    let categoryLinksList: Array<{
      id: string;
      productId: string;
      categoryId: string;
      categoryName: string;
      categoryParentId: string | null;
    }> = [];
    let imagesList: typeof productImages.$inferSelect[] = [];

    if (productIds.length > 0) {
      [categoryLinksList, imagesList] = await Promise.all([
        db
          .select({
            id: productCategories.id,
            productId: productCategories.productId,
            categoryId: productCategories.categoryId,
            categoryName: categories.name,
            categoryParentId: categories.parentId,
          })
          .from(productCategories)
          .innerJoin(categories, eq(productCategories.categoryId, categories.id))
          .where(inArray(productCategories.productId, productIds)),
        db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.sortOrder),
      ]);
    }

    // Group related data
    const productsWithRelations = productsList.map((product) => ({
      ...product,
      categories: categoryLinksList
        .filter((c) => c.productId === product.id)
        .map((c) => ({
          id: c.categoryId,
          name: c.categoryName,
          parentId: c.categoryParentId,
        })),
      images: imagesList.filter((i) => i.productId === product.id),
    }));

    return NextResponse.json({
      success: true,
      data: productsWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/products - Create product
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const body = await request.json();
    const {
      name,
      nameAr,
      slug: providedSlug,
      description,
      descriptionAr,
      sku,
      basePrice,
      cost,
      compareAtPrice,
      deliveryType = "manual",
      inventoryTemplateId,
      categoryIds = [],
      images = [],
      isActive = true,
      isFeatured = false,
      isNew = false,
      maxQuantity = 999,
      currentStock = -1,
      videoUrl,
      videoThumbnail,
      // Multi-sell fields
      multiSellEnabled = false,
      multiSellFactor = 5,
      cooldownEnabled = false,
      cooldownDurationHours = 12,
      // Bundle fields
      isBundle = false,
      bundleTemplateId = null,
      bundleItems = [],
    } = body;

    // Validate input
    if (!name || !basePrice) {
      return NextResponse.json(
        { success: false, error: "Name and base price are required" },
        { status: 400 }
      );
    }

    if (!deliveryType) {
      return NextResponse.json(
        { success: false, error: "Delivery type is required" },
        { status: 400 }
      );
    }

    const validDeliveryTypes = ["manual", "auto"];
    if (!validDeliveryTypes.includes(deliveryType)) {
      return NextResponse.json(
        { success: false, error: `Invalid delivery type. Must be one of: ${validDeliveryTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const slug = providedSlug || generateSlug(name);

    const db = getDb();

    // Check if slug is unique
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Product with this slug already exists" },
        { status: 409 }
      );
    }

    // Check if SKU is unique (if provided)
    if (sku && sku.trim()) {
      const existingSku = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku.trim()))
        .limit(1);

      if (existingSku.length > 0) {
        return NextResponse.json(
          { success: false, error: "Product with this SKU already exists" },
          { status: 409 }
        );
      }
    }

    // Validate categoryIds if provided
    if (categoryIds.length > 0) {
      const categoryCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(categories)
        .where(
          and(
            inArray(categories.id, categoryIds),
            sql`${categories.deletedAt} IS NULL`,
            eq(categories.isActive, true)
          )
        );

      if (categoryCount[0]?.count !== categoryIds.length) {
        return NextResponse.json(
          { success: false, error: "One or more categories are invalid or inactive" },
          { status: 400 }
        );
      }
    }

    // Create product
    const [newProduct] = await db
      .insert(products)
      .values({
        name: name.trim(),
        nameAr: nameAr?.trim() || null,
        slug,
        description: description?.trim() || null,
        descriptionAr: descriptionAr?.trim() || null,
        sku: sku?.trim() || null,
        basePrice: basePrice.toString(),
        compareAtPrice: compareAtPrice ? compareAtPrice.toString() : null,
        deliveryType,
        inventoryTemplateId: inventoryTemplateId || null,
        isActive,
        isFeatured,
        isNew,
        maxQuantity,
        currentStock,
        stockCount: 0,
        totalSold: 0,
        videoUrl: videoUrl?.trim() || null,
        videoThumbnail: videoThumbnail?.trim() || null,
        views: 0,
        salesCount: 0,
        averageRating: "0.00",
        ratingCount: 0,
        reviewCount: 0,
        // Multi-sell fields
        multiSellEnabled,
        multiSellFactor,
        cooldownEnabled,
        cooldownDurationHours,
        // Bundle fields
        isBundle,
        bundleTemplateId: bundleTemplateId || null,
      })
      .returning();

    // Add category links if provided
    if (categoryIds.length > 0) {
      await db.insert(productCategories).values(
        categoryIds.map((categoryId: string) => ({
          productId: newProduct.id,
          categoryId,
        }))
      );
    }

    // Add images if provided
    if (images.length > 0) {
      await db.insert(productImages).values(
        images.map((img: { url: string; alt?: string; order?: number }, index: number) => ({
          productId: newProduct.id,
          url: img.url,
          alt: img.alt || null,
          sortOrder: img.order ?? index,
        }))
      );
    }

    // Create inventory units for multi-sell products
    if (multiSellEnabled && currentStock > 0) {
      const unitsToCreate = Math.min(currentStock, 100);
      const inventoryUnitsToInsert = Array.from(
        { length: unitsToCreate },
        (_, i) => ({
          productId: newProduct.id,
          physicalUnitId: `${newProduct.id.slice(0, 8)}-${i + 1}`,
          maxSales: multiSellFactor,
          cooldownDurationHours,
          status: "available" as const,
          saleCount: 0,
        })
      );
      await db.insert(inventoryUnits).values(inventoryUnitsToInsert);
    }

    // Create bundle items if it's a bundle
    if (isBundle && bundleItems && bundleItems.length > 0) {
      const bundleItemsToInsert = bundleItems.map((item: any) => ({
        bundleProductId: newProduct.id,
        templateFieldId: item.templateFieldId || "default",
        lineIndex: item.lineIndex || 0,
        productName: item.productName,
        quantity: item.quantity || 1,
        priceOverride: item.priceOverride ? item.priceOverride.toString() : null,
      }));
      await db.insert(bundleItems).values(bundleItemsToInsert);
    }

    // Create default pricing tiers
    await db.insert(productPricing).values([
      {
        productId: newProduct.id,
        customerType: "retail",
        cost: cost ? cost.toString() : null,
        retailPrice: basePrice.toString(),
        currency: "USD",
        creditEligible: false,
      },
      {
        productId: newProduct.id,
        customerType: "merchant",
        cost: cost ? cost.toString() : null,
        wholesalePrice: (parseFloat(basePrice) * 0.7).toFixed(2),
        currency: "USD",
        creditEligible: true,
        creditTermsDays: 30,
      },
    ]).onConflictDoNothing();

    // Log activity
    await logProductCreated(user.id, newProduct.id, name);

    return NextResponse.json({
      success: true,
      data: newProduct,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/products - Bulk update products
// ============================================================================()

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product IDs are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    if (action === "activate") {
      await db
        .update(products)
        .set({ isActive: true })
        .where(inArray(products.id, ids));
      return NextResponse.json({ success: true, data: { updated: ids.length } });
    }

    if (action === "deactivate") {
      await db
        .update(products)
        .set({ isActive: false })
        .where(inArray(products.id, ids));
      return NextResponse.json({ success: true, data: { updated: ids.length } });
    }

    if (action === "delete") {
      await db
        .update(products)
        .set({ deletedAt: new Date() })
        .where(inArray(products.id, ids));
      return NextResponse.json({ success: true, data: { deleted: ids.length } });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use: activate, deactivate, delete" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Bulk update products error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
