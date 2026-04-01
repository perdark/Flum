import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { productRelations, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;
    const db = getDb();

    const rows = await db
      .select({
        id: productRelations.id,
        relatedProductId: productRelations.relatedProductId,
        relationType: productRelations.relationType,
        score: productRelations.score,
        relatedName: products.name,
        relatedSlug: products.slug,
      })
      .from(productRelations)
      .innerJoin(products, eq(productRelations.relatedProductId, products.id))
      .where(
        and(eq(productRelations.productId, id), sql`${products.deletedAt} IS NULL`)
      );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { relatedProductId, relationType = "related", score = 0 } = body;

    if (!relatedProductId || relatedProductId === id) {
      return NextResponse.json(
        { success: false, error: "relatedProductId required and must differ from product id" },
        { status: 400 }
      );
    }

    const db = getDb();

    const rt = String(relationType);
    const dup = await db
      .select({ id: productRelations.id })
      .from(productRelations)
      .where(
        and(
          eq(productRelations.productId, id),
          eq(productRelations.relatedProductId, relatedProductId),
          eq(productRelations.relationType, rt)
        )
      )
      .limit(1);

    if (dup.length > 0) {
      return NextResponse.json(
        { success: false, error: "This relation already exists" },
        { status: 409 }
      );
    }

    const [inserted] = await db
      .insert(productRelations)
      .values({
        productId: id,
        relatedProductId,
        relationType: rt,
        score: Number(score) || 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const relationId = searchParams.get("relationId");

    if (!relationId) {
      return NextResponse.json({ success: false, error: "relationId required" }, { status: 400 });
    }

    const db = getDb();
    await db
      .delete(productRelations)
      .where(and(eq(productRelations.id, relationId), eq(productRelations.productId, id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
