/**
 * Standalone Stock API Route
 *
 * POST /api/inventory/standalone - Add stock without requiring a product
 * Allows adding inventory with nullable productId
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, inventoryBatches, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const { templateId, productId, items, batchName, eachLineIsProduct } = body;

    // Validate input
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    // If productId is provided, verify it exists
    if (productId) {
      const db = getDb();
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
    }

    const db = getDb();

    // Create batch if batchName is provided
    let batchId = null;
    if (batchName) {
      const [batch] = await db
        .insert(inventoryBatches)
        .values({
          name: batchName,
          source: "standalone_stock",
          createdBy: user.id,
        })
        .returning();
      batchId = batch.id;
    }

    // Insert inventory items
    const itemsToInsert = items.map((item: Record<string, string>) => ({
      templateId,
      productId: productId || null,
      batchId,
      values: {
        ...item,
        _metadata: {
          eachLineIsProduct,
          batchName: batchName || undefined,
        },
      },
      status: "available",
    }));

    const insertedItems = await db
      .insert(inventoryItems)
      .values(itemsToInsert)
      .returning();

    // Update product stock count if productId is provided
    if (productId) {
      await db
        .update(products)
        .set({
          stockCount: sql`stock_count + ${items.length}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    }

    return NextResponse.json({
      success: true,
      data: {
        count: insertedItems.length,
        items: insertedItems,
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

    console.error("Standalone stock error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
