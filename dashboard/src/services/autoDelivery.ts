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
import { inventoryItems, products, orders, orderItems, bundleItems, productVariants } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { sqlInventoryRowsForProduct } from "@/lib/inventoryProductScope";
import { logInventorySold, logOrderCompleted } from "./activityLog";

/** Reset multi-sell lines whose cooldown has ended */
export async function resetExpiredMultisellCooldowns(tx: any, productId: string, variantId?: string | null) {
  const variantFilter = variantId ? sql` AND variant_id = ${variantId}` : sql``;
  await tx.execute(sql`
    UPDATE inventory_items SET
      status = 'available',
      multi_sell_sale_count = 0,
      cooldown_until = NULL,
      updated_at = NOW()
    WHERE ${sqlInventoryRowsForProduct(productId)}
      AND status = 'in_cooldown'
      AND cooldown_until IS NOT NULL
      AND cooldown_until <= NOW()
      AND deleted_at IS NULL
      ${variantFilter}
  `);
}

export type InventoryRowPick = {
  id: string;
  product_id?: string;
  values: Record<string, string | number | boolean>;
  multi_sell_enabled: boolean;
  multi_sell_max: number;
  multi_sell_sale_count: number;
  cooldown_enabled: boolean;
  cooldown_duration_hours: number;
};

