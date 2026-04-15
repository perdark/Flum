import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  products,
  productOptionGroups,
  productOptionValues,
  productVariants,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { variantReferencesGroupValues } from "@/lib/variantOptionRefs";

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
  console.error("option-groups/[groupId] error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, groupId } = await context.params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
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

    const [updated] = await db
      .update(productOptionGroups)
      .set({ name })
      .where(eq(productOptionGroups.id, groupId))
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "option_group_renamed", optionGroupId: groupId, name },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, groupId } = await context.params;

    const db = getDb();

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

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

    const values = await db
      .select({ id: productOptionValues.id, value: productOptionValues.value })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionGroupId, groupId));

    const variants = await db
      .select({ optionCombination: productVariants.optionCombination })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    for (const v of variants) {
      const combo = (v.optionCombination || {}) as Record<string, string>;
      if (variantReferencesGroupValues(combo, group.name, values)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot delete option group: one or more variants still reference its values. Remove or update those variants first.",
          },
          { status: 400 }
        );
      }
    }

    await db.delete(productOptionGroups).where(eq(productOptionGroups.id, groupId));

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "option_group_deleted", optionGroupId: groupId },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return handleError(error);
  }
}
