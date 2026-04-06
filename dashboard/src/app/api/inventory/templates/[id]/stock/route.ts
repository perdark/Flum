import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import {
  mergeCatalogIntoValues,
  resolveCatalogInsertContext,
} from "@/lib/inventoryCatalog";
import { eq, and, sql, desc, asc, notInArray } from "drizzle-orm";

// GET /api/inventory/templates/[id]/stock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id: templateId } = await params;
    const { searchParams } = new URL(request.url);
    const fieldName = searchParams.get("field");
    const status = searchParams.get("status") || "available";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;
    const orderAsc = searchParams.get("order") === "asc";
    const excludeRaw = searchParams.get("excludeIds");
    const excludeIds = (excludeRaw || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[0-9a-f-]{36}$/i.test(s));
    const poolLimit = Math.min(
      8000,
      Math.max(1, parseInt(searchParams.get("poolLimit") || "3000", 10) || 3000)
    );
    const catalogItemIdParam = searchParams.get("catalogItemId");

    const db = getDb();

    const conditions = [
      eq(inventoryItems.templateId, templateId),
      sql`${inventoryItems.deletedAt} IS NULL`,
    ];
    if (catalogItemIdParam && /^[0-9a-f-]{36}$/i.test(catalogItemIdParam)) {
      conditions.push(eq(inventoryItems.catalogItemId, catalogItemIdParam));
    }

    if (status !== "all") {
      conditions.push(eq(inventoryItems.status, status));
    }
    if (excludeIds.length > 0) {
      conditions.push(notInArray(inventoryItems.id, excludeIds));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(whereClause);

    const hasFieldFilter = Boolean(fieldName);

    const items = await db
      .select({
        id: inventoryItems.id,
        values: inventoryItems.values,
        status: inventoryItems.status,
        cost: inventoryItems.cost,
        productId: inventoryItems.productId,
        multiSellEnabled: inventoryItems.multiSellEnabled,
        multiSellMax: inventoryItems.multiSellMax,
        multiSellSaleCount: inventoryItems.multiSellSaleCount,
        cooldownEnabled: inventoryItems.cooldownEnabled,
        cooldownUntil: inventoryItems.cooldownUntil,
        cooldownDurationHours: inventoryItems.cooldownDurationHours,
        createdAt: inventoryItems.createdAt,
        productName: products.name,
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(whereClause)
      .orderBy(orderAsc ? asc(inventoryItems.createdAt) : desc(inventoryItems.createdAt))
      .limit(hasFieldFilter ? poolLimit : limit)
      .offset(hasFieldFilter ? 0 : offset);

    const fieldMatch = (vals: Record<string, unknown>, name: string) => {
      const v = vals[name];
      if (v === undefined || v === null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.every((x) => x === null || x === "" || String(x).trim() === "")) return false;
      return true;
    };

    let filtered = hasFieldFilter
      ? items.filter((item) => fieldMatch(item.values as Record<string, unknown>, fieldName!))
      : items;

    let totalForPagination = countResult[0]?.count || 0;
    if (hasFieldFilter) {
      totalForPagination = filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: {
        page,
        limit,
        total: totalForPagination,
        totalPages: Math.ceil(totalForPagination / limit) || 1,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Get template stock error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/inventory/templates/[id]/stock — Add stock entries
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);
    const { id: templateId } = await params;
    const body = await request.json();
    const { items, cost, productId, catalogItemId } = body as {
      items: Array<Record<string, unknown>>;
      cost?: string | number | null;
      productId?: string | null;
      catalogItemId?: string | null;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items array is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const ctx = await resolveCatalogInsertContext(db, templateId, catalogItemId ?? null);
    if ("error" in ctx) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: 400 });
    }

    const inserted = await db
      .insert(inventoryItems)
      .values(
        items.map((vals) => {
          const base: Record<string, string | number | boolean> = {};
          for (const [k, v] of Object.entries(vals)) {
            if (k === "_metadata") continue;
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
              base[k] = v;
            }
          }
          const merged =
            ctx.catalogItemId && (ctx.definingValues || ctx.defaultValues)
              ? mergeCatalogIntoValues(base, ctx.definingValues, ctx.defaultValues)
              : base;
          const fullValues = {
            ...(vals as Record<string, unknown>),
            ...merged,
          } as Record<string, string | number | boolean>;
          return {
            templateId,
            catalogItemId: ctx.catalogItemId,
            productId: productId || null,
            values: fullValues,
            cost: cost ? String(cost) : null,
            status: "available" as const,
          };
        })
      )
      .returning();

    // If linked to a product, update stockCount
    if (productId) {
      await db
        .update(products)
        .set({
          stockCount: sql`${products.stockCount} + ${inserted.length}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    }

    return NextResponse.json({ success: true, data: { count: inserted.length, items: inserted } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("Add template stock error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
