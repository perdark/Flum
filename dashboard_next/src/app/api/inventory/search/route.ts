/**
 * Global Inventory Search API - Emergency search across all products
 *
 * GET /api/inventory/search - Search inventory by values across all products
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, products, inventoryTemplates, inventoryBatches, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, or, like, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Build conditions - search in JSONB values
    const conditions = [
      sql`inventory_items.deleted_at IS NULL`,
      sql`products.deleted_at IS NULL`,
      // Cast JSONB to text for ILIKE search
      sql`inventory_items.values::text ILIKE ${`%${query.trim()}%`}`,
    ];

    if (status) {
      conditions.push(eq(inventoryItems.status, status as "available" | "reserved" | "sold" | "expired"));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get matching inventory items
    const inventory = await db
      .select({
        id: inventoryItems.id,
        values: inventoryItems.values,
        status: inventoryItems.status,
        createdAt: inventoryItems.createdAt,
        purchasedAt: inventoryItems.purchasedAt,
        productId: inventoryItems.productId,
        productName: products.name,
        productSlug: products.slug,
        templateName: inventoryTemplates.name,
        batchName: inventoryBatches.name,
      })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(inventoryTemplates, eq(inventoryItems.templateId, inventoryTemplates.id))
      .leftJoin(inventoryBatches, eq(inventoryItems.batchId, inventoryBatches.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryItems.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: inventory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    console.error("Inventory search error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
