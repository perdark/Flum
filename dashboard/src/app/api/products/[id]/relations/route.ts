/**
 * Product Relations API Routes
 *
 * GET /api/products/[id]/relations - Get product relations (related products)
 * POST /api/products/[id]/relations - Add product relation
 * DELETE /api/products/[id]/relations/[relationId] - Remove product relation
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { productRelations, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/products/[id]/relations - Get product relations
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;

    const db = getDb();

    const relations = await db
      .select({
        id: productRelations.id,
        relationType: productRelations.relationType,
        score: productRelations.score,
        relatedProductId: productRelations.relatedProductId,
        relatedProductName: products.name,
        relatedProductSlug: products.slug,
        relatedProductActive: products.isActive,
      })
      .from(productRelations)
      .innerJoin(products, eq(productRelations.relatedProductId, products.id))
      .where(eq(productRelations.productId, id))
      .orderBy(productRelations.createdAt);

    return NextResponse.json({
      success: true,
      data: relations,
    });
  } catch (error) {
    console.error("Get product relations error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/products/[id]/relations - Add product relation
// ============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    const body = await request.json();
    const { relatedProductId, relationType = "cross_sell", score = 0 } = body;

    // Validate input
    if (!relatedProductId) {
      return NextResponse.json(
        { success: false, error: "Related product ID is required" },
        { status: 400 }
      );
    }

    if (relatedProductId === id) {
      return NextResponse.json(
        { success: false, error: "Cannot relate product to itself" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if related product exists
    const [relatedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, relatedProductId))
      .limit(1);

    if (!relatedProduct) {
      return NextResponse.json(
        { success: false, error: "Related product not found" },
        { status: 404 }
      );
    }

    // Check for duplicate relation
    const [existing] = await db
      .select()
      .from(productRelations)
      .where(
        and(
          eq(productRelations.productId, id),
          eq(productRelations.relatedProductId, relatedProductId),
          eq(productRelations.relationType, relationType)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This relation already exists" },
        { status: 409 }
      );
    }

    // Create relation
    const [newRelation] = await db
      .insert(productRelations)
      .values({
        productId: id,
        relatedProductId,
        relationType,
        score,
      })
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product_relation",
      entityId: id,
      metadata: {
        relatedProductId,
        relationType,
        action: "added_relation",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newRelation,
        relatedProductName: relatedProduct.name,
        relatedProductSlug: relatedProduct.slug,
      },
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

    console.error("Create product relation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/products/[id]/relations/[relationId] - Remove product relation
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;

    // Extract relationId from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const relationId = pathParts[pathParts.length - 1];

    const db = getDb();

    // Delete relation
    await db
      .delete(productRelations)
      .where(eq(productRelations.id, relationId));

    return NextResponse.json({
      success: true,
      data: { id: relationId },
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

    console.error("Delete product relation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
