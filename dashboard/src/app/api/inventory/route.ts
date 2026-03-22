/**
 * Inventory API Routes
 *
 * GET /api/inventory - List inventory items with filtering
 * POST /api/inventory - Add new inventory items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, inventoryBatches } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, or } from "drizzle-orm";
import { logInventoryAdded, logActivity } from "@/services/activityLog";

// ============================================================================
// GET /api/inventory - List inventory
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions = [
      sql`${inventoryItems.deletedAt} IS NULL`,
      sql`${products.deletedAt} IS NULL`,
    ];

    if (productId) {
      conditions.push(eq(inventoryItems.productId, productId));
    }

    if (status) {
      conditions.push(eq(inventoryItems.status, status as "available" | "reserved" | "sold" | "expired"));
    }

    // Get total count (need to join products to filter deleted products)
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get inventory with product details
    const inventory = await db
      .select({
        id: inventoryItems.id,
        templateId: inventoryItems.templateId,
        productId: inventoryItems.productId,
        values: inventoryItems.values,
        status: inventoryItems.status,
        orderItemId: inventoryItems.orderItemId,
        reservedUntil: inventoryItems.reservedUntil,
        purchasedAt: inventoryItems.purchasedAt,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryItems.createdAt))
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
    const { productId, items, batchId, batchName } = body;

    // Validate input
    if (!productId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product ID and items array are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists and get template ID
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        inventoryTemplateId: products.inventoryTemplateId,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (!product.inventoryTemplateId) {
      return NextResponse.json(
        { success: false, error: "Product has no inventory template configured" },
        { status: 400 }
      );
    }

    // Determine batch ID - use existing or create new
    let finalBatchId = batchId;
    if (batchName && !batchId) {
      // Auto-create batch
      const [newBatch] = await db
        .insert(inventoryBatches)
        .values({
          name: batchName,
          source: "manual_import",
          createdBy: user.id,
        })
        .returning();
      finalBatchId = newBatch.id;
    } else if (batchId) {
      // Validate batch exists
      const [batch] = await db
        .select()
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.id, batchId),
            sql`${inventoryBatches.deletedAt} IS NULL`
          )
        )
        .limit(1);

      if (!batch) {
        return NextResponse.json(
          { success: false, error: "Batch not found" },
          { status: 404 }
        );
      }
    }

    // Insert inventory items
    const insertedItems = await db
      .insert(inventoryItems)
      .values(
        items.map((values: Record<string, unknown>) => ({
          productId,
          templateId: product.inventoryTemplateId!,
          batchId: finalBatchId || null,
          values,
          status: "available" as const,
        }))
      )
      .returning();

    // Update product stock count
    await db
      .update(products)
      .set({
        stockCount: sql`${products.stockCount} + ${items.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Log activity (log once per batch)
    await logActivity({
      userId: user.id,
      action: "inventory_added",
      entity: "inventory",
      entityId: insertedItems[0].id,
      metadata: {
        productId,
        productName: product.name,
        quantity: items.length,
        batchId: finalBatchId,
        batchName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: insertedItems.length,
        items: insertedItems,
        batchId: finalBatchId,
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
