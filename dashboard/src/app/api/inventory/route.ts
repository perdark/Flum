/**
 * Inventory API Routes
 *
 * GET /api/inventory - List inventory items with filtering
 * POST /api/inventory - Add new inventory items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, inventoryBatches, orders, orderItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, or, isNull } from "drizzle-orm";
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
    const unlinkedOnly = searchParams.get("unlinked") === "true";

    const db = getDb();

    // Build conditions
    const conditions = [
      sql`${inventoryItems.deletedAt} IS NULL`,
    ];

    if (unlinkedOnly) {
      // Only show items without a product
      conditions.push(isNull(inventoryItems.productId));
    } else if (productId) {
      // Filter by specific product
      conditions.push(eq(inventoryItems.productId, productId));
    }

    if (status) {
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
      .leftJoin(products, eq(inventoryItems.productId, products.id))
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
    const { productId, items, batchId, batchName, sellPendingFirst, eachLineIsProduct } = body;

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

    // If sellPendingFirst is true, handle pending orders first in one atomic transaction
    let fulfilledOrders: string[] = [];
    let itemsConsumed = 0;
    let insertedItems: Array<any> = [];

    await db.transaction(async (tx) => {
      if (sellPendingFirst) {
        // Get pending orders for this product
        const pendingOrderItems = await tx
          .select({
            orderId: orderItems.orderId,
            orderItemId: orderItems.id,
            quantity: orderItems.quantity,
            deliveredIds: orderItems.deliveredInventoryIds,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(
            and(
              eq(orderItems.productId, productId),
              sql`${orders.deletedAt} IS NULL`,
              sql`(${orders.status} = 'pending' OR ${orders.fulfillmentStatus} = 'processing')`
            )
          );

        // Fulfill pending orders with the new inventory
        for (const pendingItem of pendingOrderItems) {
          const delivered = (pendingItem.deliveredIds as string[] || []).length;
          const stillNeeded = pendingItem.quantity - delivered;
          const toFulfill = Math.min(stillNeeded, items.length - itemsConsumed);

          if (toFulfill <= 0) {
            continue;
          }

          const soldItemIds: string[] = [];
          for (let j = 0; j < toFulfill; j++) {
            const values = items[itemsConsumed + j];
            // Add metadata to values
            const valuesWithMetadata = {
              ...values,
              _metadata: {
                eachLineIsProduct,
                batchName: batchName || undefined,
              },
            };
            const [inserted] = await tx
              .insert(inventoryItems)
              .values({
                productId,
                templateId: product.inventoryTemplateId!,
                batchId: finalBatchId || null,
                values: valuesWithMetadata,
                status: "sold",
                purchasedAt: new Date(),
                orderItemId: pendingItem.orderItemId,
              })
              .returning();
            soldItemIds.push(inserted.id);
          }

          itemsConsumed += toFulfill;

          // Update order item with new inventory IDs
          const updatedIds = [...(pendingItem.deliveredIds as string[] || []), ...soldItemIds];
          await tx
            .update(orderItems)
            .set({
              deliveredInventoryIds: sql`${JSON.stringify(updatedIds)}::jsonb`,
            })
            .where(eq(orderItems.id, pendingItem.orderItemId));

          // Update product totalSold
          await tx
            .update(products)
            .set({
              totalSold: sql`${products.totalSold} + ${toFulfill}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, productId));

          fulfilledOrders.push(pendingItem.orderId);

          // Check if order is now fully fulfilled
          const orderItemsForOrder = await tx
            .select({ quantity: orderItems.quantity, deliveredIds: orderItems.deliveredInventoryIds })
            .from(orderItems)
            .where(eq(orderItems.orderId, pendingItem.orderId));

          const allFulfilled = orderItemsForOrder.every(oi => {
            const delivered = (oi.deliveredIds as string[] || []).length;
            return delivered >= oi.quantity;
          });

          if (allFulfilled) {
            await tx
              .update(orders)
              .set({
                status: "completed",
                fulfillmentStatus: "delivered",
                deliveredAt: new Date(),
                claimedBy: null,
                claimedAt: null,
                claimExpiresAt: null,
                updatedAt: new Date(),
              })
              .where(eq(orders.id, pendingItem.orderId));
          }

          if (itemsConsumed >= items.length) {
            break;
          }
        }
      }

      // Calculate how many items are left after fulfilling pending orders
      const itemsToCreate = sellPendingFirst ? items.slice(itemsConsumed) : items;

      if (itemsToCreate.length > 0) {
        insertedItems = await tx
          .insert(inventoryItems)
          .values(
            itemsToCreate.map((values: Record<string, unknown>) => {
              // Add metadata to values
              const valuesWithMetadata = {
                ...values,
                _metadata: {
                  eachLineIsProduct,
                  batchName: batchName || undefined,
                },
              };
              return {
                productId,
                templateId: product.inventoryTemplateId!,
                batchId: finalBatchId || null,
                values: valuesWithMetadata,
                status: "available" as const,
              };
            })
          )
          .returning();

        await tx
          .update(products)
          .set({
            stockCount: sql`${products.stockCount} + ${itemsToCreate.length}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));
      }
    });

    // Log activity (log once per batch)
    await logActivity({
      userId: user.id,
      action: "inventory_added",
      entity: "inventory",
      entityId: insertedItems[0]?.id || productId,
      metadata: {
        productId,
        productName: product.name,
        quantity: items.length,
        batchId: finalBatchId,
        batchName,
        fulfilledOrders: fulfilledOrders.length > 0 ? fulfilledOrders : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalAdded: items.length,
        availableCount: insertedItems.length,
        fulfilledCount: fulfilledOrders.length,
        items: insertedItems,
        batchId: finalBatchId,
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
