import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, productVariants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { runBulkInventoryAdd } from "@/services/inventoryBulkAdd";

type RouteContext = { params: Promise<{ productId: string }> };

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("inventory/[productId]/items error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { productId } = await context.params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const db = getDb();

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const conditions = [
      sql`${inventoryItems.deletedAt} IS NULL`,
      eq(inventoryItems.productId, productId),
    ];

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    const rows = await db
      .select({
        id: inventoryItems.id,
        templateId: inventoryItems.templateId,
        productId: inventoryItems.productId,
        values: inventoryItems.values,
        variantId: inventoryItems.variantId,
        variantOptionCombination: productVariants.optionCombination,
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
      .leftJoin(productVariants, eq(inventoryItems.variantId, productVariants.id))
      .where(and(...conditions))
      .orderBy(
        (() => {
          const validSortColumns: Record<string, unknown> = {
            status: inventoryItems.status,
            createdAt: inventoryItems.createdAt,
            purchasedAt: inventoryItems.purchasedAt,
          };
          const sortColumn = (validSortColumns[sortBy] || inventoryItems.createdAt) as typeof inventoryItems.createdAt;
          return sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
        })()
      )
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { productId } = await context.params;
    const body = await request.json();
    const { items, cost, eachLineIsProduct, sellPendingFirst, variantId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "items array is required" },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          totalAdded: items.length,
          availableCount: insertedItems.length,
          fulfilledCount: fulfilledOrders.length,
          items: insertedItems,
          batchId: insertedItems[0]?.id || null,
          fulfilledOrders: fulfilledOrders.length > 0 ? fulfilledOrders : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
