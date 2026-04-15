import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, inArray, isNull } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** POST — set cost on many stock rows (same template + optional catalog scope via item ids only). */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId } = await params;
    const body = await request.json();
    const itemIds = body.itemIds as string[] | undefined;
    const cost = body.cost as string | null | undefined;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ success: false, error: "itemIds required" }, { status: 400 });
    }
    const validIds = itemIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
    if (validIds.length === 0) {
      return NextResponse.json({ success: false, error: "No valid item ids" }, { status: 400 });
    }

    const db = getDb();
    const costVal = cost === undefined || cost === null || String(cost).trim() === "" ? null : String(cost);

    const updated = await db
      .update(inventoryItems)
      .set({
        cost: costVal,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.templateId, templateId),
          inArray(inventoryItems.id, validIds),
          isNull(inventoryItems.deletedAt)
        )
      )
      .returning({ id: inventoryItems.id });

    return NextResponse.json({ success: true, data: { count: updated.length } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("bulk-cost:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
