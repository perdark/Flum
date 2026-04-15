import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, storeSettings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, or, isNull } from "drizzle-orm";
import { canFulfillOrder } from "@/services/autoDelivery";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.VIEW_ORDERS);
    const db = getDb();

    const [settings] = await db
      .select({ minutes: storeSettings.autoApproveTimeoutMinutes })
      .from(storeSettings)
      .limit(1);

    const timeoutMinutes = settings?.minutes ?? 30;
    if (timeoutMinutes <= 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const pending = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerEmail: orders.customerEmail,
        customerName: orders.customerName,
        total: orders.total,
        currency: orders.currency,
        fulfillmentStatus: orders.fulfillmentStatus,
        createdAt: orders.createdAt,
        holdUntil: orders.holdUntil,
      })
      .from(orders)
      .where(
        and(
          sql`orders.deleted_at IS NULL`,
          eq(orders.fulfillmentStatus, "pending"),
          sql`${orders.createdAt} <= ${cutoff}`,
          or(isNull(orders.holdUntil), sql`${orders.holdUntil} <= NOW()`)!
        )
      )
      .orderBy(desc(orders.createdAt));

    const out = [];
    for (const o of pending) {
      const items = await db
        .select({
          productName: orderItems.productName,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id));

      const summary = items.map((i) => `${i.productName} ×${i.quantity}`).join(", ");
      const elapsedMs = Date.now() - new Date(o.createdAt).getTime();
      const canDeliverFromStock = await canFulfillOrder(o.id);
      out.push({
        ...o,
        itemsSummary: summary,
        elapsedMinutes: Math.floor(elapsedMs / 60000),
        canDeliverFromStock,
      });
    }

    return NextResponse.json({ success: true, data: out });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("pending-approval GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
