import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { costEntries, inventoryTemplates, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, desc, eq, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

const ENTRY_TYPES = new Set(["cost", "debt", "payment"]);

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isPaid = searchParams.get("isPaid");
    const templateId = searchParams.get("templateId");

    const db = getDb();

    const conditions = [sql`${costEntries.deletedAt} IS NULL`];
    if (type && type !== "all" && ENTRY_TYPES.has(type)) {
      conditions.push(eq(costEntries.type, type));
    }
    if (isPaid === "true" || isPaid === "false") {
      conditions.push(eq(costEntries.isPaid, isPaid === "true"));
    }
    if (templateId) {
      conditions.push(eq(costEntries.templateId, templateId));
    }

    const [summaryRow] = await db
      .select({
        totalCosts: sql<string>`COALESCE(SUM(CASE WHEN ${costEntries.type} = 'cost' THEN ${costEntries.amount}::numeric ELSE 0 END), 0)::text`,
        outstandingDebts: sql<string>`COALESCE(SUM(CASE WHEN ${costEntries.type} = 'debt' AND ${costEntries.isPaid} = false THEN ${costEntries.amount}::numeric ELSE 0 END), 0)::text`,
        paymentSum: sql<string>`COALESCE(SUM(CASE WHEN ${costEntries.type} = 'payment' THEN ${costEntries.amount}::numeric ELSE 0 END), 0)::text`,
        paidDebtsSum: sql<string>`COALESCE(SUM(CASE WHEN ${costEntries.type} = 'debt' AND ${costEntries.isPaid} = true THEN COALESCE(${costEntries.paidAmount}, ${costEntries.amount})::numeric ELSE 0 END), 0)::text`,
      })
      .from(costEntries)
      .where(sql`${costEntries.deletedAt} IS NULL`);

    const totalPaidNum =
      parseFloat(summaryRow?.paymentSum || "0") + parseFloat(summaryRow?.paidDebtsSum || "0");

    const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions);

    const rows = await db
      .select({
        id: costEntries.id,
        type: costEntries.type,
        description: costEntries.description,
        amount: costEntries.amount,
        templateId: costEntries.templateId,
        productId: costEntries.productId,
        creditorName: costEntries.creditorName,
        dueDate: costEntries.dueDate,
        isPaid: costEntries.isPaid,
        paidAt: costEntries.paidAt,
        paidAmount: costEntries.paidAmount,
        relatedDebtId: costEntries.relatedDebtId,
        createdBy: costEntries.createdBy,
        createdAt: costEntries.createdAt,
        updatedAt: costEntries.updatedAt,
        templateName: inventoryTemplates.name,
        productName: products.name,
      })
      .from(costEntries)
      .leftJoin(inventoryTemplates, eq(costEntries.templateId, inventoryTemplates.id))
      .leftJoin(products, eq(costEntries.productId, products.id))
      .where(whereClause)
      .orderBy(desc(costEntries.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        entries: rows,
        summary: {
          totalCosts: summaryRow?.totalCosts ?? "0",
          outstandingDebts: summaryRow?.outstandingDebts ?? "0",
          totalPaid: totalPaidNum.toFixed(2),
        },
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("GET /api/costs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const body = await request.json();
    const {
      type,
      description,
      amount,
      templateId,
      productId,
      creditorName,
      dueDate,
      relatedDebtId,
    } = body as {
      type?: string;
      description?: string;
      amount?: string | number;
      templateId?: string | null;
      productId?: string | null;
      creditorName?: string | null;
      dueDate?: string | null;
      relatedDebtId?: string | null;
    };

    if (!type || !ENTRY_TYPES.has(type)) {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: "Description is required" }, { status: 400 });
    }
    const amt = amount !== undefined && amount !== "" ? String(amount) : "";
    if (!amt || Number.isNaN(parseFloat(amt))) {
      return NextResponse.json({ success: false, error: "Valid amount is required" }, { status: 400 });
    }

    const db = getDb();

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

    const linkInventory = type === "cost";
    const [inserted] = await db
      .insert(costEntries)
      .values({
        type,
        description: description.trim(),
        amount: amt,
        templateId: linkInventory && templateId ? templateId : null,
        productId: linkInventory && productId ? productId : null,
        creditorName: type === "debt" && creditorName?.trim() ? creditorName.trim() : null,
        dueDate: type === "debt" && dueDate ? new Date(dueDate) : null,
        relatedDebtId: type === "payment" && relatedDebtId ? relatedDebtId : null,
        isPaid: false,
        createdBy: user.id,
      })
      .returning();

    await logActivity({
      userId: user.id,
      action: "cost_entry_created",
      entity: "cost_entry",
      entityId: inserted.id,
      metadata: { type, amount: amt },
    });

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("POST /api/costs error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
