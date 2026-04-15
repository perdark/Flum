import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { productOptionGroups, productOptionValues, productVariants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { variantReferencesValue } from "@/lib/variantOptionRefs";

type RouteContext = { params: Promise<{ id: string; groupId: string; valueId: string }> };

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("option value DELETE error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, groupId, valueId } = await context.params;

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

    const [val] = await db
      .select()
      .from(productOptionValues)
      .where(
        and(
          eq(productOptionValues.id, valueId),
          eq(productOptionValues.optionGroupId, groupId)
        )
      )
      .limit(1);

    if (!val) {
      return NextResponse.json({ success: false, error: "Option value not found" }, { status: 404 });
    }

    const variants = await db
      .select({ optionCombination: productVariants.optionCombination })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    for (const v of variants) {
      const combo = (v.optionCombination || {}) as Record<string, string>;
      if (variantReferencesValue(combo, val.id, val.value)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot delete option value: one or more variants still reference it. Remove or update those variants first.",
          },
          { status: 400 }
        );
      }
    }

    await db.delete(productOptionValues).where(eq(productOptionValues.id, valueId));

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "option_value_deleted", optionGroupId: groupId, valueId },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return handleError(error);
  }
}
