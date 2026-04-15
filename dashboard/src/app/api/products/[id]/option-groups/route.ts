import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, productOptionGroups } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = { params: Promise<{ id: string }> };

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
  }
  console.error("option-groups POST error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id: productId } = await context.params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const [maxRow] = await db
      .select({ m: sql<number>`COALESCE(MAX(${productOptionGroups.sortOrder}), -1)` })
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, productId));

    const sortOrder = (maxRow?.m ?? -1) + 1;

    const [group] = await db
      .insert(productOptionGroups)
      .values({ productId, name, sortOrder })
      .returning();

    await logActivity({
      userId: user.id,
      action: "product_updated",
      entity: "product",
      entityId: productId,
      metadata: { action: "option_group_created", optionGroupId: group.id, name: group.name },
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
