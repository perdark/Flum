/**
 * Coupon Validation API
 *
 * POST /api/coupons/validate - Validate coupon code and return discount amount
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { coupons, couponUsage, users } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, customerEmail, subtotal, userEmail } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }

    if (!subtotal || isNaN(subtotal)) {
      return NextResponse.json(
        { success: false, error: "Valid subtotal is required" },
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
          eq(sql`LOWER(${coupons.code})`, code.toLowerCase()),
          eq(coupons.isActive, true),
          sql`${coupons.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: "Invalid coupon code",
      });
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;

    if (validFrom > now) {
      return NextResponse.json({
        success: false,
        error: "Coupon is not yet active",
      });
    }

    if (validUntil && validUntil < now) {
      return NextResponse.json({
        success: false,
        error: "Coupon has expired",
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        success: false,
        error: "Coupon has reached its usage limit",
      });
    }

    // Check minimum purchase
    const minPurchase = parseFloat(coupon.minPurchase || "0");
    if (subtotal < minPurchase) {
      return NextResponse.json({
        success: false,
        error: `Minimum purchase of $${minPurchase} required for this coupon`,
      });
    }

    // Check user-specific limit
    const customerEmailToUse = customerEmail || userEmail;
    if (coupon.userLimit && customerEmailToUse) {
      const usageCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponId, coupon.id),
            eq(couponUsage.customerEmail, customerEmailToUse)
          )
        )
        .then((res) => res[0]?.count || 0);

      if (usageCount >= coupon.userLimit) {
        return NextResponse.json({
          success: false,
          error: `You have reached the maximum usage limit for this coupon (${coupon.userLimit} times)`,
        });
      }
    }

    // Check if coupon applies to specific products (if productIds provided)
    let applicableProducts: string[] = [];
    if (coupon.applicableProductIds && Array.isArray(coupon.applicableProductIds)) {
      applicableProducts = coupon.applicableProductIds;
    }

    // Calculate discount
    const subtotalNum = parseFloat(subtotal);
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = subtotalNum * (parseFloat(coupon.discountValue) / 100);

      // Apply max discount cap if set
      if (coupon.maxDiscount) {
        const maxDiscount = parseFloat(coupon.maxDiscount);
        discountAmount = Math.min(discountAmount, maxDiscount);
      }
    } else {
      discountAmount = parseFloat(coupon.discountValue);
    }

    // Ensure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotalNum);

    return NextResponse.json({
      success: true,
      data: {
        couponId: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount.toFixed(2),
        applicableProducts,
      },
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
