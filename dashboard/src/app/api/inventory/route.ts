/**
 * Inventory API Routes
 *
 * GET /api/inventory - List inventory items with filtering
 * POST /api/inventory - Add new inventory items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, orders, orderItems, productVariants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, asc, like, or, isNull } from "drizzle-orm";
import { logInventoryAdded, logActivity } from "@/services/activityLog";

function extractMultisell(row: Record<string, unknown>): {
  values: Record<string, unknown>;
  multiSellEnabled: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
} {
  const v = { ...row };
  const multiSellEnabled = Boolean(v.multiSellEnabled);
  const multiSellMax = Math.max(1, parseInt(String(v.multiSellMax ?? 5), 10) || 5);
  const cooldownEnabled = Boolean(v.cooldownEnabled);
  const cooldownDurationHours = Math.max(1, parseInt(String(v.cooldownDurationHours ?? 12), 10) || 12);
  delete v.multiSellEnabled;
  delete v.multiSellMax;
  delete v.cooldownEnabled;
  delete v.cooldownDurationHours;
  return {
    values: v,
    multiSellEnabled,
    multiSellMax,
    cooldownEnabled,
    cooldownDurationHours,
  };
}

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
    const variantId = searchParams.get("variantId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

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

    if (variantId) {
      conditions.push(eq(inventoryItems.variantId, variantId));
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
            const raw = items[itemsConsumed + j] as Record<string, unknown>;
            const { values: baseVals, multiSellEnabled, multiSellMax, cooldownEnabled, cooldownDurationHours } =
              extractMultisell(raw);
            const valuesWithMetadata = {
              ...baseVals,
              _metadata: {
                eachLineIsProduct,
              },
            };
            const [inserted] = await tx
              .insert(inventoryItems)
              .values({
                productId,
                templateId: product.inventoryTemplateId || null,
                cost: cost || null,
                values: valuesWithMetadata,
                status: "sold",
                purchasedAt: new Date(),
                orderItemId: pendingItem.orderItemId,
                multiSellEnabled,
                multiSellMax,
                cooldownEnabled,
                cooldownDurationHours,
                variantId: variantId || null,
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
            itemsToCreate.map((row: Record<string, unknown>) => {
              const { values: baseVals, multiSellEnabled, multiSellMax, cooldownEnabled, cooldownDurationHours } =
                extractMultisell(row);
              const valuesWithMetadata = {
                ...baseVals,
                _metadata: {
                  eachLineIsProduct,
                },
              };
              return {
                productId,
                templateId: product.inventoryTemplateId || null,
                cost: cost || null,
                values: valuesWithMetadata,
                status: "available" as const,
                multiSellEnabled,
                multiSellMax,
                cooldownEnabled,
                cooldownDurationHours,
                variantId: variantId || null,
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

        // Also update variant stockCount if variant specified
        if (variantId) {
          await tx
            .update(productVariants)
            .set({
              stockCount: sql`${productVariants.stockCount} + ${itemsToCreate.length}`,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, variantId));
        }
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
        cost: cost || undefined,
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
