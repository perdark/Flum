/**
 * GET/POST /api/inventory/templates/[id]/catalog-items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryCatalogItems, inventoryItems, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id: templateId } = await params;
    const db = getDb();

    const [tpl] = await db
      .select({ id: inventoryTemplates.id })
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, templateId), isNull(inventoryTemplates.deletedAt)))
      .limit(1);
    if (!tpl) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        id: inventoryCatalogItems.id,
        templateId: inventoryCatalogItems.templateId,
        name: inventoryCatalogItems.name,
        slug: inventoryCatalogItems.slug,
        description: inventoryCatalogItems.description,
        definingValues: inventoryCatalogItems.definingValues,
        defaultValues: inventoryCatalogItems.defaultValues,
        isActive: inventoryCatalogItems.isActive,
        sortOrder: inventoryCatalogItems.sortOrder,
        createdAt: inventoryCatalogItems.createdAt,
        updatedAt: inventoryCatalogItems.updatedAt,
      })
      .from(inventoryCatalogItems)
      .where(
        and(eq(inventoryCatalogItems.templateId, templateId), isNull(inventoryCatalogItems.deletedAt))
      )
      .orderBy(inventoryCatalogItems.sortOrder, inventoryCatalogItems.name);

    const ids = rows.map((r) => r.id);
    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const agg = await db
        .select({
          catalogItemId: inventoryItems.catalogItemId,
          c: sql<number>`count(*)::int`,
        })
        .from(inventoryItems)
        .where(
          and(
            inArray(inventoryItems.catalogItemId, ids),
            eq(inventoryItems.status, "available"),
            isNull(inventoryItems.deletedAt)
          )
        )
        .groupBy(inventoryItems.catalogItemId);
      for (const a of agg) {
        if (a.catalogItemId) countMap.set(a.catalogItemId, a.c);
      }
    }

    const data = rows.map((r) => ({ ...r, availableCount: countMap.get(r.id) ?? 0 }));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("catalog-items GET:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId } = await params;
    const body = (await request.json()) as {
      name?: string;
      slug?: string | null;
      description?: string | null;
      definingValues?: Record<string, string | number | boolean> | null;
      defaultValues?: Record<string, string | number | boolean> | null;
      isActive?: boolean;
      sortOrder?: number;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const [tpl] = await db
      .select({ id: inventoryTemplates.id })
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, templateId), isNull(inventoryTemplates.deletedAt)))
      .limit(1);
    if (!tpl) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const [inserted] = await db
      .insert(inventoryCatalogItems)
      .values({
        templateId,
        name: body.name.trim(),
        slug: body.slug?.trim() || null,
        description: body.description?.trim() || null,
        definingValues: body.definingValues ?? undefined,
        defaultValues: body.defaultValues ?? undefined,
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const msg = e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
    if (msg) {
      return NextResponse.json(
        { success: false, error: "A catalog item with this name already exists for this template" },
        { status: 409 }
      );
    }
    console.error("catalog-items POST:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
