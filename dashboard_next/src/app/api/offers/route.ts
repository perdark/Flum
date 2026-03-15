/**
 * Offers API Routes
 *
 * GET /api/offers - List all offers
 * POST /api/offers - Create a new offer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { offers, productOffers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const allOffers = await db.select().from(offers).orderBy(offers.createdAt);

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
    } = body;

    // Validate required fields
    if (!name || !slug || !type || !value || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if slug already exists
    const existing = await db
      .select()
      .from(offers)
      .where(eq(offers.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Offer with this slug already exists" },
        { status: 400 }
      );
    }

    const [newOffer] = await db
      .insert(offers)
      .values({
        name,
        slug,
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
