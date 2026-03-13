/**
 * Products API Routes
 *
 * GET /api/products - List all products (with filtering, pagination)
 * POST /api/products - Create a new product (admin/staff only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productPlatforms, productImages, productPlatformLinks, platforms, inventoryTemplates } from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, like, or, desc, sql, and, inArray } from "drizzle-orm";
import { logProductCreated } from "@/services/activityLog";

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
          like(products.description || "", `%${search}%`)
        )
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
        description: products.description,
        price: products.price,
        inventoryTemplateId: products.inventoryTemplateId,
        isActive: products.isActive,
        stockCount: products.stockCount,
        totalSold: products.totalSold,
        averageRating: products.averageRating,
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
    let platformLinksList: typeof productPlatformLinks.$inferSelect[] = [];
    let imagesList: typeof productImages.$inferSelect[] = [];

    if (productIds.length > 0) {
      [platformLinksList, imagesList] = await Promise.all([
        db
          .select({
            id: productPlatformLinks.id,
            productId: productPlatformLinks.productId,
            platformId: productPlatformLinks.platformId,
            platformName: platforms.name,
            platformParentId: platforms.parentId,
          })
          .from(productPlatformLinks)
          .innerJoin(platforms, eq(productPlatformLinks.platformId, platforms.id))
          .where(inArray(productPlatformLinks.productId, productIds)),
        db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.order),
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
      slug,
      description,
      price,
      inventoryTemplateId,
      platformIds = [],
      images = [],
    } = body;

    // Validate input
    if (!name || !slug || !price) {
      return NextResponse.json(
        { success: false, error: "Name, slug, and price are required" },
        { status: 400 }
      );
    }

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
        name,
        slug,
        description,
        price: price.toString(),
        inventoryTemplateId,
        isActive: true,
        stockCount: 0,
        totalSold: 0,
      })
      .returning();

    // Add platform links if provided
    if (platformIds.length > 0) {
      await db.insert(productPlatformLinks).values(
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
          order: img.order ?? index,
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
