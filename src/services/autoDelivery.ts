/**
 * Auto-Delivery Service
 *
 * Handles automatic fulfillment of digital product orders
 * Uses database row locking to prevent race conditions
 *
 * Flow:
 * 1. Order is completed
 * 2. For each order item, find and lock available inventory
 * 3. Mark inventory as sold and link to order
 * 4. Update product stock counts
 * 5. Return delivery data
 */

import { getDb } from "@/db";
import { inventoryItems, products, orders, orderItems } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logInventorySold, logOrderCompleted } from "./activityLog";

// ============================================================================
// AUTO-DELIVERY SERVICE
// ============================================================================

export interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  // The actual delivered data (keys, accounts, etc.)
  items: Array<{
    inventoryId: string;
    data: Record<string, string | number | boolean>;
  }>;
}

export interface DeliveryResult {
  orderId: string;
  success: boolean;
  deliveredItems: DeliveryItem[];
  errors: string[];
  fulfillmentStatus: "delivered" | "partial" | "failed";
}

/**
 * Fulfill an order automatically
 *
 * This function:
 * 1. Finds available inventory for each order item
 * 2. Uses SELECT FOR UPDATE to lock rows (prevents race conditions)
 * 3. Marks inventory as sold
 * 4. Links inventory to order items
 * 5. Updates product stock counts
 *
 * @param orderId - The order to fulfill
 * @param userId - Optional user ID for activity logging
 * @returns Delivery result with items and status
 */
