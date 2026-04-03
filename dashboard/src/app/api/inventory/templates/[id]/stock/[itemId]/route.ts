import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";

// PUT — Update stock entry values
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId, itemId } = await params;
    const body = await request.json();
    const { values, cost, status } = body;

    const db = getDb();
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (values !== undefined) updateData.values = values;
    if (cost !== undefined) updateData.cost = cost;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.templateId, templateId),
        sql`${inventoryItems.deletedAt} IS NULL`
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Stock entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Update stock error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — Soft-delete stock entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId, itemId } = await params;

    const db = getDb();
    const [deleted] = await db
      .update(inventoryItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(inventoryItems.id, itemId),
        eq(inventoryItems.templateId, templateId),
        sql`${inventoryItems.deletedAt} IS NULL`
      ))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Stock entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: itemId } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Delete stock error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
