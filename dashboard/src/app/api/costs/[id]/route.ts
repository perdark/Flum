import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { costEntries } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

const ENTRY_TYPES = new Set(["cost", "debt", "payment"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id } = await params;
    const body = await request.json();

    const db = getDb();

    const [existing] = await db
      .select()
      .from(costEntries)
      .where(and(eq(costEntries.id, id), sql`${costEntries.deletedAt} IS NULL`))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    const {
      type,
      description,
      amount,
      templateId,
      productId,
      creditorName,
      dueDate,
      isPaid,
      paidAt,
      paidAmount,
      relatedDebtId,
    } = body as {
      type?: string;
      description?: string;
      amount?: string | number;
      templateId?: string | null;
      productId?: string | null;
      creditorName?: string | null;
      dueDate?: string | null;
      isPaid?: boolean;
      paidAt?: string | null;
      paidAmount?: string | number | null;
      relatedDebtId?: string | null;
    };

    const nextType = type !== undefined ? type : existing.type;
    if (!ENTRY_TYPES.has(nextType)) {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }

    if (relatedDebtId !== undefined) {
      if (relatedDebtId && nextType !== "payment") {
        return NextResponse.json(
          { success: false, error: "relatedDebtId only allowed for payments" },
          { status: 400 }
        );
      }
      if (relatedDebtId) {
        const [debt] = await db
          .select({ id: costEntries.id, type: costEntries.type })
          .from(costEntries)
          .where(and(eq(costEntries.id, relatedDebtId), sql`${costEntries.deletedAt} IS NULL`))
          .limit(1);
        if (!debt || debt.type !== "debt") {
          return NextResponse.json({ success: false, error: "Related debt not found" }, { status: 400 });
        }
      }
    }

    const updateData: {
      type?: string;
      description?: string;
      amount?: string;
      templateId?: string | null;
      productId?: string | null;
      creditorName?: string | null;
      dueDate?: Date | null;
      relatedDebtId?: string | null;
      isPaid?: boolean;
      paidAt?: Date | null;
      paidAmount?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = String(amount);
    if (templateId !== undefined) updateData.templateId = templateId || null;
    if (productId !== undefined) updateData.productId = productId || null;
    if (creditorName !== undefined) updateData.creditorName = creditorName?.trim() || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (relatedDebtId !== undefined) updateData.relatedDebtId = relatedDebtId || null;
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount != null ? String(paidAmount) : null;
    }

    const resolvedType = (updateData.type ?? existing.type) as string;
    if (resolvedType === "debt" || resolvedType === "payment") {
      updateData.templateId = null;
      updateData.productId = null;
    }

    const [updated] = await db
      .update(costEntries)
      .set(updateData)
      .where(eq(costEntries.id, id))
      .returning();

    await logActivity({
      userId: user.id,
      action: "cost_entry_updated",
      entity: "cost_entry",
      entityId: id,
      metadata: { updates: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("PUT /api/costs/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id } = await params;

    const db = getDb();

    const [existing] = await db
      .select()
      .from(costEntries)
      .where(and(eq(costEntries.id, id), sql`${costEntries.deletedAt} IS NULL`))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    await db
      .update(costEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(costEntries.id, id));

    await logActivity({
      userId: user.id,
      action: "cost_entry_updated",
      entity: "cost_entry",
      entityId: id,
      metadata: { softDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("DELETE /api/costs/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
