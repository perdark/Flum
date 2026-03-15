/**
 * Manual Sell API Routes
 *
 * POST /api/manual-sell - Process manual sale with shortage handling
 *
 * Shortage actions:
 * - (not specified): Return shortage info without creating order
 * - "partial": Sell only what's available
 * - "add-inventory": Create inventory (can be more than shortage, extras become available)
 * - "pending": Create pending order
 * - "fail": Return error if shortage exists
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, orders, orderItems, inventoryItems, orderDeliverySnapshots } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity, logOrderCompleted } from "@/services/activityLog";

interface ManualSellItem {
  productId: string;
  quantity: number;
}

interface ManualSellRequest {
  items: ManualSellItem[];
  customerEmail: string;
  customerName?: string;
  shortageAction?: "fail" | "partial" | "add-inventory" | "pending";
  inventoryItemsToAdd?: Array<{
    productId: string;
    values: Record<string, string | number | boolean>;
  }>;
}

interface ShortageItem {
  productId: string;
  productName: string;
  requested: number;
  available: number;
  shortage: number;
}

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  items: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }>;
}

// Helper: Check inventory availability for all items
async function checkInventoryAvailability(
  db: any,
  items: ManualSellItem[],
  productsData: any[]
): Promise<{
  shortages: ShortageItem[];
  hasShortage: boolean;
  availableByProduct: Map<string, number>;
}> {
  const shortages: ShortageItem[] = [];
  const availableByProduct = new Map<string, number>();

  for (const requestItem of items) {
    const product = productsData.find((p) => p.id === requestItem.productId);
    if (!product) continue;

    // Count available inventory
    const countResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM inventory_items
        WHERE product_id = ${requestItem.productId}
          AND status = 'available'
          AND deleted_at IS NULL
      `
    );

    const available = parseInt(countResult.rows[0].count, 10);
    availableByProduct.set(requestItem.productId, available);

    const shortage = Math.max(0, requestItem.quantity - available);

    if (shortage > 0) {
      shortages.push({
        productId: product.id,
        productName: product.name,
        requested: requestItem.quantity,
        available,
        shortage,
      });
    }
  }

  return {
    shortages,
    hasShortage: shortages.length > 0,
    availableByProduct,
  };
}

// Helper: Fulfill items with available inventory (up to requested quantity)
async function fulfillItems(
  tx: any,
  productId: string,
  requestedQuantity: number,
  product: any
): Promise<{
  deliveredItems: DeliveryItem;
  shortage: number;
}> {
  // Find and lock available inventory
  const availableInventory = await tx.execute(
    sql`
      SELECT id, values
      FROM inventory_items
      WHERE product_id = ${productId}
        AND status = 'available'
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${requestedQuantity}
      FOR UPDATE SKIP LOCKED
    `
  );

  const inventoryRows = availableInventory.rows as Array<{
    id: string;
    values: Record<string, string | number | boolean>;
  }>;

  const shortage = requestedQuantity - inventoryRows.length;
  const soldItems: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }> = [];

  // Mark found items as sold
  for (const row of inventoryRows) {
    await tx
      .update(inventoryItems)
      .set({
        status: "sold",
        purchasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, row.id));

    soldItems.push({
      inventoryId: row.id,
      values: row.values,
    });
  }

  // Update product stock count (only for items taken from available inventory)
  await tx
    .update(products)
    .set({
      stockCount: sql`${products.stockCount} - ${soldItems.length}`,
      totalSold: sql`${products.totalSold} + ${soldItems.length}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  return {
    deliveredItems: {
      productId: product.id,
      productName: product.name,
      quantity: soldItems.length,
      unitPrice: parseFloat(product.price),
      items: soldItems,
    },
    shortage,
  };
}

// Helper: Create inventory items (can be sold or available)
async function createInventory(
  tx: any,
  productId: string,
  itemsArray: Array<Record<string, string | number | boolean>>,
  templateId: string,
  markSold = true
): Promise<Array<{ inventoryId: string; values: Record<string, string | number | boolean> }>> {
  const newItems = itemsArray.map((values) => ({
    productId,
    templateId,
    values,
    status: markSold ? ("sold" as const) : ("available" as const),
    purchasedAt: markSold ? new Date() : null,
  }));

  const inserted = await tx
    .insert(inventoryItems)
    .values(newItems)
    .returning();

  // Update product stats
  if (markSold) {
    // For sold items, increase totalSold but don't change stockCount (they were never available)
    await tx
      .update(products)
      .set({
        totalSold: sql`${products.totalSold} + ${itemsArray.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  } else {
    // For available items, increase stockCount
    await tx
      .update(products)
      .set({
        stockCount: sql`${products.stockCount} + ${itemsArray.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  return inserted.map((item: any) => ({
    inventoryId: item.id,
    values: item.values as Record<string, string | number | boolean>,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);

    const body: ManualSellRequest = await request.json();
    const {
      items,
      customerEmail,
      customerName,
      shortageAction,
      inventoryItemsToAdd,
    } = body;

    // Validate input
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items are required" },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get product details
    const productIds = items.map((i) => i.productId);
    const productsData = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.basePrice,
        deliveryType: products.deliveryType,
        inventoryTemplateId: products.inventoryTemplateId,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    if (productsData.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more products not found" },
        { status: 404 }
      );
    }

    // Check inventory availability
    const availability = await checkInventoryAvailability(db, items, productsData);

    // When no shortageAction specified, return availability info
    if (!shortageAction) {
      // Calculate what would be delivered
      const potentialDelivery = items.map(item => {
        const product = productsData.find(p => p.id === item.productId)!;
        const available = availability.availableByProduct.get(item.productId) || 0;
        const toDeliver = Math.min(item.quantity, available);
        const unitPrice = parseFloat(product.price);
        return {
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available,
          canDeliver: toDeliver,
          shortage: item.quantity - available,
          subtotalIfPartial: (unitPrice * toDeliver).toString(),
        };
      });

      const totalRequested = items.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.productId)!;
        return sum + (parseFloat(product.price) * item.quantity);
      }, 0);

      const totalCanDeliver = potentialDelivery.reduce((sum, item) => {
        return sum + (parseFloat(item.subtotalIfPartial));
      }, 0);

      return NextResponse.json({
        success: true,
        action: "check",
        data: {
          hasShortage: availability.hasShortage,
          shortageItems: availability.shortages,
          potentialDelivery,
          totals: {
            requested: totalRequested.toString(),
            canDeliver: totalCanDeliver.toString(),
          },
          options: availability.hasShortage ? {
            partial: "Create order with available items only",
            addInventory: "Add missing inventory and complete sale",
            pending: "Create pending order for unfulfilled items",
          } : {
            complete: "Complete sale with all items",
          },
        },
      });
    }

    // Handle "fail" action
    if (availability.hasShortage && shortageAction === "fail") {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient inventory",
          shortageItems: availability.shortages,
        },
        { status: 400 }
      );
    }

    // Process the sale based on action
    const result = await db.transaction(async (tx) => {
      const deliveryItems: DeliveryItem[] = [];
      const remainingShortages: ShortageItem[] = [];
      let actualTotal = 0;
      let actualQuantity = 0; // Track actual items delivered
      const extraInventoryCreated: Array<{ productId: string; quantity: number }> = [];

      // Group inventory items to add by product
      const inventoryByProduct = new Map<string, Array<Record<string, string | number | boolean>>>();
      if (inventoryItemsToAdd) {
        for (const invItem of inventoryItemsToAdd) {
          if (!inventoryByProduct.has(invItem.productId)) {
            inventoryByProduct.set(invItem.productId, []);
          }
          inventoryByProduct.get(invItem.productId)!.push(invItem.values);
        }
      }

      // First pass: fulfill with available inventory
      for (const requestItem of items) {
        const product = productsData.find((p) => p.id === requestItem.productId);
        if (!product) continue;

        const { deliveredItems, shortage } = await fulfillItems(
          tx,
          requestItem.productId,
          requestItem.quantity,
          product
        );
        deliveryItems.push(deliveredItems);
        actualTotal += deliveredItems.quantity * deliveredItems.unitPrice;
        actualQuantity += deliveredItems.quantity;

        if (shortage > 0) {
          const additionalInventory = inventoryByProduct.get(requestItem.productId) || [];

          if (additionalInventory.length > 0) {
            // Determine how many to fulfill vs keep available
            const toFulfill = Math.min(shortage, additionalInventory.length);
            const toKeepAvailable = additionalInventory.length - toFulfill;

            // Create and sell items needed for this order
            if (toFulfill > 0) {
              const toSell = additionalInventory.slice(0, toFulfill);
              const createdSold = await createInventory(
                tx,
                requestItem.productId,
                toSell,
                product.inventoryTemplateId!,
                true
              );

              // Add created items to delivery
              deliveredItems.items.push(...createdSold);
              deliveredItems.quantity += toFulfill;
              deliveredItems.unitPrice = parseFloat(product.price);
              actualTotal += toFulfill * parseFloat(product.price);
              actualQuantity += toFulfill;
            }

            // Create extra items as available for future sales
            if (toKeepAvailable > 0) {
              const toKeep = additionalInventory.slice(toFulfill);
              await createInventory(
                tx,
                requestItem.productId,
                toKeep,
                product.inventoryTemplateId!,
                false
              );
              extraInventoryCreated.push({ productId: requestItem.productId, quantity: toKeepAvailable });
            }

            // Check if still has shortage
            const remainingShortage = requestItem.quantity - deliveredItems.quantity;
            if (remainingShortage > 0) {
              remainingShortages.push({
                productId: product.id,
                productName: product.name,
                requested: requestItem.quantity,
                available: deliveredItems.quantity,
                shortage: remainingShortage,
              });
            }
          } else {
            // No additional inventory provided
            if (shortageAction !== "partial") {
              remainingShortages.push({
                productId: product.id,
                productName: product.name,
                requested: requestItem.quantity,
                available: deliveredItems.quantity,
                shortage,
              });
            }
          }
        }
      }

      // Determine order status
      const hasUnfulfilledItems = remainingShortages.length > 0;
      let orderStatus: "pending" | "completed" = "completed";
      let fulfillmentStatus: "pending" | "processing" | "delivered" = "delivered";

      if (shortageAction === "partial") {
        // Partial: order is completed with whatever was delivered
        orderStatus = "completed";
        fulfillmentStatus = "delivered";
      } else if (hasUnfulfilledItems && shortageAction === "pending") {
        // Pending: order stays pending for unfulfilled items
        orderStatus = "pending";
        fulfillmentStatus = "pending";
      } else if (!hasUnfulfilledItems) {
        // All items fulfilled
        orderStatus = "completed";
        fulfillmentStatus = "delivered";
      }

      // Create order
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerEmail,
          customerName: customerName || null,
          subtotal: actualTotal.toString(),
          discount: "0",
          total: actualTotal.toString(),
          status: orderStatus,
          fulfillmentStatus,
          paymentMethod: "manual",
          paymentStatus: "completed",
          processedBy: user.id,
          deliveredAt: fulfillmentStatus === "delivered" ? new Date() : null,
          claimedBy: hasUnfulfilledItems ? user.id : null,
          claimedAt: hasUnfulfilledItems ? new Date() : null,
          claimExpiresAt: hasUnfulfilledItems ? new Date(Date.now() + 30 * 60 * 1000) : null,
        })
        .returning();

      // Create order items and link inventory
      for (const deliveryItem of deliveryItems) {
        const unitPrice = deliveryItem.unitPrice;
        const product = productsData.find(p => p.id === deliveryItem.productId);

        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            productId: deliveryItem.productId,
            productName: product?.name || deliveryItem.productName,
            productSlug: product?.slug || deliveryItem.productId,
            platformId: null,
            platformName: null,
            deliveryType: product?.deliveryType || "manual",
            price: unitPrice.toString(),
            quantity: deliveryItem.quantity,
            subtotal: (unitPrice * deliveryItem.quantity).toString(),
            deliveredInventoryIds: sql`${JSON.stringify(
              deliveryItem.items.map((i) => i.inventoryId)
            )}::jsonb`,
          })
          .returning();

        // Link inventory to order item
        for (const soldItem of deliveryItem.items) {
          await tx
            .update(inventoryItems)
            .set({ orderItemId: orderItem.id })
            .where(eq(inventoryItems.id, soldItem.inventoryId));
        }
      }

      // Create delivery snapshot
      await tx.insert(orderDeliverySnapshots).values({
        orderId: order.id,
        payload: { items: deliveryItems },
        createdBy: user.id,
      });

      // Log activity
      if (orderStatus === "completed") {
        await logOrderCompleted(user.id, order.id, actualTotal.toString());
      } else {
        await logActivity({
          userId: user.id,
          action: "order_created",
          entity: "order",
          entityId: order.id,
          metadata: {
            total: actualTotal.toString(),
            pendingItems: remainingShortages,
          },
        });
      }

      return {
        order,
        deliveryItems,
        shortageItems: remainingShortages,
        extraInventoryCreated,
      };
    });

    return NextResponse.json(
      {
        success: true,
        action: shortageAction,
        data: {
          orderId: result.order.id,
          order: result.order,
          deliveryItems: result.deliveryItems,
          shortageItems: result.shortageItems,
          hasShortage: result.shortageItems.length > 0,
          extraInventoryCreated: result.extraInventoryCreated,
        },
      },
      { status: 201 }
    );
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

    console.error("Manual sell error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
