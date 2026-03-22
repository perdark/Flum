/**
 * Products Search API
 *
 * GET /api/products/search - Search products by name/sku (for dropdowns/selectors)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, or, like, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q");
    const excludeId = searchParams.get("excludeId");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!search) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const db = getDb();

    const conditions = [
      sql`products.deleted_at IS NULL`,
      or(
        like(products.name, `%${search}%`),
        like(products.nameAr || "", `%${search}%`),
        like(products.sku || "", `%${search}%`)
      )!,
    ];

    // Exclude current product when searching for relations
    if (excludeId) {
      conditions.push(sql`products.id != ${excludeId}`);
    }

    const results = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        basePrice: products.basePrice,
        isActive: products.isActive,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(products.name)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: results,
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

    console.error("Products search error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
