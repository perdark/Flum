/**
 * Link Unlinked Inventory API Route
 *
 * POST /api/inventory/link - Link unlinked inventory items to a product (and optionally a variant)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, productVariants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, sql, and, isNull, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const { inventoryIds, productId, variantId } = body;

    // Validate input
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Inventory IDs array is required" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify all inventory items exist and are not linked
    const items = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          inArray(inventoryItems.id, inventoryIds),
          isNull(inventoryItems.productId)
        )
      );

    if (items.length !== inventoryIds.length) {
      return NextResponse.json(
        { success: false, error: "Some inventory items not found or already linked" },
        { status: 400 }
      );
    }

    // Link inventory items to product
    await db
      .update(inventoryItems)
      .set({
        productId,
        variantId: variantId || null,
        updatedAt: new Date(),
      })
      .where(inArray(inventoryItems.id, inventoryIds));

    // Update product stock count
    await db
      .update(products)
      .set({
        stockCount: sql`${products.stockCount} + ${items.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Also update variant stockCount if variant specified
    if (variantId) {
      await db
        .update(productVariants)
        .set({
          stockCount: sql`${productVariants.stockCount} + ${items.length}`,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, variantId));
    }

    return NextResponse.json({
      success: true,
      data: {
        count: items.length,
        message: `Linked ${items.length} inventory items to product`,
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

    console.error("Link inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