/** Lock and return one allocatable inventory row for a product (supports multi-sell per line) */
export async function pickOneInventoryLine(tx: any, productId: string, variantId?: string | null): Promise<InventoryRowPick | null> {
  const variantFilter = variantId ? sql` AND variant_id = ${variantId}` : sql``;
  const res = await tx.execute(sql`
    SELECT id, product_id, values,
      COALESCE(multi_sell_enabled, false) AS multi_sell_enabled,
      COALESCE(multi_sell_max, 5) AS multi_sell_max,
      COALESCE(multi_sell_sale_count, 0) AS multi_sell_sale_count,
      COALESCE(cooldown_enabled, false) AS cooldown_enabled,
      COALESCE(cooldown_duration_hours, 12) AS cooldown_duration_hours
    FROM inventory_items
    WHERE ${sqlInventoryRowsForProduct(productId)}
      AND deleted_at IS NULL
      ${variantFilter}
      AND (
        (status = 'available' AND COALESCE(multi_sell_enabled, false) = false)
        OR (
          status = 'available'
          AND COALESCE(multi_sell_enabled, false) = true
          AND COALESCE(multi_sell_sale_count, 0) < COALESCE(multi_sell_max, 5)
          AND (cooldown_until IS NULL OR cooldown_until <= NOW())
        )
      )
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);
  const row = res.rows[0] as InventoryRowPick | undefined;
  return row ?? null;
}

export async function applySaleToInventoryLine(
  tx: any,
  row: InventoryRowPick,
  orderItemId: string | null,
  orderId: string | null,
  userId: string | null | undefined
): Promise<{ decrementStock: boolean }> {
  const ms = row.multi_sell_enabled;
  const logOrder = orderId || "pending";

  if (!ms) {
    await tx
      .update(inventoryItems)
      .set({
        status: "sold",
        orderItemId: orderItemId ?? null,
        purchasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, row.id));
    await logInventorySold(userId || null, row.id, logOrder);
    return { decrementStock: true };
  }

  const next = row.multi_sell_sale_count + 1;
  const max = row.multi_sell_max;
  const cooldownEnabled = row.cooldown_enabled;
  const hours = row.cooldown_duration_hours;

  if (next >= max) {
    if (cooldownEnabled) {
      const until = new Date(Date.now() + hours * 60 * 60 * 1000);
      await tx
        .update(inventoryItems)
        .set({
          multiSellSaleCount: next,
          status: "in_cooldown",
          cooldownUntil: until,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, row.id));
    } else {
      await tx
        .update(inventoryItems)
        .set({
          multiSellSaleCount: next,
          status: "sold",
          orderItemId: orderItemId ?? null,
          purchasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, row.id));
    }
  } else {
    await tx
      .update(inventoryItems)
      .set({
        multiSellSaleCount: next,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, row.id));
  }
  await logInventorySold(userId || null, row.id, logOrder);
  return { decrementStock: next >= max && !cooldownEnabled };
}

/**
 * Decrement stockCount for products linked to the given inventory items.
 * Call this after items are marked as sold with `decrementStock = true`.
 */
export async function decrementLinkedProductStock(
  tx: any,
  soldItemIds: string[]
): Promise<void> {
  if (soldItemIds.length === 0) return;

  const productIds = new Set<string>();
  const variantIds = new Set<string>();

  const primaryRows = await tx
    .select({ productId: inventoryItems.productId, variantId: inventoryItems.variantId })
    .from(inventoryItems)
    .where(inArray(inventoryItems.id, soldItemIds));
  for (const r of primaryRows) {
    if (r.productId) productIds.add(r.productId);
    if (r.variantId) variantIds.add(r.variantId);
  }

  if (productIds.size > 0) {
    await tx.execute(sql`
      UPDATE ${products}
      SET stock_count = stock_count - 1,
          total_sold = total_sold + 1,
          updated_at = NOW()
      WHERE id IN (${sql.join([...productIds].map(id => sql`${id}`), sql`, `)})
    `);
  }

  // Also decrement variant stockCount
  if (variantIds.size > 0) {
    await tx.execute(sql`
      UPDATE ${productVariants}
      SET stock_count = GREATEST(0, stock_count - 1),
          updated_at = NOW()
      WHERE id IN (${sql.join([...variantIds].map(id => sql`${id}`), sql`, `)})
    `);
  }
}

// ============================================================================
// AUTO-DELIVERY SERVICE
// ============================================================================

export interface DeliveryItem {
  productId: string | null;
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
  fulfillmentStatus: "delivered" | "processing" | "failed";
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
          variantId: orderItems.variantId,
          quantity: orderItems.quantity,
          productName: products.name,
          isBundle: products.isBundle,
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
        const productId = item.productId;
        if (!productId) {
          result.errors.push("Order line is missing productId; cannot auto-fulfill.");
          totalErrors++;
          continue;
        }

        const deliveryItem: DeliveryItem = {
          productId,
          productName: item.productName,
          quantity: item.quantity,
          items: [],
        };

        const deliveredIds: string[] = [];

        // -----------------------------------------------------------------
        // Bundle: pull inventory from each linked sub-product (e.g. GTA4 + GTA5)
        // -----------------------------------------------------------------
        if (item.isBundle) {
          const subs = await tx
            .select()
            .from(bundleItems)
            .where(eq(bundleItems.bundleProductId, productId));
          const withPid = subs.filter((s) => s.productId);

          if (withPid.length === 0) {
            result.errors.push(
              `Bundle "${item.productName}" has no sub-products linked. Edit the bundle and pick real products (🔍) for each line.`
            );
            totalErrors++;
            await tx
              .update(orderItems)
              .set({
                deliveredInventoryIds: sql`'[]'::jsonb`,
                fulfilledQuantity: 0,
              })
              .where(eq(orderItems.id, item.id));
            result.deliveredItems.push(deliveryItem);
            continue;
          }

          let bundleUnitsDone = 0;
          for (let q = 0; q < item.quantity; q++) {
            await tx.execute(sql`SAVEPOINT sp_bundle_unit`);
            try {
              const batch: Array<{ row: InventoryRowPick; subPid: string }> = [];
              for (const sub of withPid) {
                await resetExpiredMultisellCooldowns(tx, sub.productId!);
                const need = sub.quantity || 1;
                for (let n = 0; n < need; n++) {
                  const row = await pickOneInventoryLine(tx, sub.productId!);
                  if (!row) throw new Error("shortage");
                  batch.push({ row, subPid: sub.productId! });
                }
              }
              for (const { row, subPid } of batch) {
                const { decrementStock } = await applySaleToInventoryLine(
                  tx,
                  row,
                  item.id,
                  orderId,
                  userId
                );
                deliveredIds.push(row.id);
                deliveryItem.items.push({
                  inventoryId: row.id,
                  data: row.values,
                });
                totalDelivered++;
                if (decrementStock) {
                  await decrementLinkedProductStock(tx, [row.id]);
                } else {
                  // Multi-sell: still count the sale
                  await tx.execute(sql`
                    UPDATE ${products}
                    SET total_sold = total_sold + 1,
                        updated_at = NOW()
                    WHERE id = ${subPid}
                  `);
                }
              }
              bundleUnitsDone++;
              await tx.execute(sql`RELEASE SAVEPOINT sp_bundle_unit`);
            } catch {
              await tx.execute(sql`ROLLBACK TO SAVEPOINT sp_bundle_unit`);
              result.errors.push(
                `Bundle "${item.productName}": not enough stock on sub-products for bundle unit ${q + 1}/${item.quantity}`
              );
              totalErrors++;
              break;
            }
          }

          deliveryItem.quantity = bundleUnitsDone;

          await tx
            .update(orderItems)
            .set({
              deliveredInventoryIds: sql`${JSON.stringify(deliveredIds)}::jsonb`,
              fulfilledQuantity: bundleUnitsDone,
            })
            .where(eq(orderItems.id, item.id));

          // Track sales on the bundle product itself (no stock to decrement —
          // stock lives on sub-products, already handled by decrementLinkedProductStock)
          await tx
            .update(products)
            .set({
              totalSold: sql`${products.totalSold} + ${bundleUnitsDone}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, productId));

          result.deliveredItems.push(deliveryItem);
          continue;
        }

        // -----------------------------------------------------------------
        // Normal product: inventory on this product
        // -----------------------------------------------------------------
        await resetExpiredMultisellCooldowns(tx, productId, item.variantId);

        const soldIds: string[] = [];
        const multiSellIds: string[] = [];

        for (let q = 0; q < item.quantity; q++) {
          const row = await pickOneInventoryLine(tx, productId, item.variantId);
          if (!row) break;

          const { decrementStock } = await applySaleToInventoryLine(
            tx,
            row,
            item.id,
            orderId,
            userId
          );

          deliveryItem.items.push({
            inventoryId: row.id,
            data: row.values,
          });
          deliveredIds.push(row.id);
          if (decrementStock) {
            soldIds.push(row.id);
          } else {
            multiSellIds.push(row.id);
          }
          totalDelivered++;
        }

        // Update stock for all linked products (primary FK + junction table)
        await decrementLinkedProductStock(tx, soldIds);

        // Multi-sell items that didn't fully sell: just bump totalSold
        if (multiSellIds.length > 0) {
          await tx.execute(sql`
            UPDATE ${products}
            SET total_sold = total_sold + 1,
                updated_at = NOW()
            WHERE id = ${productId}
          `);
        }

        if (deliveredIds.length < item.quantity) {
          result.errors.push(
            `Insufficient inventory for ${item.productName}: ` +
              `needed ${item.quantity}, allocated ${deliveredIds.length}`
          );
          totalErrors++;
        }

        await tx
          .update(orderItems)
          .set({
            deliveredInventoryIds: sql`${JSON.stringify(deliveredIds)}::jsonb`,
            fulfilledQuantity: deliveredIds.length,
          })
          .where(eq(orderItems.id, item.id));

        result.deliveredItems.push(deliveryItem);
      }

      // Determine fulfillment status
      if (totalErrors === 0) {
        result.fulfillmentStatus = "delivered";
        result.success = true;
      } else if (totalDelivered > 0) {
        result.fulfillmentStatus = "processing";
        result.success = true;
      }

      // Update order status
      await tx
        .update(orders)
        .set({
          status: result.fulfillmentStatus === "delivered" ? "completed" : "pending",
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
/**
 * Count of fulfillable units (each line counts once; multi-sell lines count remaining slots)
 */
export async function countFulfillableUnits(productId: string, variantId?: string | null): Promise<number> {
  const db = getDb();
  const variantFilter = variantId ? sql` AND variant_id = ${variantId}` : sql``;
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN status = 'available' AND COALESCE(multi_sell_enabled, false) = false THEN 1
        WHEN status = 'available' AND COALESCE(multi_sell_enabled, false) = true
          AND COALESCE(multi_sell_sale_count, 0) < COALESCE(multi_sell_max, 5)
          AND (cooldown_until IS NULL OR cooldown_until <= NOW())
        THEN GREATEST(0, COALESCE(multi_sell_max, 5) - COALESCE(multi_sell_sale_count, 0))
        WHEN status = 'in_cooldown' AND cooldown_until IS NOT NULL AND cooldown_until <= NOW()
        THEN COALESCE(multi_sell_max, 5)
        ELSE 0
      END
    ), 0)::int AS n
    FROM inventory_items
    WHERE ${sqlInventoryRowsForProduct(productId)}
      AND deleted_at IS NULL
      ${variantFilter}
  `);
  const row = r.rows[0] as { n: number } | undefined;
  return row?.n ?? 0;
}

export async function canFulfillOrder(orderId: string): Promise<boolean> {
  const db = getDb();

  const items = await db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      isBundle: products.isBundle,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    if (!item.productId) continue;

    if (item.isBundle) {
      const subs = await db
        .select()
        .from(bundleItems)
        .where(eq(bundleItems.bundleProductId, item.productId));
      const withPid = subs.filter((s) => s.productId);
      if (withPid.length === 0) return false;

      let maxBundles = Infinity;
      for (const sub of withPid) {
        const n = await countFulfillableUnits(sub.productId!);
        const need = sub.quantity || 1;
        const possible = Math.floor(n / need);
        maxBundles = Math.min(maxBundles, possible);
      }
      if (!Number.isFinite(maxBundles)) maxBundles = 0;
      if (maxBundles < item.quantity) return false;
    } else {
      const n = await countFulfillableUnits(item.productId);
      if (n < item.quantity) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get available stock count for a product
 */
export async function getProductStock(productId: string): Promise<number> {
  return countFulfillableUnits(productId);
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
  durationMinutes: number = 15,
  variantId?: string | null
): Promise<string[]> {
  const db = getDb();

  const reservedUntil = new Date(
    Date.now() + durationMinutes * 60 * 1000
  );
  const variantFilter = variantId ? sql` AND variant_id = ${variantId}` : sql``;

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
          WHERE ${sqlInventoryRowsForProduct(productId)}
            AND status = 'available'
            AND deleted_at IS NULL
            ${variantFilter}
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
      productName: orderItems.productName,
      deliveredInventoryIds: orderItems.deliveredInventoryIds,
    })
    .from(orderItems)
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
