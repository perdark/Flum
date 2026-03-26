/**
 * Inventory Unit Cooldown API Routes
 *
 * GET /api/inventory/units/[id]/cooldown - Get cooldown status
 * POST /api/inventory/units/[id]/cooldown/reset - Admin reset cooldown
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryUnits } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq } from "drizzle-orm";

// GET /api/inventory/units/[id]/cooldown - Get cooldown status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const unit = await db.query.inventoryUnits.findFirst({
      where: eq(inventoryUnits.id, params.id),
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "Unit not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const isInCooldown =
      unit.cooldownUntil && new Date(unit.cooldownUntil) > now;
    const remainingSales = (unit.maxSales || 5) - (unit.saleCount || 0);

    let cooldownDisplay = null;
    if (unit.cooldownUntil) {
      if (isInCooldown) {
        const hours = Math.ceil(
          (new Date(unit.cooldownUntil).getTime() - Date.now()) /
            (1000 * 60 * 60)
        );
        cooldownDisplay = `Available in ${hours} hour${hours === 1 ? "" : "s"}`;
      } else {
        cooldownDisplay = "Available now";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: unit.id,
        status: unit.status,
        saleCount: unit.saleCount,
        maxSales: unit.maxSales,
        remainingSales,
        cooldownUntil: unit.cooldownUntil,
        isInCooldown,
        cooldownDisplay,
        lastSaleAt: unit.lastSaleAt,
      },
    });
  } catch (error) {
    console.error("Get cooldown status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/units/[id]/cooldown/reset - Reset cooldown
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const db = getDb();
    const unit = await db.query.inventoryUnits.findFirst({
      where: eq(inventoryUnits.id, params.id),
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "Unit not found" },
        { status: 404 }
      );
    }

    // Reset cooldown
    await db
      .update(inventoryUnits)
      .set({
        cooldownUntil: null,
        status: "available",
        updatedAt: new Date(),
      })
      .where(eq(inventoryUnits.id, params.id));

    return NextResponse.json({
      success: true,
      data: {
        id: unit.id,
        message: "Cooldown reset successfully",
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

    console.error("Reset cooldown error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
