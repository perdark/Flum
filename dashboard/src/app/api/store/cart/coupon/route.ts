import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { coupons } from "@/db/schema";
import { and, eq, isNull, or, gte, lte, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const subtotal = typeof body.subtotal === "number" ? body.subtotal : parseFloat(String(body.subtotal ?? "0"));
    if (!code) {
      return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
    }

    const db = getDb();
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code),
          eq(coupons.isActive, true),
          isNull(coupons.deletedAt),
          lte(coupons.validFrom, sql`NOW()`),
          or(isNull(coupons.validUntil), gte(coupons.validUntil, sql`NOW()`)),
        ),
      )
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ success: false, error: "Invalid coupon" }, { status: 404 });
    }
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, error: "Coupon no longer available" }, { status: 400 });
    }
    const minPurchase = parseFloat(coupon.minPurchase || "0");
    if (subtotal < minPurchase) {
      return NextResponse.json(
        { success: false, error: `Minimum cart subtotal of ${minPurchase} required` },
        { status: 400 },
      );
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = subtotal * (parseFloat(String(coupon.discountValue)) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, parseFloat(String(coupon.maxDiscount)));
      }
    } else {
      discount = parseFloat(String(coupon.discountValue));
    }

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        discountAmount: Math.round(discount * 100) / 100,
        discountType: coupon.discountType,
      },
    });
  } catch (e) {
    console.error("cart/coupon:", e);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
