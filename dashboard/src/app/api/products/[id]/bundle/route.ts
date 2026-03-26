/**
 * Bundle API Routes
 *
 * GET /api/products/[id]/bundle - Get bundle composition
 * POST /api/products/[id]/bundle/items - Add bundle item
 * PUT /api/products/[id]/bundle/items/[itemId] - Update bundle item
 * DELETE /api/products/[id]/bundle/items/[itemId] - Remove bundle item
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bundleItems, products, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq } from "drizzle-orm";

// GET /api/products/[id]/bundle - Get bundle composition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    // Verify product exists and is a bundle
    const product = await db.query.products.findFirst({
      where: eq(products.id, params.id),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const items = await db.query.bundleItems.findMany({
      where: eq(bundleItems.bundleProductId, params.id),
      with: {
        product: true,
      },
      orderBy: (items, { asc }) => [
        asc(items.templateFieldId),
        asc(items.lineIndex),
      ],
    });

    // Group by template field
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.templateFieldId]) {
        grouped[item.templateFieldId] = [];
      }
      grouped[item.templateFieldId].push(item);
    }

    return NextResponse.json({
      success: true,
      data: {
        isBundle: product.isBundle,
        bundleTemplateId: product.bundleTemplateId,
        items,
        grouped,
      },
    });
  } catch (error) {
    console.error("Get bundle error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/bundle - Add bundle items in batch
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const body = await request.json();
    const { items, clearExisting = false } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items array is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, params.id),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Clear existing items if requested
    if (clearExisting) {
      await db
        .delete(bundleItems)
        .where(eq(bundleItems.bundleProductId, params.id));
    }

    // Add new items
    const newItems = await db
      .insert(bundleItems)
      .values(
        items.map((item: any) => ({
          bundleProductId: params.id,
          templateFieldId: item.templateFieldId,
          lineIndex: item.lineIndex || 0,
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity || 1,
          priceOverride: item.priceOverride || null,
          metadata: item.metadata || {},
        }))
      )
      .returning();

    // Update product as bundle
    await db
      .update(products)
      .set({ isBundle: true })
      .where(eq(products.id, params.id));

    return NextResponse.json({
      success: true,
      data: newItems,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Add bundle items error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]/bundle - Clear all bundle items
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const db = getDb();

    await db
      .delete(bundleItems)
      .where(eq(bundleItems.bundleProductId, params.id));

    // Update product as not bundle
    await db
      .update(products)
      .set({ isBundle: false, bundleTemplateId: null })
      .where(eq(products.id, params.id));

    return NextResponse.json({
      success: true,
      data: { message: "Bundle items cleared successfully" },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Clear bundle error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
