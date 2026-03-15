/**
 * Manual Sell Delivery API Route
 *
 * GET /api/manual-sell/[id] - Get delivery data for an order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, inventoryItems, products, orderDeliverySnapshots } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Get delivery data for an order

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.VIEW_ORDERS);
    const { id: orderId } = await context.params;

    const db = getDb();

    // First, try to get from snapshot
    const [snapshot] = await db
      .select({
        payload: orderDeliverySnapshots.payload,
      })
      .from(orderDeliverySnapshots)
      .where(eq(orderDeliverySnapshots.orderId, orderId))
      .orderBy(sql`${orderDeliverySnapshots.createdAt} DESC`)
      .limit(1);

    if (snapshot && snapshot.payload && snapshot.payload.items && snapshot.payload.items.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          deliveryItems: snapshot.payload.items,
          fromSnapshot: true,
        },
      });
    }

    // If no snapshot or empty, build from order items
    const orderItemsData = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        deliveredInventoryIds: orderItems.deliveredInventoryIds,
        productName: products.name,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    const deliveryItems = [];

    for (const orderItem of orderItemsData) {
      const deliveredIds = orderItem.deliveredInventoryIds || [];

      if (deliveredIds.length === 0) continue;

      // Get inventory items for this order item
      const inventory = await db
        .select({
          id: inventoryItems.id,
          values: inventoryItems.values,
        })
        .from(inventoryItems)
        .where(inArray(inventoryItems.id, deliveredIds));

      deliveryItems.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        quantity: inventory.length,
        items: inventory.map((inv) => ({
          inventoryId: inv.id,
          values: inv.values || {},
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        deliveryItems,
        fromSnapshot: false,
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

    console.error("Get manual sell delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
