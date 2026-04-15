import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { fulfillOrder } from "@/services/autoDelivery";
import { logActivity } from "@/services/activityLog";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id } = await context.params;
    const db = getDb();

    const [order] = await db
      .select({ id: orders.id, fulfillmentStatus: orders.fulfillmentStatus })
      .from(orders)
      .where(and(eq(orders.id, id), sql`orders.deleted_at IS NULL`))
      .limit(1);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const result = await fulfillOrder(id, user.id);

    if (result.success) {
      await db
        .update(orders)
        .set({
          approvedBy: user.id,
          approvedAt: new Date(),
        })
        .where(eq(orders.id, id));

      await logActivity({
        userId: user.id,
        action: "order_completed",
        entity: "order",
        entityId: id,
        metadata: { manualApprove: true, fulfillment: result.fulfillmentStatus },
      });
    }

    const errMsg =
      result.errors.length > 0 ? result.errors.join("; ") : "Could not allocate inventory for this order";

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          data: {
            fulfillmentStatus: result.fulfillmentStatus,
            deliveredItems: result.deliveredItems,
            errors: result.errors,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        fulfillmentStatus: result.fulfillmentStatus,
        deliveredItems: result.deliveredItems,
        errors: result.errors,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("order approve:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
