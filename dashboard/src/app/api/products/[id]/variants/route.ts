/**
 * Product Variants API Routes
 *
 * GET    /api/products/[id]/variants        - List all variants for a product
 * POST   /api/products/[id]/variants        - Create a new variant
 * PUT    /api/products/[id]/variants        - Update a variant (pass variantId in body)
 * DELETE /api/products/[id]/variants?variantId=xxx - Delete a variant
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productVariants, inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/products/[id]/variants - List variants
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;
    const db = getDb();

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(productVariants.createdAt);

    return NextResponse.json({ success: true, data: variants });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Get variants error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/products/[id]/variants - Create variant
// ============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { optionCombination, price, compareAtPrice, sku, isActive = true } = body;

    if (!price) {
      return NextResponse.json(
        { success: false, error: "Price is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Create variant error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/products/[id]/variants - Update variant
// ============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { variantId, price, compareAtPrice, sku, isActive, optionCombination } = body;

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: "variantId is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify variant belongs to this product
    const [existing] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Variant not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (price !== undefined) updateData.price = price.toString();
    if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice ? compareAtPrice.toString() : null;
    if (sku !== undefined) updateData.sku = sku?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (optionCombination !== undefined) updateData.optionCombination = optionCombination;

    const [updated] = await db
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, variantId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Update variant error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// DELETE /api/products/[id]/variants?variantId=xxx - Delete variant
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: "variantId query param is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify variant belongs to this product
    const [existing] = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Variant not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting the default variant
    if (existing.isDefault) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the default variant. Update it instead." },
        { status: 400 }
      );
    }

    // Check if any inventory is linked to this variant
    const [invCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.variantId, variantId),
        sql`${inventoryItems.deletedAt} IS NULL`
      ));

    if (invCount.count > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete variant with ${invCount.count} linked inventory items. Reassign or remove them first.` },
        { status: 400 }
      );
    }

    await db.delete(productVariants).where(eq(productVariants.id, variantId));

    return NextResponse.json({ success: true, data: { message: "Variant deleted" } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Delete variant error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
