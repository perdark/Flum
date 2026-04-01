/**
 * Recalculate Stock Counts API
 *
 * POST /api/admin/recalculate-stock - Recalculate stockCount from actual inventory items
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

    const db = getDb();

    // Get all products
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stockCount: products.stockCount,
      })
      .from(products)
      .where(sql`${products.deletedAt} IS NULL`);

    const results: Array<{
      productId: string;
      productName: string;
      oldStockCount: number;
      newStockCount: number;
      difference: number;
    }> = [];

    const countAvailableForProduct = async (productId: string): Promise<number> => {
      const r = await db.execute(sql`
        SELECT COUNT(*)::int AS n
        FROM inventory_items
        WHERE status = 'available'
          AND deleted_at IS NULL
          AND product_id = ${productId}
      `);
      const row = r.rows[0] as { n: number } | undefined;
      return row?.n ?? 0;
    };

    // Recalculate stock count for each product
    await db.transaction(async (tx) => {
      for (const product of allProducts) {
        const actualCount = await countAvailableForProduct(product.id);
        const oldCount = product.stockCount || 0;

        if (actualCount !== oldCount) {
          await tx
            .update(products)
            .set({
              stockCount: actualCount,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));

          results.push({
            productId: product.id,
            productName: product.name,
            oldStockCount: oldCount,
            newStockCount: actualCount,
            difference: actualCount - oldCount,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProductsChecked: allProducts.length,
        productsUpdated: results.length,
        updates: results,
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

    console.error("Recalculate stock error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
