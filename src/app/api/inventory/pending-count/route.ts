/**
 * Pending Inventory Count API
 *
 * GET /api/inventory/pending-count?productId=xxx - Get count of pending items needed for this product
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Count pending items for this product
    // Pending items are those in orders with status='pending' or fulfillmentStatus='processing'
    // where the order item quantity > delivered inventory count
    const result = await db
      .select({
        totalRequested: sql<number>`sum(${orderItems.quantity})::int`,
        totalDelivered: sql<number>`sum(array_length(${orderItems.deliveredInventoryIds}, 1))::int`,
        pendingOrdersCount: sql<number>`count(distinct ${orders.id})::int`,
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

    const data = result[0];
    const totalRequested = data?.totalRequested || 0;
    const totalDelivered = data?.totalDelivered || 0;
    const pendingItems = Math.max(0, totalRequested - totalDelivered);
    const pendingOrdersCount = data?.pendingOrdersCount || 0;

    return NextResponse.json({
      success: true,
      data: {
        productId,
        pendingItems,
        pendingOrdersCount,
        totalRequested,
        totalDelivered,
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

    console.error("Pending count error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
