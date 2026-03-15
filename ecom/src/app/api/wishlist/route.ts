import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { wishlists, products, productImages } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getCurrentCustomer } from "@/lib/auth";

// GET /api/wishlist - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentCustomer();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";

    const db = getDb();

    const wishlistItems = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        platformId: wishlists.platformId,
        priceAlert: wishlists.priceAlert,
        createdAt: wishlists.createdAt,
        productName: products.name,
        productNameAr: products.nameAr,
        productSlug: products.slug,
        productDescription: products.description,
        productDescriptionAr: products.descriptionAr,
        productBasePrice: products.basePrice,
        productCompareAtPrice: products.compareAtPrice,
        productCurrentStock: products.currentStock,
        productIsFeatured: products.isFeatured,
        productIsNew: products.isNew,
        productDeliveryType: products.deliveryType,
        productAverageRating: products.averageRating,
        productReviewCount: products.reviewCount,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(
        and(
          eq(wishlists.userId, user.id),
          eq(products.isActive, true)
        )
      )
      .orderBy(desc(wishlists.createdAt));

    // Get images
    const productIds = wishlistItems.map((item) => item.productId);
    const images = productIds.length > 0
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

    const imagesByProduct: Record<string, any[]> = {};
    images.forEach((img) => {
      if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
      imagesByProduct[img.productId].push(img);
    });

    // Format response
    const formattedItems = wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      platformId: item.platformId,
      priceAlert: item.priceAlert?.toString() || null,
      createdAt: item.createdAt,
      product: {
        id: item.productId,
        name: locale === "ar" && item.productNameAr ? item.productNameAr : item.productName,
        nameAr: item.productNameAr,
        slug: item.productSlug,
        description: locale === "ar" && item.productDescriptionAr ? item.productDescriptionAr : item.productDescription,
        descriptionAr: item.productDescriptionAr,
        price: item.productBasePrice?.toString() || "0",
        compareAtPrice: item.productCompareAtPrice?.toString() || null,
        currentStock: item.productCurrentStock,
        isFeatured: item.productIsFeatured,
        isNew: item.productIsNew,
        deliveryType: item.productDeliveryType,
        averageRating: item.productAverageRating?.toString() || "0",
        reviewCount: item.productReviewCount,
        images: imagesByProduct[item.productId] || [],
      },
    }));

    return NextResponse.json({
      success: true,
      data: formattedItems,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentCustomer();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, platformId, priceAlert } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if already in wishlist
    const existing = await db
      .select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, user.id),
          eq(wishlists.productId, productId)
        )
      )
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: "Item already in wishlist" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product[0]) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Add to wishlist
    await db.insert(wishlists).values({
      userId: user.id,
      productId,
      platformId: platformId || null,
      priceAlert: priceAlert || null,
    });

    return NextResponse.json({
      success: true,
      message: "Item added to wishlist",
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to add item to wishlist" },
      { status: 500 }
    );
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentCustomer();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const productId = searchParams.get("productId");

    if (!itemId && !productId) {
      return NextResponse.json(
        { error: "Item ID or Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    if (itemId) {
      await db
        .delete(wishlists)
        .where(
          and(
            eq(wishlists.id, itemId),
            eq(wishlists.userId, user.id)
          )
        );
    } else if (productId) {
      await db
        .delete(wishlists)
        .where(
          and(
            eq(wishlists.productId, productId),
            eq(wishlists.userId, user.id)
          )
        );
    }

    return NextResponse.json({
      success: true,
      message: "Item removed from wishlist",
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
