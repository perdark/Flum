/**
 * Products Summary API - Lightweight product picker
 *
 * GET /api/products/summary - Returns minimal product info for pickers
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, inventoryTemplates, inventoryItems, productCategories, categories } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, like, or, desc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const db = getDb();

    // Build conditions
    const conditions = [sql`products.deleted_at IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.slug, `%${search}%`)
        )!
      );
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(products.isActive, isActive === "true"));
    }

    if (categoryId) {
      // Filter by category - need to join with product_categories
      const subQuery = db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, categoryId));

      // This won't work directly in the conditions array, so we'll handle it differently
      // For now, let's get all products and filter in memory, or use a different approach
      // We'll need to join first
    }

    // Get products with minimal data + inventory counts + categories
    const productsList = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        isActive: products.isActive,
        price: products.basePrice,
        stockCount: products.stockCount,
        totalSold: products.totalSold,
        inventoryTemplateId: products.inventoryTemplateId,
        templateName: inventoryTemplates.name,
        // Count available items per status
        availableCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE inventory_items.product_id = products.id
            AND inventory_items.status = 'available'
            AND inventory_items.deleted_at IS NULL
        )`,
        reservedCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE inventory_items.product_id = products.id
            AND inventory_items.status = 'reserved'
            AND inventory_items.deleted_at IS NULL
        )`,
        soldCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE inventory_items.product_id = products.id
            AND inventory_items.status = 'sold'
            AND inventory_items.deleted_at IS NULL
        )`,
      })
      .from(products)
      .leftJoin(inventoryTemplates, eq(products.inventoryTemplateId, inventoryTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit);

    // Get category links for each product
    const productIds = productsList.map((p) => p.id);
    let categoryLinks: any[] = [];
    if (productIds.length > 0) {
      categoryLinks = await db
        .select({
          productId: productCategories.productId,
          categoryId: productCategories.categoryId,
          categoryName: categories.name,
          parentId: categories.parentId,
        })
        .from(productCategories)
        .innerJoin(categories, eq(productCategories.categoryId, categories.id))
        .where(inArray(productCategories.productId, productIds));
    }

    // Attach categories to products and filter by category if needed
    let result = productsList.map((product) => ({
      ...product,
      categories: categoryLinks
        .filter((c) => c.productId === product.id)
        .map((c) => ({
          id: c.categoryId,
          name: c.categoryName,
          parentId: c.parentId,
        })),
    }));

    // Filter by category after the fact (since we need the join data)
    if (categoryId) {
      result = result.filter((p) =>
        p.categories.some((c: any) => c.id === categoryId)
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
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

    console.error("Get products summary error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
