import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { productOptionGroups, productOptionValues } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = { params: Promise<{ id: string; groupId: string }> };

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("option-group values POST error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, groupId } = await context.params;
    const body = await request.json();
    const rawLabel = body.label ?? body.value;
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (!label) {
      return NextResponse.json(
        { success: false, error: "label (or value) is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [group] = await db
      .select()
      .from(productOptionGroups)
      .where(
        and(eq(productOptionGroups.id, groupId), eq(productOptionGroups.productId, productId))
      )
      .limit(1);

    if (!group) {
      return NextResponse.json({ success: false, error: "Option group not found" }, { status: 404 });
    }

    const [maxRow] = await db
      .select({ m: sql<number>`COALESCE(MAX(${productOptionValues.sortOrder}), -1)` })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionGroupId, groupId));

    const sortOrder = (maxRow?.m ?? -1) + 1;

    const [row] = await db
      .insert(productOptionValues)
      .values({ optionGroupId: groupId, value: label, sortOrder })
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "option_value_created", optionGroupId: groupId, valueId: row.id },
    });

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
