/**
 * Coupons API Routes
 *
 * GET /api/coupons - List all coupons
 * POST /api/coupons - Create a new coupon
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { coupons, couponUsage } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc } from "drizzle-orm";
import { logCouponCreated } from "@/services/activityLog";

// ============================================================================
// GET /api/coupons - List coupons
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS);

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions = [sql`deleted_at IS NULL`];

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(coupons.isActive, isActive === "true"));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(coupons)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get coupons
    const couponsList = await db
      .select()
      .from(coupons)
      .where(and(...conditions))
      .orderBy(desc(coupons.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: couponsList,
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

    console.error("Get coupons error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/coupons - Create coupon
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_COUPONS);

    const body = await request.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase = "0",
      maxDiscount,
      usageLimit,
      userLimit = 1,
      validFrom,
      validUntil,
      applicableProductIds,
    } = body;

    // Validate input
    if (!code || !discountType || !discountValue) {
      return NextResponse.json(
        { success: false, error: "Code, discountType, and discountValue are required" },
        { status: 400 }
      );
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return NextResponse.json(
        { success: false, error: "discountType must be 'percentage' or 'fixed'" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if code already exists
    const [existing] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Coupon with this code already exists" },
        { status: 409 }
      );
    }

    // Create coupon
    const [coupon] = await db
      .insert(coupons)
      .values({
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue: discountValue.toString(),
        minPurchase: minPurchase.toString(),
        maxDiscount: maxDiscount?.toString(),
        usageLimit,
        userLimit,
        validFrom: validFrom || new Date(),
        validUntil,
        applicableProductIds,
        isActive: true,
      })
      .returning();

    // Log activity
    await logCouponCreated(user.id, coupon.id, coupon.code);

    return NextResponse.json({
      success: true,
      data: coupon,
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

    console.error("Create coupon error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
