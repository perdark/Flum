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
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { canonicalComboKey } from "@/lib/variantOptionRefs";

type RouteContext = { params: Promise<{ id: string }> };

function cartesianCombos(
  axes: Array<Array<{ groupId: string; valueId: string }>>
): Record<string, string>[] {
  let result: Record<string, string>[] = [{}];
  for (const axis of axes) {
    const next: Record<string, string>[] = [];
    for (const ex of result) {
      for (const pick of axis) {
        next.push({ ...ex, [pick.groupId]: pick.valueId });
      }
    }
    result = next;
  }
  return result;
}

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("variants/generate error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const basePrice = body.basePrice != null ? String(body.basePrice) : undefined;

    const db = getDb();

    const [product] = await db
      .select({ id: products.id, basePrice: products.basePrice })
      .from(products)
      .where(and(eq(products.id, productId), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const groups = await db
      .select({ id: productOptionGroups.id, name: productOptionGroups.name })
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, productId))
      .orderBy(productOptionGroups.sortOrder);

    if (groups.length === 0) {
      return NextResponse.json(
        { success: false, error: "No option groups defined. Add option groups first." },
        { status: 400 }
      );
    }

    const groupIds = groups.map((g) => g.id);
    const allValues = await db
      .select({
        id: productOptionValues.id,
        optionGroupId: productOptionValues.optionGroupId,
        value: productOptionValues.value,
      })
      .from(productOptionValues)
      .where(inArray(productOptionValues.optionGroupId, groupIds))
      .orderBy(productOptionValues.sortOrder);

    const axes = groups.map((g) => {
      const vals = allValues.filter((v) => v.optionGroupId === g.id);
      return vals.map((v) => ({ groupId: g.id, valueId: v.id }));
    });

    if (axes.some((a) => a.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Each option group must have at least one value before generating variants." },
        { status: 400 }
      );
    }

    const combinations = cartesianCombos(axes);

    const existingVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    const existingKeys = new Set(
      existingVariants
        .filter(
          (v) =>
            !v.isDefault ||
            Object.keys((v.optionCombination || {}) as Record<string, string>).length > 0
        )
        .map((v) =>
          canonicalComboKey(
            (v.optionCombination || {}) as Record<string, string>,
            groups,
            allValues
          )
        )
    );

    const price = basePrice ?? product.basePrice;
    const newCombos = combinations.filter(
      (combo) => !existingKeys.has(canonicalComboKey(combo, groups, allValues))
    );

    const defaultVariant = existingVariants.find(
      (v) => v.isDefault && Object.keys((v.optionCombination || {}) as object).length === 0
    );
    const willRemoveDefaultId =
      defaultVariant && newCombos.length > 0 ? defaultVariant.id : null;
    const remainingDefaults = existingVariants.filter(
      (v) => v.isDefault && v.id !== willRemoveDefaultId
    );
    const firstNewIsDefault = newCombos.length > 0 && remainingDefaults.length === 0;

    const result = await db.transaction(async (tx) => {
      if (defaultVariant && newCombos.length > 0) {
        await tx.delete(productVariants).where(eq(productVariants.id, defaultVariant.id));
      }

      if (newCombos.length > 0) {
        await tx.insert(productVariants).values(
          newCombos.map((combo, idx) => ({
            productId,
            optionCombination: combo,
            price,
            isDefault: idx === 0 && firstNewIsDefault,
            isActive: true,
          }))
        );
      }

      return tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(productVariants.createdAt);
    });

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "variants_generated", created: newCombos.length },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
