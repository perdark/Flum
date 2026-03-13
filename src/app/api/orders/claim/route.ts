/**
 * Order Claiming API Routes
 *
 * POST /api/orders/claim - Claim an order or next pending order
 * POST /api/orders/release - Release a claimed order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, or, isNull } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

// Helper to check if user can modify the order
async function canModifyOrder(orderId: string, userId: string, isAdmin: boolean): Promise<{ canModify: boolean; error?: string }> {
  const db = getDb();

  const [order] = await db
    .select({
      claimedBy: orders.claimedBy,
      claimedAt: orders.claimedAt,
      claimExpiresAt: orders.claimExpiresAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { canModify: false, error: "Order not found" };
  }

  // Admins can always modify
  if (isAdmin) {
    return { canModify: true };
  }

  // Check if claimed by someone else
  if (order.claimedBy && order.claimedBy !== userId) {
    // Check if claim expired
    if (order.claimExpiresAt && order.claimExpiresAt > new Date()) {
      return { canModify: false, error: "Order is claimed by another staff member" };
    }
  }

  return { canModify: true };
}

// ============================================================================
// POST /api/orders/claim - Claim an order
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const isAdmin = user.role === "admin";

    const body = await request.json();
    const { orderId, claimNext } = body;

    const db = getDb();

    if (claimNext) {
      // Claim the next pending order
      const CLAIM_TTL_MINUTES = 30; // Auto-release after 30 minutes
      const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);

      // Use FOR UPDATE SKIP LOCKED to safely get next pending order
      const result = await db.transaction(async (tx) => {
        const orderResult = await tx.execute(
          sql`
            UPDATE orders
            SET claimed_by = ${user.id},
                claimed_at = NOW(),
                claim_expires_at = ${claimExpiresAt},
                updated_at = NOW()
            WHERE id = (
              SELECT id
              FROM orders
              WHERE (claimed_by IS NULL
                     OR claim_expires_at < NOW())
                AND status = 'pending'
                AND deleted_at IS NULL
              ORDER BY created_at ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED
            )
            RETURNING id, customer_email, customer_name, total, created_at
          `
        );

        if (!orderResult.rows || orderResult.rows.length === 0) {
          return null;
        }

        const claimedOrder = orderResult.rows[0] as any;

        // Log activity
        await logActivity({
          userId: user.id,
          action: "order_claimed",
          entity: "order",
          entityId: claimedOrder.id,
          metadata: { autoClaimed: true },
        });

        return claimedOrder;
      });

      if (!result) {
        return NextResponse.json(
          { success: false, error: "No pending orders available to claim" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          order: result,
          claimedBy: user.id,
          claimedAt: new Date(),
          claimExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    }

    // Claim specific order
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required when not claiming next" },
        { status: 400 }
      );
    }

    // Check if order exists
    const [order] = await db
      .select()
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

    // Check if already claimed by someone else
    if (order.claimedBy && order.claimedBy !== user.id) {
      if (order.claimExpiresAt && order.claimExpiresAt > new Date()) {
        // Get claimant name
        const [claimant] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, order.claimedBy))
          .limit(1);

        return NextResponse.json(
          {
            success: false,
            error: "Order is already claimed",
            claimedBy: order.claimedBy,
            claimantName: claimant?.name,
            claimedAt: order.claimedAt,
          },
          { status: 409 }
        );
      }
      // Claim expired, allow re-claiming
    }

    // Set TTL for claim (30 minutes)
    const CLAIM_TTL_MINUTES = 30;
    const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);

    // Update order with claim
    const [updated] = await db
      .update(orders)
      .set({
        claimedBy: user.id,
        claimedAt: new Date(),
        claimExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "order_claimed",
      entity: "order",
      entityId: orderId,
      metadata: { previousClaimant: order.claimedBy },
    });

    return NextResponse.json({
      success: true,
      data: updated,
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

    console.error("Claim order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
