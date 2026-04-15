/**
 * Inventory API Routes
 *
 * GET /api/inventory - List inventory items with filtering
 * POST /api/inventory - Add new inventory items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, asc, like, or, isNull, notInArray } from "drizzle-orm";
import { manualSellInventoryCondition } from "@/lib/inventoryManualSellFilters";
import { runBulkInventoryAdd } from "@/services/inventoryBulkAdd";

// ============================================================================
// GET /api/inventory - List inventory
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const manualSell =
      searchParams.get("manualSell") === "1" || searchParams.get("manualSell") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const unlinkedOnly = searchParams.get("unlinked") === "true";
    const variantId = searchParams.get("variantId");
    const templateId = searchParams.get("templateId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const excludeRaw = searchParams.get("excludeIds");
    const excludeIds = (excludeRaw || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[0-9a-f-]{36}$/i.test(s));

    const db = getDb();

    // Build conditions
    const conditions = [
      sql`${inventoryItems.deletedAt} IS NULL`,
    ];
    if (excludeIds.length > 0) {
      conditions.push(notInArray(inventoryItems.id, excludeIds));
    }

    if (unlinkedOnly) {
      // Only show items without a product
      conditions.push(isNull(inventoryItems.productId));
    } else if (productId) {
      // Filter by specific product
      conditions.push(eq(inventoryItems.productId, productId));
    }

    if (variantId) {
      conditions.push(eq(inventoryItems.variantId, variantId));
    }

    if (templateId) {
      conditions.push(eq(inventoryItems.templateId, templateId));
    }

    if (manualSell && templateId) {
      conditions.push(manualSellInventoryCondition(user.id));
    } else if (status) {
      conditions.push(eq(inventoryItems.status, status as "available" | "reserved" | "sold" | "expired"));
    }

    // Get total count using leftJoin to include standalone items
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get inventory with product details (using leftJoin for standalone items)
    const inventory = await db
      .select({
        id: inventoryItems.id,
        templateId: inventoryItems.templateId,
        productId: inventoryItems.productId,
        values: inventoryItems.values,
        variantId: inventoryItems.variantId,
        cost: inventoryItems.cost,
        status: inventoryItems.status,
        multiSellEnabled: inventoryItems.multiSellEnabled,
        multiSellMax: inventoryItems.multiSellMax,
        multiSellSaleCount: inventoryItems.multiSellSaleCount,
        cooldownEnabled: inventoryItems.cooldownEnabled,
        cooldownUntil: inventoryItems.cooldownUntil,
        cooldownDurationHours: inventoryItems.cooldownDurationHours,
        orderItemId: inventoryItems.orderItemId,
        reservedUntil: inventoryItems.reservedUntil,
        reservedBy: inventoryItems.reservedBy,
        purchasedAt: inventoryItems.purchasedAt,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(
        (() => {
          const validSortColumns: Record<string, any> = {
            status: inventoryItems.status,
            createdAt: inventoryItems.createdAt,
            purchasedAt: inventoryItems.purchasedAt,
          };
          const sortColumn = validSortColumns[sortBy] || inventoryItems.createdAt;
          return sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
        })()
      )
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: inventory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    console.error("Get inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/inventory - Add inventory items in bulk
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const { productId, items, cost, eachLineIsProduct, sellPendingFirst, variantId } = body;

    // Validate input
    if (!productId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product ID and items array are required" },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await runBulkInventoryAdd({
        userId: user.id,
        productId,
        items,
        cost,
        eachLineIsProduct,
        sellPendingFirst,
        variantId,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }
      if (e instanceof Error && e.message === "VARIANT_INVALID") {
        return NextResponse.json(
          { success: false, error: "variantId does not belong to this product" },
          { status: 400 }
        );
      }
      throw e;
    }

    const { fulfilledOrders, insertedItems } = result;

    return NextResponse.json({
      success: true,
      data: {
        totalAdded: items.length,
        availableCount: insertedItems.length,
        fulfilledCount: fulfilledOrders.length,
        items: insertedItems,
        batchId: insertedItems[0]?.id || null,
        fulfilledOrders: fulfilledOrders.length > 0 ? fulfilledOrders : undefined,
      },
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

    console.error("Add inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
