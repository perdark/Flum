/**
 * Individual Order API Routes
 *
 * GET /api/orders/[id] - Get order by ID
 * PUT /api/orders/[id] - Update order status
 * DELETE /api/orders/[id] - Cancel/delete order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products, couponUsage, coupons } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { fulfillOrder, getOrderDeliveryData } from "@/services/autoDelivery";
import { logOrderCancelled } from "@/services/activityLog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/orders/[id] - Get order details
// ============================================================================()

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_ORDERS);
    const { id } = await context.params;

    const db = getDb();

    const [order] = await db
      .select({
        id: orders.id,
        customerEmail: orders.customerEmail,
        customerName: orders.customerName,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        currency: orders.currency,
        couponId: orders.couponId,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        deliveredAt: orders.deliveredAt,
        processedBy: orders.processedBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(eq(orders.id, id), sql`deleted_at IS NULL`))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Get order items
    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
        deliveredInventoryIds: orderItems.deliveredInventoryIds,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    // Get delivery data if fulfilled
    let deliveryData = null;
    if (order.fulfillmentStatus === "delivered") {
      deliveryData = await getOrderDeliveryData(id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items,
        deliveryData,
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

    console.error("Get order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/orders/[id] - Update order (process, complete, cancel)
// ============================================================================()

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id } = await context.params;

    const body = await request.json();
    const { action } = body; // 'complete', 'cancel', 'fulfill'

    const db = getDb();

    // Get current order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), sql`deleted_at IS NULL`))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case "fulfill": {
        // Trigger auto-delivery
        const result = await fulfillOrder(id, user.id);

        if (result.success) {
          return NextResponse.json({
            success: true,
            data: {
              message: "Order fulfilled successfully",
              fulfillmentStatus: result.fulfillmentStatus,
              deliveredItems: result.deliveredItems,
              errors: result.errors,
            },
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "Fulfillment failed",
              details: result.errors,
            },
            { status: 400 }
          );
        }
      }

      case "complete": {
        // Mark order as completed (without auto-delivery)
        const [updated] = await db
          .update(orders)
          .set({
            status: "completed",
            processedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id))
          .returning();

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      case "cancel": {
        const { reason } = body;

        const [updated] = await db
          .update(orders)
          .set({
            status: "cancelled",
            processedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id))
          .returning();

        // Log cancellation
        await logOrderCancelled(user.id, id, reason);

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use: fulfill, complete, or cancel" },
          { status: 400 }
        );
    }
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

    console.error("Update order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/orders/[id] - Soft delete order
// ============================================================================()

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id } = await context.params;

    const db = getDb();

    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), sql`deleted_at IS NULL`))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(orders)
      .set({
        deletedAt: new Date(),
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    return NextResponse.json({
      success: true,
      data: { message: "Order deleted successfully" },
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

    console.error("Delete order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
