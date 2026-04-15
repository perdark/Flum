import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, storeSettings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id } = await context.params;
    const db = getDb();

    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, id), sql`orders.deleted_at IS NULL`))
      .limit(1);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const [settings] = await db
      .select({ minutes: storeSettings.autoApproveTimeoutMinutes })
      .from(storeSettings)
      .limit(1);

    const mins = settings?.minutes ?? 30;
    const holdUntil = new Date(Date.now() + Math.max(1, mins) * 60 * 1000);

    await db
      .update(orders)
      .set({ holdUntil, updatedAt: new Date() })
      .where(eq(orders.id, id));

    await logActivity({
      userId: user.id,
      action: "manual_sell",
      entity: "order",
      entityId: id,
      metadata: { orderHoldUntil: holdUntil.toISOString() },
    });

    return NextResponse.json({ success: true, data: { holdUntil } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("order hold:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
