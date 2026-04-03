import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, inArray } from "drizzle-orm";

/**
 * POST /api/inventory/release-reservations
 * Clear manual-sell holds (reserved + reserved_by = current user).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const body = await request.json();
    const raw = body?.inventoryIds;
    const ids = Array.isArray(raw)
      ? raw.filter((s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s))
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: { released: 0 } });
    }

    const db = getDb();
    const result = await db
      .update(inventoryItems)
      .set({
        status: "available",
        reservedUntil: null,
        reservedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(inventoryItems.id, ids),
          eq(inventoryItems.reservedBy, user.id),
          eq(inventoryItems.status, "reserved")
        )
      )
      .returning({ id: inventoryItems.id });

    return NextResponse.json({
      success: true,
      data: { released: result.length },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("release-reservations error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
