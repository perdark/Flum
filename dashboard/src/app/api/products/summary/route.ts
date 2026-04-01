/**
 * Products Summary API - Lightweight product picker
 *
 * GET /api/products/summary - Returns minimal product info for pickers
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, inventoryTemplates, productCategories, categories, bundleItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, like, or, desc, inArray } from "drizzle-orm";
import { sqlInventoryItemsCorrelatedToProducts } from "@/lib/inventoryProductScope";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const categoryId = searchParams.get("categoryId");
    const rawLimit = parseInt(searchParams.get("limit") || "80", 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 80, 1), 200);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

    const db = getDb();

    // Build conditions
    const conditions = [sql`products.deleted_at IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.slug, `%${search}%`),
          like(products.sku, `%${search}%`)
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
          WHERE pc.product_id = products.id AND pc.category_id = ${categoryId}::uuid
        )`
      );
    }

    // Get products with minimal data + inventory counts + categories
    const productsList = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        isActive: products.isActive,
        price: products.basePrice,
        basePrice: products.basePrice,
        deliveryType: products.deliveryType,
        stockCount: products.stockCount,
        totalSold: products.totalSold,
        inventoryTemplateId: products.inventoryTemplateId,
        templateName: inventoryTemplates.name,
        isBundle: products.isBundle,
        // Ship template fields to avoid N+1 fetches in admin pickers.
        fieldsSchema: inventoryTemplates.fieldsSchema,
        // Count available items per status
        availableCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE ${sqlInventoryItemsCorrelatedToProducts()}
            AND inventory_items.status = 'available'
            AND inventory_items.deleted_at IS NULL
        )`,
        reservedCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE ${sqlInventoryItemsCorrelatedToProducts()}
            AND inventory_items.status = 'reserved'
            AND inventory_items.deleted_at IS NULL
        )`,
        soldCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE ${sqlInventoryItemsCorrelatedToProducts()}
            AND inventory_items.status = 'sold'
            AND inventory_items.deleted_at IS NULL
        )`,
      })
      .from(products)
      .leftJoin(inventoryTemplates, eq(products.inventoryTemplateId, inventoryTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

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
      hasInventoryTemplate: !!product.inventoryTemplateId,
      categories: categoryLinks
        .filter((c) => c.productId === product.id)
        .map((c) => ({
          id: c.categoryId,
          name: c.categoryName,
          parentId: c.parentId,
        })),
    }));

    // Fix bundle availableCount: bundles have no inventory of their own,
    // so compute from sub-products (min of floor(subAvailable / subNeed))
    const bundleProductIds = result.filter((p) => p.isBundle).map((p) => p.id);
    if (bundleProductIds.length > 0) {
      const bundleSubItems = await db
        .select({
          bundleProductId: bundleItems.bundleProductId,
          productId: bundleItems.productId,
          quantity: bundleItems.quantity,
        })
        .from(bundleItems)
        .where(
          and(
            inArray(bundleItems.bundleProductId, bundleProductIds),
            sql`${bundleItems.productId} IS NOT NULL`
          )
        );

      // Get available counts for all referenced sub-products
      const subProductIds = [...new Set(bundleSubItems.map((bi) => bi.productId!))];
      const subCounts = new Map<string, number>();
      for (const spId of subProductIds) {
        const r = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt
          FROM inventory_items
          WHERE status = 'available' AND deleted_at IS NULL
            AND product_id = ${spId}
        `);
        subCounts.set(spId, parseInt(String(r.rows[0]?.cnt ?? 0), 10));
      }

      // Compute bundle available count
      const bundleSubsByProduct = new Map<string, typeof bundleSubItems>();
      for (const bi of bundleSubItems) {
        if (!bundleSubsByProduct.has(bi.bundleProductId)) {
          bundleSubsByProduct.set(bi.bundleProductId, []);
        }
        bundleSubsByProduct.get(bi.bundleProductId)!.push(bi);
      }

      result = result.map((p) => {
        if (!p.isBundle) return p;
        const subs = bundleSubsByProduct.get(p.id) || [];
        if (subs.length === 0) return { ...p, availableCount: 0 };
        let maxBundles = Infinity;
        for (const sub of subs) {
          const available = subCounts.get(sub.productId!) || 0;
          const needed = sub.quantity || 1;
          const possible = Math.floor(available / needed);
          maxBundles = Math.min(maxBundles, possible);
        }
        return { ...p, availableCount: Number.isFinite(maxBundles) ? maxBundles : 0 };
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        limit,
        offset,
        /** True when another page likely exists (client should fetch more until false) */
        hasMore: result.length === limit,
      },
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
