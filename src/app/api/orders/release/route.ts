/**
 * Order Release API Route
 *
 * POST /api/orders/release - Release a claimed order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const isAdmin = user.role === "admin";

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if order exists and who claimed it
    const [order] = await db
      .select({
        claimedBy: orders.claimedBy,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          sql`${orders.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Check permissions: only admin or the claimant can release
    if (order.claimedBy && order.claimedBy !== user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "You can only release orders claimed by you" },
        { status: 403 }
      );
    }

    // Release claim
    await db
      .update(orders)
      .set({
        claimedBy: null,
        claimedAt: null,
        claimExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log activity
    await logActivity({
      userId: user.id,
      action: "order_released",
      entity: "order",
      entityId: orderId,
      metadata: { previousClaimant: order.claimedBy },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Order released successfully" },
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

    console.error("Release order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
