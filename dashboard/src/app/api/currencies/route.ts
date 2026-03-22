/**
 * Currencies API Routes
 *
 * GET /api/currencies - List all currencies
 * POST /api/currencies - Create a new currency (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { currencies } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, like, or } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

// ============================================================================
// GET /api/currencies - List currencies
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    const db = getDb();

    // Build conditions
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(currencies.code, `%${search}%`),
          like(currencies.name, `%${search}%`),
          like(currencies.symbol, `%${search}%`)
        )!
      );
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(currencies.isActive, isActive === "true"));
    }

    const allCurrencies = await db
      .select()
      .from(currencies)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(currencies.code);

    return NextResponse.json({
      success: true,
      data: allCurrencies,
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

    console.error("Get currencies error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/currencies - Create currency
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);

    const body = await request.json();
    const { code, name, symbol, exchangeRate, isActive = true } = body;

    // Validate input
    if (!code || !name || !symbol) {
      return NextResponse.json(
        { success: false, error: "Code, name, and symbol are required" },
        { status: 400 }
      );
    }

    if (code.length !== 3) {
      return NextResponse.json(
        { success: false, error: "Currency code must be 3 characters (e.g., USD)" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check for duplicate code
    const [existing] = await db
      .select()
      .from(currencies)
      .where(sql`LOWER(${currencies.code}) = LOWER(${code})`)
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Currency with this code already exists" },
        { status: 409 }
      );
    }

    // Create currency
    const newCurrencies = await db
      .insert(currencies)
      .values({
        code: code.toUpperCase(),
        name: name.trim(),
        symbol: symbol.trim(),
        exchangeRate: exchangeRate ? exchangeRate.toString() : "1.0000",
        isActive,
      })
      .returning();

    const newCurrency = (newCurrencies as any[])[0];

    // Log activity
    await logActivity({
      userId: user.id,
      action: "currency_created",
      entity: "currency",
      entityId: newCurrency.id,
      metadata: { code: newCurrency.code, name: newCurrency.name },
    });

    return NextResponse.json({
      success: true,
      data: newCurrency,
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

    console.error("Create currency error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
