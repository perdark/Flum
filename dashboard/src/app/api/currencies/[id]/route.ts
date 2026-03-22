/**
 * Currency Detail API Routes
 *
 * GET /api/currencies/[id] - Get currency details
 * PUT /api/currencies/[id] - Update currency
 * DELETE /api/currencies/[id] - Delete currency
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { currencies, storeSettings } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/currencies/[id] - Get currency details
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;

    const db = getDb();

    const [currency] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, id))
      .limit(1);

    if (!currency) {
      return NextResponse.json(
        { success: false, error: "Currency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: currency,
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

    console.error("Get currency error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/currencies/[id] - Update currency
// ============================================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
    const { id } = await context.params;

    const body = await request.json();
    const { code, name, symbol, exchangeRate, isActive } = body;

    const db = getDb();

    // Check if currency exists
    const [existing] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Currency not found" },
        { status: 404 }
      );
    }

    // Check for duplicate code (if changed)
    if (code && code !== existing.code) {
      if (code.length !== 3) {
        return NextResponse.json(
          { success: false, error: "Currency code must be 3 characters (e.g., USD)" },
          { status: 400 }
        );
      }

      const [duplicate] = await db
        .select()
        .from(currencies)
        .where(
          and(
            sql`LOWER(${currencies.code}) = LOWER(${code})`,
            sql`${currencies.id} != ${id}`
          )
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Currency with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (code !== undefined) updateData.code = code.toUpperCase();
    if (name !== undefined) updateData.name = name.trim();
    if (symbol !== undefined) updateData.symbol = symbol.trim();
    if (exchangeRate !== undefined) updateData.exchangeRate = exchangeRate.toString();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update currency
    const [updated] = await db
      .update(currencies)
      .set(updateData)
      .where(eq(currencies.id, id))
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "currency_updated",
      entity: "currency",
      entityId: id,
      metadata: {
        changes: {
          code: code !== undefined && code !== existing.code ? { from: existing.code, to: code } : undefined,
          exchangeRate: exchangeRate !== undefined && exchangeRate !== existing.exchangeRate ? { from: existing.exchangeRate, to: exchangeRate } : undefined,
          isActive: isActive !== undefined && isActive !== existing.isActive ? { from: existing.isActive, to: isActive } : undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
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

    console.error("Update currency error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/currencies/[id] - Delete currency
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
    const { id } = await context.params;

    const db = getDb();

    // Check if currency exists
    const [existing] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Currency not found" },
        { status: 404 }
      );
    }

    // Check if currency is used as default in store settings
    const [storeSetting] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.defaultCurrencyId, id))
      .limit(1);

    if (storeSetting) {
      return NextResponse.json(
        { success: false, error: "Cannot delete currency that is set as default. Change the default currency first." },
        { status: 409 }
      );
    }

    // Delete currency
    await db.delete(currencies).where(eq(currencies.id, id));

    // Log activity
    await logActivity({
      userId: user.id,
      action: "currency_deleted",
      entity: "currency",
      entityId: id,
      metadata: { code: existing.code, name: existing.name },
    });

    return NextResponse.json({
      success: true,
      data: { id },
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

    console.error("Delete currency error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
