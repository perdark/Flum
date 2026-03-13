/**
 * Reviews API Routes
 *
 * GET /api/reviews - List reviews with filtering
 * POST /api/reviews - Create a new review (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc } from "drizzle-orm";

// ============================================================================
// GET /api/reviews - List reviews
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions = [
      sql`${reviews.deletedAt} IS NULL`,
      sql`${products.deletedAt} IS NULL`,
    ];

    if (productId) {
      conditions.push(eq(reviews.productId, productId));
    }

    if (isActive !== null && isActive !== "") {
      conditions.push(eq(reviews.isActive, isActive === "true"));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get reviews with product details
    const reviewsList = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSlug: products.slug,
        customerEmail: reviews.customerEmail,
        rating: reviews.rating,
        comment: reviews.comment,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        isActive: reviews.isActive,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: reviewsList,
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

    console.error("Get reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/reviews - Create review (public endpoint)
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, customerEmail, rating, comment } = body;

    // Validate input
    if (!productId || !customerEmail || !rating) {
      return NextResponse.json(
        { success: false, error: "ProductId, customerEmail, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if product exists
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if user already reviewed this product
    const [existing] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, productId),
          eq(reviews.customerEmail, customerEmail),
          sql`deleted_at IS NULL`
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this product" },
        { status: 409 }
      );
    }

    // Create review
    const [review] = await db
      .insert(reviews)
      .values({
        productId,
        customerEmail,
        rating,
        comment: comment || null,
        isVerifiedPurchase: false, // Will be updated when linked to an order
        isActive: true,
      })
      .returning();

    // Update product rating stats
    await db.transaction(async (tx) => {
      // Get all active reviews for this product
      const allReviews = await tx
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(
          and(
            eq(reviews.productId, productId),
            eq(reviews.isActive, true),
            sql`deleted_at IS NULL`
          )
        );

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / allReviews.length;

      await tx
        .update(products)
        .set({
          averageRating: avgRating.toFixed(2),
          reviewCount: allReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    });

    return NextResponse.json({
      success: true,
      data: review,
    }, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
