/**
 * Individual Product API Routes
 *
 * GET /api/products/[id] - Get product by ID
 * PUT /api/products/[id] - Update product
 * DELETE /api/products/[id] - Delete product (soft delete)
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
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logProductUpdated, logProductDeleted } from "@/services/activityLog";
import { generateSlug } from "@/lib/utils";

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
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get categories and images
    const [categoryLinks, images] = await Promise.all([
      db.select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
        .from(productCategories)
        .innerJoin(categories, eq(productCategories.categoryId, categories.id))
        .where(eq(productCategories.productId, id)),
      db.select()
        .from(productImages)
        .where(eq(productImages.productId, id))
        .orderBy(productImages.sortOrder),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        categories: categoryLinks,
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
      nameAr,
      slug: providedSlug,
      description,
      descriptionAr,
      sku,
      basePrice,
      compareAtPrice,
      deliveryType,
      inventoryTemplateId,
      isActive,
      isFeatured,
      isNew,
      maxQuantity,
      currentStock,
      videoUrl,
      videoThumbnail,
      categoryIds,
      images,
      // Multi-sell fields
      multiSellEnabled,
      multiSellFactor,
      cooldownEnabled,
      cooldownDurationHours,
      // Bundle fields
      isBundle,
      bundleTemplateId,
      bundleItems,
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
      // Auto-update slug if not provided
      if (!providedSlug && existing.slug === generateSlug(existing.name)) {
        updateData.slug = generateSlug(name);
      }
    }
    if (providedSlug !== undefined && providedSlug !== existing.slug) {
      changes.slug = { from: existing.slug, to: providedSlug };
      updateData.slug = providedSlug;
    }
    if (nameAr !== undefined) {
      changes.nameAr = { from: existing.nameAr, to: nameAr };
      updateData.nameAr = nameAr?.trim() || null;
    }
    if (description !== undefined) {
      changes.description = { from: existing.description, to: description };
      updateData.description = description?.trim() || null;
    }
    if (descriptionAr !== undefined) {
      changes.descriptionAr = { from: existing.descriptionAr, to: descriptionAr };
      updateData.descriptionAr = descriptionAr?.trim() || null;
    }
    if (sku !== undefined) {
      changes.sku = { from: existing.sku, to: sku };
      updateData.sku = sku?.trim() || null;
    }
    if (basePrice !== undefined) {
      changes.basePrice = { from: existing.basePrice, to: basePrice };
      updateData.basePrice = basePrice.toString();
    }
    if (compareAtPrice !== undefined) {
      changes.compareAtPrice = { from: existing.compareAtPrice, to: compareAtPrice };
      updateData.compareAtPrice = compareAtPrice ? compareAtPrice.toString() : null;
    }
    if (deliveryType !== undefined) {
      changes.deliveryType = { from: existing.deliveryType, to: deliveryType };
      updateData.deliveryType = deliveryType;
    }
    if (inventoryTemplateId !== undefined) {
      changes.inventoryTemplateId = { from: existing.inventoryTemplateId, to: inventoryTemplateId };
      updateData.inventoryTemplateId = inventoryTemplateId || null;
    }
    if (isActive !== undefined) {
      changes.isActive = { from: existing.isActive, to: isActive };
      updateData.isActive = isActive;
    }
    if (isFeatured !== undefined) {
      changes.isFeatured = { from: existing.isFeatured, to: isFeatured };
      updateData.isFeatured = isFeatured;
    }
    if (isNew !== undefined) {
      changes.isNew = { from: existing.isNew, to: isNew };
      updateData.isNew = isNew;
    }
    if (maxQuantity !== undefined) {
      changes.maxQuantity = { from: existing.maxQuantity, to: maxQuantity };
      updateData.maxQuantity = maxQuantity;
    }
    if (currentStock !== undefined) {
      changes.currentStock = { from: existing.currentStock, to: currentStock };
      updateData.currentStock = currentStock;
    }
    if (videoUrl !== undefined) {
      changes.videoUrl = { from: existing.videoUrl, to: videoUrl };
      updateData.videoUrl = videoUrl?.trim() || null;
    }
    if (videoThumbnail !== undefined) {
      changes.videoThumbnail = { from: existing.videoThumbnail, to: videoThumbnail };
      updateData.videoThumbnail = videoThumbnail?.trim() || null;
    }

    // Multi-sell fields
    if (multiSellEnabled !== undefined) {
      changes.multiSellEnabled = { from: existing.multiSellEnabled, to: multiSellEnabled };
      updateData.multiSellEnabled = multiSellEnabled;
    }
    if (multiSellFactor !== undefined) {
      changes.multiSellFactor = { from: existing.multiSellFactor, to: multiSellFactor };
      updateData.multiSellFactor = multiSellFactor;
    }
    if (cooldownEnabled !== undefined) {
      changes.cooldownEnabled = { from: existing.cooldownEnabled, to: cooldownEnabled };
      updateData.cooldownEnabled = cooldownEnabled;
    }
    if (cooldownDurationHours !== undefined) {
      changes.cooldownDurationHours = { from: existing.cooldownDurationHours, to: cooldownDurationHours };
      updateData.cooldownDurationHours = cooldownDurationHours;
    }

    // Bundle fields
    if (isBundle !== undefined) {
      changes.isBundle = { from: existing.isBundle, to: isBundle };
      updateData.isBundle = isBundle;
    }
    if (bundleTemplateId !== undefined) {
      changes.bundleTemplateId = { from: existing.bundleTemplateId, to: bundleTemplateId };
      updateData.bundleTemplateId = bundleTemplateId || null;
    }

    // Update product
    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    // Update category links if provided
    if (categoryIds !== undefined) {
      // Validate categoryIds
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

      // Delete existing links
      await db.delete(productCategories).where(eq(productCategories.productId, id));

      // Add new links
      if (categoryIds.length > 0) {
        await db.insert(productCategories).values(
          categoryIds.map((categoryId: string) => ({
            productId: id,
            categoryId,
          }))
        );
      }

      changes.categories = { updated: true };
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
            sortOrder: img.order ?? index,
          }))
        );
      }

      changes.images = { updated: true };
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
