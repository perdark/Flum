import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productVariants, inventoryItems, orderItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = { params: Promise<{ id: string; variantId: string }> };

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("variants/[variantId] error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, variantId } = await context.params;
    const body = await request.json();

    const db = getDb();

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.sku !== undefined) updateData.sku = typeof body.sku === "string" ? body.sku.trim() || null : null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const [updated] = await db
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, variantId))
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "variant_updated", variantId },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId, variantId } = await context.params;

    const db = getDb();

    const [existing] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { success: false, error: "Cannot remove the default variant. Deactivate other variants or assign a new default first." },
        { status: 400 }
      );
    }

    const [invRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(
        and(eq(inventoryItems.variantId, variantId), sql`${inventoryItems.deletedAt} IS NULL`)
      );

    const [ordRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.variantId, variantId));

    const invCount = invRow?.count ?? 0;
    const ordCount = ordRow?.count ?? 0;

    if (invCount > 0 || ordCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot deactivate or remove this variant: it is referenced by ${invCount} inventory row(s) and ${ordCount} order line(s). Hard deletion is not allowed; reassign stock and archive orders first.`,
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(productVariants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId))
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "variant_soft_deleted", variantId },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
}
