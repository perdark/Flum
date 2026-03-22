/**
 * POST /api/coupons/validate
 *
 * Validate a coupon code for checkout
 * Public endpoint (no auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { coupons, couponUsage } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cartTotal, customerEmail, productIds = [] } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code.toUpperCase()),
          eq(coupons.isActive, true),
          sql`deleted_at IS NULL`,
          sql`(valid_until IS NULL OR valid_until > NOW())`
        )
      )
      .limit(1);

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: "Invalid coupon code",
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        success: false,
        error: "Coupon has reached its usage limit",
      });
    }

    // Check min purchase
    const minPurchase = parseFloat(coupon.minPurchase || "0");
    if (cartTotal && cartTotal < minPurchase) {
      return NextResponse.json({
        success: false,
        error: `Minimum purchase of $${minPurchase} required`,
      });
    }

    // Check if coupon applies to specific products
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      const hasApplicableProduct = productIds.some((id: string) =>
        coupon.applicableProductIds!.includes(id)
      );

      if (!hasApplicableProduct) {
        return NextResponse.json({
          success: false,
          error: "Coupon does not apply to any items in your cart",
        });
      }
    }

    // Check user-specific limit
    if (customerEmail && coupon.userLimit) {
      const usage = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponId, coupon.id),
            eq(couponUsage.customerEmail, customerEmail)
          )
        );

      if (usage[0]?.count >= coupon.userLimit) {
        return NextResponse.json({
          success: false,
          error: `You have already used this coupon the maximum number of times`,
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = cartTotal * (parseFloat(coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscount));
      }
    } else {
      discountAmount = parseFloat(coupon.discountValue);
    }

    return NextResponse.json({
      success: true,
      data: {
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount.toString(),
      },
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
