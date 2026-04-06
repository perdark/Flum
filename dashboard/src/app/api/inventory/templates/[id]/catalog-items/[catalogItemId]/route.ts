/**
 * PUT/DELETE /api/inventory/templates/[id]/catalog-items/[catalogItemId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryCatalogItems, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, isNull } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catalogItemId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId, catalogItemId } = await params;
    const body = (await request.json()) as {
      name?: string;
      slug?: string | null;
      description?: string | null;
      definingValues?: Record<string, string | number | boolean> | null;
      defaultValues?: Record<string, string | number | boolean> | null;
      isActive?: boolean;
      sortOrder?: number;
    };

    const db = getDb();
    const [existing] = await db
      .select({ id: inventoryCatalogItems.id })
      .from(inventoryCatalogItems)
      .where(
        and(
          eq(inventoryCatalogItems.id, catalogItemId),
          eq(inventoryCatalogItems.templateId, templateId),
          isNull(inventoryCatalogItems.deletedAt)
        )
      )
      .limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Catalog item not found" }, { status: 404 });
    }

    const [tpl] = await db
      .select({ id: inventoryTemplates.id })
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, templateId), isNull(inventoryTemplates.deletedAt)))
      .limit(1);
    if (!tpl) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const patch: {
      updatedAt: Date;
      name?: string;
      slug?: string | null;
      description?: string | null;
      definingValues?: Record<string, string | number | boolean> | null;
      defaultValues?: Record<string, string | number | boolean> | null;
      isActive?: boolean;
      sortOrder?: number;
    } = { updatedAt: new Date() };
    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        return NextResponse.json({ success: false, error: "name cannot be empty" }, { status: 400 });
      }
      patch.name = String(body.name).trim();
    }
    if (body.slug !== undefined) patch.slug = body.slug?.trim() || null;
    if (body.description !== undefined) patch.description = body.description?.trim() || null;
    if (body.definingValues !== undefined) patch.definingValues = body.definingValues;
    if (body.defaultValues !== undefined) patch.defaultValues = body.defaultValues;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(inventoryCatalogItems)
      .set(patch)
      .where(eq(inventoryCatalogItems.id, catalogItemId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const dup =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
    if (dup) {
      return NextResponse.json(
        { success: false, error: "A catalog item with this name already exists for this template" },
        { status: 409 }
      );
    }
    console.error("catalog-items PUT:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; catalogItemId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId, catalogItemId } = await params;
    const db = getDb();

    const [existing] = await db
      .select({ id: inventoryCatalogItems.id })
      .from(inventoryCatalogItems)
      .where(
        and(
          eq(inventoryCatalogItems.id, catalogItemId),
          eq(inventoryCatalogItems.templateId, templateId),
          isNull(inventoryCatalogItems.deletedAt)
        )
      )
      .limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Catalog item not found" }, { status: 404 });
    }

    await db
      .update(inventoryCatalogItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(inventoryCatalogItems.id, catalogItemId));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("catalog-items DELETE:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
