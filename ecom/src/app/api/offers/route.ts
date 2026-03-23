/**
 * Storefront Offers API Routes
 *
 * GET /api/offers - Fetch active offers for storefront display
 *   Query params:
 *   - type: filter by displayType (hero, banner, card, modal)
 *   - limit: limit results
 *   - locale: for localized content (en, ar)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { offers } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const rawLimit = searchParams.get("limit");
    let limit = 10;
    if (rawLimit !== null) {
      const parsedLimit = Number.parseInt(rawLimit, 10);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(Math.max(parsedLimit, 1), 100);
      }
    }
    const locale = searchParams.get("locale") || "en";

    const db = getDb();

    // Build conditions for active offers within date range
    const conditions = [
      eq(offers.isActive, true),
      sql`${offers.startDate} <= NOW()`,
      sql`${offers.endDate} >= NOW()`,
      isNull(offers.deletedAt),
    ];

    // Filter by display type if specified
    if (type) {
      conditions.push(eq(offers.displayType, type));
    }

    // Query offers ordered by display position then creation date
    const offersData = await db
      .select()
      .from(offers)
      .where(and(...conditions))
      .orderBy(offers.displayPosition, desc(offers.createdAt))
      .limit(limit);

    // Format response with localized content
    const formattedOffers = offersData.map((offer) => ({
      id: offer.id,
      name: locale === "ar" && offer.nameAr ? offer.nameAr : offer.name,
      nameAr: offer.nameAr,
      slug: offer.slug,
      description: locale === "ar" && offer.descriptionAr ? offer.descriptionAr : offer.description,
      descriptionAr: offer.descriptionAr,
      type: offer.type,
      value: offer.value?.toString() || "0",
      minPurchase: offer.minPurchase?.toString() || "0",
      maxDiscount: offer.maxDiscount?.toString() || null,
      startDate: offer.startDate,
      endDate: offer.endDate,
      // Display settings
      displayType: offer.displayType,
      displayPosition: offer.displayPosition,
      backgroundColor: offer.backgroundColor,
      textColor: offer.textColor,
      showCountdown: offer.showCountdown,
      ctaText: locale === "ar" && offer.ctaTextAr ? offer.ctaTextAr : offer.ctaText,
      ctaTextAr: offer.ctaTextAr,
      ctaLink: offer.ctaLink,
      featuredImage: offer.featuredImage,
      banner: offer.banner,
      appliesTo: offer.appliesTo,
      appliesToId: offer.appliesToId,
    }));

    return NextResponse.json({
      success: true,
      data: formattedOffers,
      meta: {
        count: formattedOffers.length,
        locale,
      },
    });
  } catch (error) {
    console.error("Storefront Offers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}
