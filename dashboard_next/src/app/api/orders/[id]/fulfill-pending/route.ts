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
import { orders, orderItems, inventoryItems, products, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { getOrderDeliveryData } from "@/services/autoDelivery";

interface InventoryItemRequest {
  productId: string;
  values: Record<string, string | number | boolean>;
}

interface FulfillPendingRequest {
  inventoryItems: InventoryItemRequest[];
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
    const { inventoryItems: inputInventoryItems = [] } = body;

    // Validate and filter input
    const validInventoryItems = inputInventoryItems.filter(
      (item) => item && item.productId && item.values && typeof item.values === "object"
    );

    if (validInventoryItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Valid inventory items are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get order with claim info
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        claimedBy: orders.claimedBy,
        claimedAt: orders.claimedAt,
        claimExpiresAt: orders.claimExpiresAt,
        customerEmail: orders.customerEmail,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), sql`deleted_at IS NULL`))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order is in pending status
    if (order.status !== "pending" || order.fulfillmentStatus !== "processing") {
      return NextResponse.json(
        { success: false, error: "Order must be in pending status with processing fulfillment" },
        { status: 400 }
      );
    }

    // Check claim enforcement
    const isClaimExpired = order.claimExpiresAt && order.claimExpiresAt < new Date();
    const isClaimedByMe = order.claimedBy === user.id;
    const isClaimedByOther = order.claimedBy && !isClaimedByMe && !isClaimExpired;

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

    // Get order items to determine what needs fulfillment
    const orderItemsData = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        deliveredInventoryIds: orderItems.deliveredInventoryIds,
        productName: products.name,
        inventoryTemplateId: products.inventoryTemplateId,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // Group valid inventory items by product
    const inventoryByProduct = new Map<string, InventoryItemRequest[]>();
    for (const item of validInventoryItems) {
      if (!inventoryByProduct.has(item.productId)) {
        inventoryByProduct.set(item.productId, []);
      }
      inventoryByProduct.get(item.productId)!.push(item);
    }

    // Process fulfillment
    const result = await db.transaction(async (tx) => {
      const fulfilledItems: Array<{
        productName: string;
        newlyFulfilled: number;
        remainingNeeded: number;
        extraAdded: number;
      }> = [];
      let allFulfilled = true;

      for (const orderItem of orderItemsData) {
        const currentlyDelivered = (orderItem.deliveredInventoryIds || []).length;
        const stillNeeded = orderItem.quantity - currentlyDelivered;
        const itemsToAdd = inventoryByProduct.get(orderItem.productId) || [];

        const toFulfillCount = Math.min(stillNeeded, itemsToAdd.length);
        const extraCount = Math.max(0, itemsToAdd.length - toFulfillCount);

        // Create inventory items needed for order (mark as sold)
        const newSoldIds: string[] = [];
        for (let i = 0; i < toFulfillCount; i++) {
          const itemRequest = itemsToAdd[i];

          const [inserted] = await tx
            .insert(inventoryItems)
            .values({
              productId: orderItem.productId,
              templateId: orderItem.inventoryTemplateId!,
              values: itemRequest.values || {},
              status: "sold",
              purchasedAt: new Date(),
              orderItemId: orderItem.id,
            })
            .returning();

          newSoldIds.push(inserted.id);
        }

        // Update product stats for sold items (increase totalSold only, not stockCount)
        if (toFulfillCount > 0) {
          await tx
            .update(products)
            .set({
              totalSold: sql`${products.totalSold} + ${toFulfillCount}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, orderItem.productId));
        }

        // Create extra items as available for future sales
        for (let i = toFulfillCount; i < itemsToAdd.length; i++) {
          const itemRequest = itemsToAdd[i];

          const [inserted] = await tx
            .insert(inventoryItems)
            .values({
              productId: orderItem.productId,
              templateId: orderItem.inventoryTemplateId!,
              values: itemRequest.values || {},
              status: "available",
            })
            .returning();
        }

        // Update product stats for extra items (increase stockCount)
        if (extraCount > 0) {
          await tx
            .update(products)
            .set({
              stockCount: sql`${products.stockCount} + ${extraCount}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, orderItem.productId));
        }

        // Update order item with new inventory IDs
        const updatedIds = [...(orderItem.deliveredInventoryIds || []), ...newSoldIds];
        await tx
          .update(orderItems)
          .set({
            deliveredInventoryIds: sql`${JSON.stringify(updatedIds)}::jsonb`,
          })
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
