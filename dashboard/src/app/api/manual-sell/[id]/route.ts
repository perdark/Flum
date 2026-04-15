/**
 * Manual Sell Delivery API Route
 *
 * GET /api/manual-sell/[id] - Get delivery data for an order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, inventoryItems, products, orderDeliverySnapshots, deliveries } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, sql, inArray } from "drizzle-orm";

function mapDeliveriesFromRows(
  rows: Array<{
    id: string;
    orderItemId: string;
    type: string;
    content: string;
    sentAt: Date | null;
  }>
) {
  return rows.map((d) => {
    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(d.content) as Record<string, unknown>;
    } catch {
      content = { text: d.content };
    }
    const invRaw = content.inventoryItemId ?? content.inventory_item_id;
    const inventoryItemId = typeof invRaw === "string" ? invRaw : null;
    return {
      id: d.id,
      type: d.type,
      sentAt: d.sentAt ? d.sentAt.toISOString() : null,
      content,
      inventoryItemId,
    };
  });
}

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

    // Get order metadata
    const [orderData] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerEmail: orders.customerEmail,
        customerName: orders.customerName,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        total: orders.total,
        subtotal: orders.subtotal,
        customerType: orders.customerType,
        createdAt: orders.createdAt,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const deliveryRows = await db
      .select({
        id: deliveries.id,
        orderItemId: deliveries.orderItemId,
        type: deliveries.type,
        content: deliveries.content,
        sentAt: deliveries.sentAt,
      })
      .from(deliveries)
      .innerJoin(orderItems, eq(deliveries.orderItemId, orderItems.id))
      .where(eq(orderItems.orderId, orderId));

    const deliveriesPayload = mapDeliveriesFromRows(deliveryRows);

    if (snapshot && snapshot.payload && snapshot.payload.items && snapshot.payload.items.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          order: orderData || null,
          deliveryItems: snapshot.payload.items,
          fromSnapshot: true,
          deliveries: deliveriesPayload,
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
        productName: sql<string>`COALESCE(${products.name}, ${orderItems.productName})`.as("productName"),
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
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
        order: orderData || null,
        deliveryItems,
        fromSnapshot: false,
        deliveries: deliveriesPayload,
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
