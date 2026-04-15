/**
 * Product Variants API Routes
 *
 * GET    /api/products/[id]/variants — Product + option groups/values + variants (stock per variant)
 * POST   /api/products/[id]/variants — Create a single variant (advanced)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  products,
  productVariants,
  productOptionGroups,
  productOptionValues,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("Variants route error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;
    const db = getDb();

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        basePrice: products.basePrice,
        deliveryType: products.deliveryType,
      })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, id))
      .orderBy(productOptionGroups.sortOrder);

    const groupIds = groups.map((g) => g.id);
    let values: (typeof productOptionValues.$inferSelect)[] = [];
    if (groupIds.length > 0) {
      values = await db
        .select()
        .from(productOptionValues)
        .where(inArray(productOptionValues.optionGroupId, groupIds))
        .orderBy(productOptionValues.sortOrder);
    }

    const optionGroups = groups.map((g) => ({
      ...g,
      values: values.filter((v) => v.optionGroupId === g.id),
    }));

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(productVariants.createdAt);

    const variantsWithStock = variants.map((v) => ({
      ...v,
      stockCount: v.stockCount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        product,
        optionGroups,
        variants: variantsWithStock,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { optionCombination, price, compareAtPrice, sku, isActive = true } = body;

    if (!price) {
      return NextResponse.json({ success: false, error: "Price is required" }, { status: 400 });
    }

    const db = getDb();

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: id,
        optionCombination: optionCombination || {},
        price: price.toString(),
        compareAtPrice: compareAtPrice ? compareAtPrice.toString() : null,
        sku: sku?.trim() || null,
        isDefault: false,
        isActive,
      })
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: id,
      metadata: { action: "variant_created", variantId: variant.id },
    });

    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
