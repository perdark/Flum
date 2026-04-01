/**
 * Offers API Routes
 *
 * GET /api/offers - List all offers (with filtering)
 *   Query params:
 *   - type: filter by displayType (hero, banner, card, modal)
 *   - active: filter by isActive (true, false)
 *   - limit: limit results
 *   - search: search in name
 * POST /api/offers - Create a new offer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { offers, productOffers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, isNull, or, like, desc, sql } from "drizzle-orm";

function escapeLike(value: string): string {
  return value.replace(/([%_\\])/g, "\\$1");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const active = searchParams.get("active");
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search");

    let limit: number | undefined;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100);
      }
    }

    const db = getDb();

    // Build conditions
    const conditions = [isNull(offers.deletedAt)];
    if (type) {
      conditions.push(eq(offers.displayType, type));
    }
    if (active === "true") {
      conditions.push(
        and(
          eq(offers.isActive, true),
          sql`${offers.startDate} <= NOW()`,
          sql`${offers.endDate} >= NOW()`
        )!
      );
    } else if (active === "false") {
      conditions.push(eq(offers.isActive, false));
    }
    if (search) {
      const safeSearch = `%${escapeLike(search)}%`;
      conditions.push(
        or(
          like(offers.name, safeSearch),
          like(sql`coalesce(${offers.nameAr}, '')`, safeSearch)
        )!
      );
    }

    // Order by display position (for hero) then created date
    const allOffers = await db
      .select()
      .from(offers)
      .where(and(...conditions))
      .orderBy(
        offers.displayPosition,
        desc(offers.createdAt)
      )
      .limit(limit ?? 1000);

    return NextResponse.json({ success: true, data: allOffers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      nameAr,
      description,
      descriptionAr,
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      isActive,
      banner,
      appliesTo,
      appliesToId,
      // Display settings
      displayType,
      displayPosition,
      backgroundColor,
      textColor,
      showCountdown,
      ctaText,
      ctaTextAr,
      ctaLink,
      featuredImage,
    } = body;

    // Validate required fields
    if (!name || !type || !value || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if slug already exists
    if (slug) {
      const existing = await db
        .select()
        .from(offers)
        .where(and(eq(offers.slug, slug), isNull(offers.deletedAt)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Offer with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Generate slug from name if not provided
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Ensure generated slug is unique
    const existingFinal = await db
      .select()
      .from(offers)
      .where(and(eq(offers.slug, finalSlug), isNull(offers.deletedAt)))
      .limit(1);

    if (existingFinal.length > 0) {
      return NextResponse.json(
        { error: 'Offer with this slug already exists' },
        { status: 400 }
      );
    }

    const [newOffer] = await db
      .insert(offers)
      .values({
        name,
        slug: finalSlug,
        nameAr: nameAr || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        type,
        value: value.toString(),
        minPurchase: minPurchase?.toString() || "0",
        maxDiscount: maxDiscount?.toString() || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? true,
        banner: banner || null,
        appliesTo: appliesTo || "all",
        appliesToId: appliesToId || null,
        // Display settings
        displayType: displayType || "banner",
        displayPosition: displayPosition ?? 0,
        backgroundColor: backgroundColor || null,
        textColor: textColor || "#FFFFFF",
        showCountdown: showCountdown ?? false,
        ctaText: ctaText || null,
        ctaTextAr: ctaTextAr || null,
        ctaLink: ctaLink || null,
        featuredImage: featuredImage || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json(
      { error: "Failed to create offer" },
      { status: 500 }
    );
  }
}
