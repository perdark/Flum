/**
 * Add Inventory to Pending Order API Route
 *
 * POST /api/orders/[id]/add-inventory - Quick endpoint to add inventory and fulfill pending order
 *
 * This is a streamlined endpoint that:
 * 1. Auto-claims the order if not claimed
 * 2. Creates inventory items in bulk
 * 3. Immediately fulfills pending items with the new inventory
 * 4. Releases the claim if order is completed
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, inventoryItems, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { getOrderDeliveryData } from "@/services/autoDelivery";

interface AddInventoryRequest {
  productId: string;
  quantity: number;
  values: Record<string, string | number | boolean>;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const isAdmin = user.role === "admin";
    const { id: orderId } = await context.params;

    const body: AddInventoryRequest = await request.json();
    const { productId, quantity, values } = body;

    // Validate input
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    if (!values || Object.keys(values).length === 0) {
      return NextResponse.json(
        { success: false, error: "Inventory values are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get order and check status
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        claimedBy: orders.claimedBy,
        claimedAt: orders.claimedAt,
        claimExpiresAt: orders.claimExpiresAt,
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

    // Check if order is in pending/processing status
    if (order.status !== "pending" || order.fulfillmentStatus !== "processing") {
      return NextResponse.json(
        { success: false, error: "Order is not in pending status" },
        { status: 400 }
      );
    }

    // Auto-claim order if not claimed
    if (!order.claimedBy) {
      const CLAIM_TTL_MINUTES = 30;
      const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);

      await db
        .update(orders)
        .set({
          claimedBy: user.id,
          claimedAt: new Date(),
          claimExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await logActivity({
        userId: user.id,
        action: "order_claimed",
        entity: "order",
        entityId: orderId,
        metadata: { autoClaimed: true },
      });
    }

    // Check claim enforcement
    const isClaimExpired = order.claimExpiresAt && order.claimExpiresAt < new Date();
    const isClaimedByMe = order.claimedBy === user.id;
    const isClaimedByOther = order.claimedBy && !isClaimedByMe && !isClaimExpired;

    if (!isAdmin && isClaimedByOther) {
      return NextResponse.json(
        { success: false, error: "Order is claimed by another staff member" },
        { status: 403 }
      );
    }

    // Get product info
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

    // Process inventory addition and fulfillment
    const result = await db.transaction(async (tx) => {
      // Find the order item for this product
      const [orderItem] = await tx
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          deliveredInventoryIds: orderItems.deliveredInventoryIds,
        })
        .from(orderItems)
        .where(and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId)))
        .limit(1);

      if (!orderItem) {
        throw new Error("Product not found in order items");
      }

      const currentlyDelivered = (orderItem.deliveredInventoryIds || []).length;
      const stillNeeded = orderItem.quantity - currentlyDelivered;
      const toFulfillNow = Math.min(quantity, stillNeeded);

      // Create all requested inventory items
      const newInventoryIds: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const [inserted] = await tx
          .insert(inventoryItems)
          .values({
            productId,
            templateId: product.inventoryTemplateId!,
            values,
            status: "sold",
            purchasedAt: new Date(),
            // Only link to order item for items being fulfilled now
            orderItemId: i < toFulfillNow ? orderItem.id : null,
          })
          .returning();

        newInventoryIds.push(inserted.id);
      }

      // Update order item with newly fulfilled inventory
      let updatedDeliveredIds = [...(orderItem.deliveredInventoryIds || [])];
      const newlyFulfilledIds = newInventoryIds.slice(0, toFulfillNow);
      updatedDeliveredIds.push(...newlyFulfilledIds);

      await tx
        .update(orderItems)
        .set({
          deliveredInventoryIds: sql`${JSON.stringify(updatedDeliveredIds)}::jsonb`,
        })
        .where(eq(orderItems.id, orderItem.id));

      // Update product stats (only count items that were sold)
      await tx
        .update(products)
        .set({
          totalSold: sql`${products.totalSold} + ${toFulfillNow}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      // Calculate remaining needed across all order items
      const allOrderItems = await tx
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          deliveredInventoryIds: orderItems.deliveredInventoryIds,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      let allFulfilled = true;
      for (const item of allOrderItems) {
        const delivered = (item.deliveredInventoryIds || []).length;
        if (delivered < item.quantity) {
          allFulfilled = false;
          break;
        }
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
        orderItem: {
          id: orderItem.id,
          totalNeeded: orderItem.quantity,
          previouslyDelivered: currentlyDelivered,
          newlyFulfilled: toFulfillNow,
          remainingNeeded: stillNeeded - toFulfillNow,
        },
        inventoryCreated: quantity,
        inventoryRemaining: quantity - toFulfillNow,
        allFulfilled,
      };
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: result.allFulfilled ? "order_completed" : "inventory_added",
      entity: "order",
      entityId: orderId,
      metadata: {
        productId,
        inventoryCreated: result.inventoryCreated,
        newlyFulfilled: result.orderItem.newlyFulfilled,
        inventoryRemaining: result.inventoryRemaining,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        summary: {
          product: product.name,
          inventoryCreated: result.inventoryCreated,
          newlyFulfilled: result.orderItem.newlyFulfilled,
          totalNeeded: result.orderItem.totalNeeded,
          remainingNeeded: result.orderItem.remainingNeeded,
          inventoryRemaining: result.inventoryRemaining,
        },
        allFulfilled: result.allFulfilled,
        message: result.allFulfilled
          ? `Order completed! Added ${result.inventoryCreated} item(s).`
          : `Added ${result.inventoryCreated} item(s). ${result.orderItem.remainingNeeded} more needed for this product.`,
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
      if (error.message === "Product not found in order items") {
        return NextResponse.json(
          { success: false, error: "Product not found in this order" },
          { status: 400 }
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
