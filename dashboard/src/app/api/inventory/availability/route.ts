/**
 * Stock Availability API
 *
 * GET /api/inventory/availability - Check stock availability
 * Query params:
 *   - templateId: Check availability for a template
 *   - productId: Check availability for a product
 *   - quantity: Requested quantity to check
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { analyzeStockAvailability, canSellQuantity } from "@/services/stockValidation";
import { getDb } from "@/db";
import { inventoryItems, products } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const productId = searchParams.get("productId");
    const quantity = parseInt(searchParams.get("quantity") || "0");

    if (productId && quantity > 0) {
      // Check if specific quantity can be sold
      const result = await canSellQuantity(productId, quantity);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (templateId || productId) {
      const availability = await analyzeStockAvailability(
        productId || undefined,
        templateId || undefined
      );

      return NextResponse.json({
        success: true,
        data: availability || {
          templateId: templateId || null,
          productId: productId || null,
          fieldCounts: {},
          linkedGroups: {},
          sellableQuantity: 0,
          hasMismatch: false,
          mismatches: [],
        },
      });
    }

    // Get availability for all products with inventory templates
    const db = getDb();

    const productsWithTemplates = await db
      .select({
        id: products.id,
        name: products.name,
        templateId: products.inventoryTemplateId,
      })
      .from(products)
      .where(
        and(
          sql`${products.inventoryTemplateId} IS NOT NULL`,
          sql`${products.deletedAt} IS NULL`,
          eq(products.isActive, true)
        )
      );

    const availabilities = [];
    for (const product of productsWithTemplates) {
      const availability = await analyzeStockAvailability(product.id);
      if (availability) {
        availabilities.push({
          ...availability,
          productId: product.id,
          productName: product.name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: availabilities,
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

    console.error("Get availability error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