export async function fulfillOrder(
  orderId: string,
  userId?: string
): Promise<DeliveryResult> {
  const db = getDb();

  const result: DeliveryResult = {
    orderId,
    success: false,
    deliveredItems: [],
    errors: [],
    fulfillmentStatus: "failed",
  };

  try {
    // Start a transaction for atomic operations
    await db.transaction(async (tx) => {
      // Get order items with product details
      const items = await tx
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          productName: products.name,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

      if (!items.length) {
        result.errors.push("No items found in order");
        throw new Error("No items found in order");
      }

      let totalDelivered = 0;
      let totalErrors = 0;

      // Process each order item
      for (const item of items) {
        const deliveryItem: DeliveryItem = {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          items: [],
        };

        // Find and lock available inventory items
        // Using raw SQL with FOR UPDATE to lock rows
        const availableInventory = await tx.execute(
          sql`
            SELECT id, values
            FROM inventory_items
            WHERE product_id = ${item.productId}
              AND status = 'available'
              AND deleted_at IS NULL
            ORDER BY created_at ASC
            LIMIT ${item.quantity}
            FOR UPDATE SKIP LOCKED
          `
        );

        const inventoryRows = availableInventory.rows as Array<{
          id: string;
          values: Record<string, string | number | boolean>;
        }>;

        if (inventoryRows.length < item.quantity) {
          result.errors.push(
            `Insufficient inventory for ${item.productName}: ` +
              `needed ${item.quantity}, available ${inventoryRows.length}`
          );
          totalErrors++;
        }

        // Update inventory items as sold
        for (const row of inventoryRows) {
          await tx
            .update(inventoryItems)
            .set({
              status: "sold",
              orderItemId: item.id,
              purchasedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, row.id));

          deliveryItem.items.push({
            inventoryId: row.id,
            data: row.values,
          });

          // Log inventory sale
          await logInventorySold(userId || null, row.id, orderId);

          totalDelivered++;
        }

        // Update order item with delivered inventory IDs
        await tx
          .update(orderItems)
          .set({
            deliveredInventoryIds: sql`${JSON.stringify(inventoryRows.map((r) => r.id))}::jsonb`,
          })
          .where(eq(orderItems.id, item.id));

        // Update product stock and sold counts
        await tx
          .update(products)
          .set({
            stockCount: sql`${products.stockCount} - ${inventoryRows.length}`,
            totalSold: sql`${products.totalSold} + ${inventoryRows.length}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));

        result.deliveredItems.push(deliveryItem);
      }

      // Determine fulfillment status
      if (totalErrors === 0) {
        result.fulfillmentStatus = "delivered";
        result.success = true;
      } else if (totalDelivered > 0) {
        result.fulfillmentStatus = "partial";
        result.success = true;
      }

      // Update order status
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: result.fulfillmentStatus,
          deliveredAt: result.fulfillmentStatus === "delivered" ? new Date() : null,
          processedBy: userId || null,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Log order completion
      if (result.success) {
        // Get order total for logging
        const order = await tx
          .select({ total: orders.total })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        await logOrderCompleted(userId || null, orderId, order[0]?.total || "0");
      }
    });

    return result;
  } catch (error) {
    console.error("Auto-delivery error:", error);
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
    return result;
  }
}

/**
 * Check if an order can be fulfilled
 * Returns true if all products have sufficient inventory
 */
export async function canFulfillOrder(orderId: string): Promise<boolean> {
  const db = getDb();

  const items = await db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    const stock = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.productId, item.productId),
          sql`status = 'available'`,
          sql`deleted_at IS NULL`
        )
      );

    if (!stock[0] || stock[0].count < item.quantity) {
      return false;
    }
  }

  return true;
}

/**
 * Get available stock count for a product
 */
export async function getProductStock(productId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.productId, productId),
        sql`status = 'available'`,
        sql`deleted_at IS NULL`
      )
    );

  return result[0]?.count || 0;
}

/**
 * Reserve inventory for an order (temporary hold during checkout)
 * Prevents items from being sold while customer completes payment
 *
 * @param productId - Product to reserve from
 * @param quantity - Number of items to reserve
 * @param durationMinutes - How long to hold the reservation
 * @returns Array of reserved inventory item IDs
 */
export async function reserveInventory(
  productId: string,
  quantity: number,
  durationMinutes: number = 15
): Promise<string[]> {
  const db = getDb();

  const reservedUntil = new Date(
    Date.now() + durationMinutes * 60 * 1000
  );

  const result: string[] = await db.transaction(async (tx) => {
    // Find and lock available inventory
    const available = await tx.execute(
      sql`
        UPDATE inventory_items
        SET status = 'reserved',
            reserved_until = ${reservedUntil},
            updated_at = NOW()
        WHERE id IN (
          SELECT id
          FROM inventory_items
          WHERE product_id = ${productId}
            AND status = 'available'
            AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT ${quantity}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id
      `
    );

    return (available.rows as Array<{ id: string }>).map((r) => r.id);
  });

  return result;
}

/**
 * Release reserved inventory (if payment fails or checkout is abandoned)
 */
export async function releaseReservedInventory(
  inventoryIds: string[]
): Promise<void> {
  const db = getDb();

  if (inventoryIds.length === 0) return;

  await db
    .update(inventoryItems)
    .set({
      status: "available",
      reservedUntil: null,
      updatedAt: new Date(),
    })
    .where(inArray(inventoryItems.id, inventoryIds));
}

/**
 * Clean up expired reservations (run periodically)
 * Releases reservations that have passed their reserved_until time
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const db = getDb();

  const result = await db
    .update(inventoryItems)
    .set({
      status: "available",
      reservedUntil: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        sql`status = 'reserved'`,
        sql`reserved_until < NOW()`
      )
    );

  return result.rowCount || 0;
}

/**
 * Get delivery data for an order (what was delivered to customer)
 */
export async function getOrderDeliveryData(
  orderId: string
): Promise<DeliveryItem[]> {
  const db = getDb();

  const items = await db
    .select({
      productId: orderItems.productId,
      productName: products.name,
      deliveredInventoryIds: orderItems.deliveredInventoryIds,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const result: DeliveryItem[] = [];

  for (const item of items) {
    if (!item.deliveredInventoryIds || item.deliveredInventoryIds.length === 0) {
      continue;
    }

    const inventory = await db
      .select({
        id: inventoryItems.id,
        values: inventoryItems.values,
      })
      .from(inventoryItems)
      .where(inArray(inventoryItems.id, item.deliveredInventoryIds));

    result.push({
      productId: item.productId,
      productName: item.productName,
      quantity: inventory.length,
      items: inventory.map((inv) => ({
        inventoryId: inv.id,
        data: inv.values as Record<string, string | number | boolean>,
      })),
    });
  }

  return result;
}
