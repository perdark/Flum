/**
 * Inventory Units API Routes
 *
 * GET /api/inventory/units?productId=xxx - List units with status
 * POST /api/inventory/units - Create new units for product
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryUnits, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq } from "drizzle-orm";

// GET /api/inventory/units - List inventory units
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const units = await db.query.inventoryUnits.findMany({
      where: eq(inventoryUnits.productId, productId),
      orderBy: (units, { desc }) => [desc(units.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error("Get inventory units error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/units - Create new inventory units
export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const { productId, unitCount, maxSales = 5, cooldownHours = 12 } = body;

    if (!productId || !unitCount) {
      return NextResponse.json(
        { success: false, error: "Product ID and unit count are required" },
        { status: 400 }
      );
    }

    if (unitCount < 1 || unitCount > 1000) {
      return NextResponse.json(
        { success: false, error: "Unit count must be between 1 and 1000" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Create inventory units
    const newUnits = Array.from({ length: unitCount }, (_, i) => ({
      productId,
      physicalUnitId: `${productId}-${Date.now()}-${i}`,
      maxSales,
      cooldownDurationHours: cooldownHours,
      status: "available" as const,
      saleCount: 0,
    }));

    const created = await db
      .insert(inventoryUnits)
      .values(newUnits)
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
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

    console.error("Create inventory units error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
