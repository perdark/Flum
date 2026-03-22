/**
 * Individual Offer API Routes
 *
 * GET /api/offers/[id] - Get offer details
 * PUT /api/offers/[id] - Update offer
 * DELETE /api/offers/[id] - Delete offer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { offers, productOffers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    // Check if offer exists
    const [existing] = await db
      .select()
      .from(offers)
      .where(eq(offers.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check if new slug conflicts with another offer
    if (body.slug && body.slug !== existing.slug) {
      const [slugCheck] = await db
        .select()
        .from(offers)
        .where(eq(offers.slug, body.slug))
        .limit(1);

      if (slugCheck) {
        return NextResponse.json(
          { error: "Offer with this slug already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.value !== undefined) updateData.value = body.value.toString();
    if (body.minPurchase !== undefined) updateData.minPurchase = body.minPurchase.toString();
    if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount?.toString() || null;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.banner !== undefined) updateData.banner = body.banner;
    if (body.appliesTo !== undefined) updateData.appliesTo = body.appliesTo;
    if (body.appliesToId !== undefined) updateData.appliesToId = body.appliesToId;

    const [updated] = await db
      .update(offers)
      .set(updateData)
      .where(eq(offers.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating offer:", error);
    return NextResponse.json(
      { error: "Failed to update offer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    await db.delete(offers).where(eq(offers.id, id));

    return NextResponse.json({ success: true, message: "Offer deleted" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return NextResponse.json(
      { error: "Failed to delete offer" },
      { status: 500 }
    );
  }
}
