/**
 * Pending Order Fulfillment API Route
 *
 * POST /api/orders/[id]/fulfill-pending - Add inventory to pending order and fulfill items
 *
 * This endpoint allows adding new inventory items to a pending order.
 * Extra items (beyond what's needed) become available inventory.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, inventoryItems, products, users, productPricing } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { getOrderDeliveryData } from "@/services/autoDelivery";

interface InventoryItemRequest {
  /** Set for product-linked orders */
  productId?: string | null;
  /** Target order line (required for template-only / manual template orders) */
  orderItemId?: string;
  values: Record<string, string | number | boolean>;
}

interface FulfillPendingRequest {
  inventoryItems: InventoryItemRequest[];
  newCost?: number; // New cost for this fulfillment
  eachLineIsProduct?: boolean; // Treat each line as separate product
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const isAdmin = user.role === "admin";
    const { id: orderId } = await context.params;

    const body: FulfillPendingRequest = await request.json();
    const { inventoryItems: inputInventoryItems = [], newCost, eachLineIsProduct } = body;

    const validInventoryItems = inputInventoryItems.filter(
      (item) =>
        item &&
        item.values &&
        typeof item.values === "object" &&
        (item.orderItemId || item.productId)
    );

    if (validInventoryItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Valid inventory items are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        claimedBy: orders.claimedBy,
        claimedAt: orders.claimedAt,
        claimExpiresAt: orders.claimExpiresAt,
        customerEmail: orders.customerEmail,
        metadata: orders.metadata,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), sql`deleted_at IS NULL`))
      .limit(1);

    const templateIdFromOrder =
      order?.metadata &&
      typeof (order.metadata as Record<string, unknown>).templateId === "string"
        ? ((order.metadata as Record<string, unknown>).templateId as string)
        : undefined;

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order is in pending status
    if (order.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Order must be in pending status" },
        { status: 400 }
      );
    }

    // Check claim enforcement
    const isClaimExpired = order.claimExpiresAt && order.claimExpiresAt < new Date();
    const isClaimedByMe = order.claimedBy === user.id;
    const isClaimedByOther = order.claimedBy && !isClaimedByMe && !isClaimExpired;

    // If claimed by someone else, deny access
    if (isClaimedByOther) {
      return NextResponse.json(
        { success: false, error: "Order is claimed by another staff member" },
        { status: 403 }
      );
    }

    // Auto-set to processing if claimed by me but status wasn't updated yet
    const needsProcessingUpdate = isClaimedByMe && order.fulfillmentStatus !== "processing";

    if (!isAdmin && isClaimedByOther) {
      // Get claimant name
      const [claimant] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, order.claimedBy!))
        .limit(1);

      return NextResponse.json(
        {
          success: false,
          error: "Order is claimed by another staff member",
          claimedBy: claimant?.name || "Unknown",
        },
        { status: 403 }
      );
    }

    const orderItemsData = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        deliveredInventoryIds: orderItems.deliveredInventoryIds,
        productName: sql<string>`COALESCE(${products.name}, ${orderItems.productName})`.as("productName"),
        inventoryTemplateId: products.inventoryTemplateId,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // Get product costs for items that need fulfillment
    const productIdsNeedingFulfillment = orderItemsData
      .filter((item) => (item.deliveredInventoryIds?.length || 0) < item.quantity)
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));

    // Fetch costs from ProductPricing using inArray from drizzle
    let productCosts: Array<{ productId: string; cost: string | null }> = [];
    if (productIdsNeedingFulfillment.length > 0) {
      const costs = await db
        .select({
          productId: productPricing.productId,
          cost: productPricing.cost,
        })
        .from(productPricing)
        .where(inArray(productPricing.productId, productIdsNeedingFulfillment));
      productCosts = costs.map((c) => ({
        productId: c.productId,
        cost: c.cost?.toString() || null,
      }));
    }

    // Create a map of productId -> cost
    const costMap = new Map<string, number | null>();
    productCosts.forEach((pc) => {
      if (pc.cost !== null) {
        costMap.set(pc.productId, parseFloat(pc.cost));
      }
    });

    const inventoryByOrderItemId = new Map<string, InventoryItemRequest[]>();
    const inventoryByProduct = new Map<string, InventoryItemRequest[]>();
    for (const item of validInventoryItems) {
      if (item.orderItemId) {
        if (!inventoryByOrderItemId.has(item.orderItemId)) {
          inventoryByOrderItemId.set(item.orderItemId, []);
        }
        inventoryByOrderItemId.get(item.orderItemId)!.push(item);
      } else if (item.productId) {
        if (!inventoryByProduct.has(item.productId)) {
          inventoryByProduct.set(item.productId, []);
        }
        inventoryByProduct.get(item.productId)!.push(item);
      }
    }

    for (const orderItem of orderItemsData) {
      const itemsToAdd =
        inventoryByOrderItemId.get(orderItem.id) ||
        (orderItem.productId ? inventoryByProduct.get(orderItem.productId) || [] : []);
      if (itemsToAdd.length === 0) continue;
      const tid = orderItem.inventoryTemplateId ?? templateIdFromOrder;
      if (!tid) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This order needs a template reference (metadata.templateId for manual template stock orders).",
          },
          { status: 400 }
        );
      }
    }

    // Process fulfillment
    const result = await db.transaction(async (tx) => {
      if (needsProcessingUpdate) {
        await tx.update(orders)
          .set({ fulfillmentStatus: "processing" })
          .where(eq(orders.id, orderId));
      }

      const fulfilledItems: Array<{
        productName: string;
        newlyFulfilled: number;
        remainingNeeded: number;
        extraAdded: number;
      }> = [];
      let allFulfilled = true;

      for (const orderItem of orderItemsData) {
        const lineProductId = orderItem.productId;
        const deliveredIds = Array.isArray(orderItem.deliveredInventoryIds)
          ? orderItem.deliveredInventoryIds
          : [];
        const currentlyDelivered = deliveredIds.length;
        const stillNeeded = orderItem.quantity - currentlyDelivered;

        let itemsToAdd =
          inventoryByOrderItemId.get(orderItem.id) ||
          (lineProductId ? inventoryByProduct.get(lineProductId) || [] : []);
        if (itemsToAdd.length === 0) continue;

        const templateIdForLine =
          orderItem.inventoryTemplateId ?? templateIdFromOrder ?? null;
        if (!templateIdForLine) continue;

        const toFulfillCount = Math.min(stillNeeded, itemsToAdd.length);
        const extraCount = Math.max(0, itemsToAdd.length - toFulfillCount);

        const newSoldIds: string[] = [];
        for (let i = 0; i < toFulfillCount; i++) {
          const itemRequest = itemsToAdd[i];

          const [inserted] = await tx
            .insert(inventoryItems)
            .values({
              productId: lineProductId,
              templateId: templateIdForLine,
              values: itemRequest.values || {},
              status: "sold",
              purchasedAt: new Date(),
              orderItemId: orderItem.id,
            })
            .returning();

          newSoldIds.push(inserted.id);
        }

        if (toFulfillCount > 0 && lineProductId) {
          await tx
            .update(products)
            .set({
              totalSold: sql`${products.totalSold} + ${toFulfillCount}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, lineProductId));
        }

        for (let i = toFulfillCount; i < itemsToAdd.length; i++) {
          const itemRequest = itemsToAdd[i];

          await tx.insert(inventoryItems).values({
            productId: lineProductId,
            templateId: templateIdForLine,
            values: itemRequest.values || {},
            status: "available",
            orderItemId: null,
          });
        }

        if (extraCount > 0 && lineProductId) {
          await tx
            .update(products)
            .set({
              stockCount: sql`${products.stockCount} + ${extraCount}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, lineProductId));
        }

        const updatedIds = [...deliveredIds, ...newSoldIds];
        const updateValues: Record<string, unknown> = {
          deliveredInventoryIds: sql`${JSON.stringify(updatedIds)}::jsonb`,
        };
        if (newCost !== undefined) {
          updateValues.cost = newCost.toString();
        } else if (lineProductId && costMap.has(lineProductId)) {
          const productCost = costMap.get(lineProductId);
          if (productCost !== null && productCost !== undefined) {
            updateValues.cost = productCost.toString();
          }
        }
        await tx
          .update(orderItems)
          .set(updateValues)
          .where(eq(orderItems.id, orderItem.id));

        const remainingAfterAdd = stillNeeded - toFulfillCount;
        if (remainingAfterAdd > 0) {
          allFulfilled = false;
        }

        fulfilledItems.push({
          productName: orderItem.productName,
          newlyFulfilled: toFulfillCount,
          remainingNeeded: remainingAfterAdd,
          extraAdded: extraCount,
        });
      }

      // Update order status if all items fulfilled
      let updatedOrder = order;
      if (allFulfilled) {
        [updatedOrder] = await tx
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
          .where(eq(orders.id, orderId))
          .returning();

        // Update delivery snapshot
        const deliveryData = await getOrderDeliveryData(orderId);
        await tx.execute(
          sql`
            UPDATE order_delivery_snapshots
            SET payload = ${JSON.stringify(deliveryData)}::jsonb
            WHERE order_id = ${orderId}
          `
        );
      }

      return {
        order: updatedOrder,
        fulfilledItems,
        allFulfilled,
      };
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: result.allFulfilled ? "order_completed" : "order_claimed",
      entity: "order",
      entityId: orderId,
      metadata: {
        itemsFulfilled: result.fulfilledItems,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        fulfilledItems: result.fulfilledItems,
        allFulfilled: result.allFulfilled,
        message: result.allFulfilled
          ? "Order fully fulfilled and completed"
          : "Order partially fulfilled, still needs more inventory",
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

    console.error("Fulfill pending order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
