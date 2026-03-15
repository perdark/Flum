/**
 * Products API Routes
 *
 * GET /api/products - List all products (with filtering, pagination)
 * POST /api/products - Create a new product (admin/staff only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productPlatforms, productImages, platforms, inventoryTemplates } from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, like, or, desc, sql, and, inArray } from "drizzle-orm";
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
        categoryId: products.categoryId,
        deliveryType: products.deliveryType,
        inventoryTemplateId: products.inventoryTemplateId,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        pointsReward: products.pointsReward,
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
      })
      .from(products)
      .leftJoin(inventoryTemplates, eq(products.inventoryTemplateId, inventoryTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Get platforms and images for each product
    const productIds = productsList.map((p) => p.id);

    // Only query related data if we have products
    let platformLinksList: Array<{
      id: string;
      productId: string;
      platformId: string;
      platformName: string;
      platformParentId: string | null;
    }> = [];
    let imagesList: typeof productImages.$inferSelect[] = [];

    if (productIds.length > 0) {
      [platformLinksList, imagesList] = await Promise.all([
        db
          .select({
            id: productPlatforms.id,
            productId: productPlatforms.productId,
            platformId: productPlatforms.platformId,
            platformName: platforms.name,
            platformParentId: platforms.parentId,
          })
          .from(productPlatforms)
          .innerJoin(platforms, eq(productPlatforms.platformId, platforms.id))
          .where(inArray(productPlatforms.productId, productIds)),
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
      platforms: platformLinksList
        .filter((p) => p.productId === product.id)
        .map((p) => ({
          id: p.platformId,
          name: p.platformName,
          parentId: p.platformParentId,
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
      compareAtPrice,
      categoryId,
      deliveryType = "manual",
      inventoryTemplateId,
      platformIds = [],
      images = [],
      isActive = true,
      isFeatured = false,
      isNew = false,
      pointsReward = 0,
      maxQuantity = 999,
      currentStock = -1,
      videoUrl,
      videoThumbnail,
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

    const validDeliveryTypes = ["auto_key", "auto_account", "manual", "contact"];
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

    // Validate platformIds if provided
    if (platformIds.length > 0) {
      const platformCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(platforms)
        .where(
          and(
            inArray(platforms.id, platformIds),
            sql`${platforms.deletedAt} IS NULL`,
            eq(platforms.isActive, true)
          )
        );

      if (platformCount[0]?.count !== platformIds.length) {
        return NextResponse.json(
          { success: false, error: "One or more platforms are invalid or inactive" },
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
        categoryId: categoryId || null,
        deliveryType,
        inventoryTemplateId: inventoryTemplateId || null,
        isActive,
        isFeatured,
        isNew,
        pointsReward,
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
      })
      .returning();

    // Add platform links if provided
    if (platformIds.length > 0) {
      await db.insert(productPlatforms).values(
        platformIds.map((platformId: string) => ({
          productId: newProduct.id,
          platformId,
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
