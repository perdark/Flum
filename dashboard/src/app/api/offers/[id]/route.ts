/**
 * Individual Offer API Routes
 *
 * GET /api/offers/[id] - Fetch a single offer
 * PUT /api/offers/[id] - Update an offer
 * DELETE /api/offers/[id] - Delete an offer (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { offers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const [offer] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.id, id), isNull(offers.deletedAt)))
      .limit(1);

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: offer });
  } catch (error) {
    console.error("Error fetching offer:", error);
    return NextResponse.json(
      { error: "Failed to fetch offer" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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
    if (!name || !type || value === null || value === undefined || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate value type explicitly (0 is allowed)
    if (typeof value !== "number" && typeof value !== "string") {
      return NextResponse.json(
        { error: "Invalid value type" },
        { status: 400 }
      );
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return NextResponse.json(
        { error: "Invalid value" },
        { status: 400 }
      );
    }

    // Validate dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate" },
        { status: 400 }
      );
    }

    if (parsedStartDate.getTime() >= parsedEndDate.getTime()) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if slug exists (and it's not this offer)
    if (slug) {
      const existing = await db
        .select()
        .from(offers)
        .where(and(eq(offers.slug, slug), isNull(offers.deletedAt)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        return NextResponse.json(
          { error: "Offer with this slug already exists" },
          { status: 400 }
        );
      }
    }

    const [updatedOffer] = await db
      .update(offers)
      .set({
        name,
        slug: slug || null,
        nameAr: nameAr || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        type,
        value: numericValue.toString(),
        minPurchase: minPurchase?.toString() || "0",
        maxDiscount: maxDiscount?.toString() || null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
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
        updatedAt: new Date(),
      })
      .where(and(eq(offers.id, id), isNull(offers.deletedAt)))
      .returning();

    if (!updatedOffer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedOffer });
  } catch (error) {
    console.error("Error updating offer:", error);
    return NextResponse.json(
      { error: "Failed to update offer" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    // Soft delete
    const [deletedOffer] = await db
      .update(offers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(offers.id, id), isNull(offers.deletedAt)))
      .returning();

    if (!deletedOffer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deletedOffer });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return NextResponse.json(
      { error: "Failed to delete offer" },
      { status: 500 }
    );
  }
}
