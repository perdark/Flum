/**
 * Individual Product API Routes
 *
 * GET /api/products/[id] - Get product by ID
 * PUT /api/products/[id] - Update product
 * DELETE /api/products/[id] - Delete product (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productPlatforms, productImages, productPlatformLinks, platforms, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logProductUpdated, logProductDeleted } from "@/services/activityLog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/products/[id] - Get product
// ============================================================================()

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const db = getDb();

    const [product] = await db
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
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get platforms and images
    const [platformLinks, images] = await Promise.all([
      db.select({
        id: platforms.id,
        name: platforms.name,
        parentId: platforms.parentId,
      })
        .from(productPlatformLinks)
        .innerJoin(platforms, eq(productPlatformLinks.platformId, platforms.id))
        .where(eq(productPlatformLinks.productId, id)),
      db.select()
        .from(productImages)
        .where(eq(productImages.productId, id))
        .orderBy(productImages.order),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        platforms: platformLinks,
        images,
      },
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/products/[id] - Update product
// ============================================================================()

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    const body = await request.json();
    const {
      name,
      slug,
      description,
      price,
      inventoryTemplateId,
      isActive,
      platformIds,
      images,
    } = body;

    const db = getDb();

    // Check if product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Track changes for logging
    const changes: Record<string, unknown> = {};
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined && name !== existing.name) {
      changes.name = { from: existing.name, to: name };
      updateData.name = name;
    }
    if (slug !== undefined && slug !== existing.slug) {
      changes.slug = { from: existing.slug, to: slug };
      updateData.slug = slug;
    }
    if (description !== undefined) {
      changes.description = { from: existing.description, to: description };
      updateData.description = description;
    }
    if (price !== undefined) {
      changes.price = { from: existing.price, to: price };
      updateData.price = price.toString();
    }
    if (inventoryTemplateId !== undefined) {
      changes.inventoryTemplateId = { from: existing.inventoryTemplateId, to: inventoryTemplateId };
      updateData.inventoryTemplateId = inventoryTemplateId;
    }
    if (isActive !== undefined) {
      changes.isActive = { from: existing.isActive, to: isActive };
      updateData.isActive = isActive;
    }

    // Update product
    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    // Update platform links if provided
    if (platformIds !== undefined) {
      // Validate platformIds
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

      // Delete existing links
      await db.delete(productPlatformLinks).where(eq(productPlatformLinks.productId, id));

      // Add new links
      if (platformIds.length > 0) {
        await db.insert(productPlatformLinks).values(
          platformIds.map((platformId: string) => ({
            productId: id,
            platformId,
          }))
        );
      }

      changes.platforms = { updated: true };
    }

    // Update images if provided
    if (images !== undefined) {
      await db.delete(productImages).where(eq(productImages.productId, id));

      if (images.length > 0) {
        await db.insert(productImages).values(
          images.map((img: { url: string; alt?: string; order?: number }, index: number) => ({
            productId: id,
            url: img.url,
            alt: img.alt || null,
            order: img.order ?? index,
          }))
        );
      }
    }

    // Log activity
    if (Object.keys(changes).length > 0) {
      await logProductUpdated(user.id, id, changes);
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
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

    console.error("Update product error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/products/[id] - Soft delete product
// ============================================================================()

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    const db = getDb();

    // Check if product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(products)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // Log activity
    await logProductDeleted(user.id, id, existing.name);

    return NextResponse.json({
      success: true,
      data: { message: "Product deleted successfully" },
    });
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

    console.error("Delete product error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
