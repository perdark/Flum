import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { products, productImages, productCategories, categories } from "@/lib/db/schema";
import { eq, desc, and, sql, like, or, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // Filters
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");
    const sort = searchParams.get("sort") || "createdAt";
    const locale = searchParams.get("locale") || "en";

    const db = getDb();

    // Build conditions
    const conditions: any[] = [];
    // Temporarily disabled for debugging
    // const conditions: any[] = [eq(products.isActive, true)];

    if (category) {
      conditions.push(eq(products.slug, category)); // category slug
    }

    if (category) {
      conditions.push(eq(categories.slug, category));
    }

    if (featured === "true") {
      conditions.push(eq(products.isFeatured, true));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(products.name, searchTerm),
          like(products.description, searchTerm),
          like(products.nameAr, searchTerm)
        )
      );
    }

    // Build query with relations
    const productsData = await db
      .select({
        id: products.id,
        name: products.name,
        nameAr: products.nameAr,
        slug: products.slug,
        description: products.description,
        descriptionAr: products.descriptionAr,
        sku: products.sku,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
        deliveryType: products.deliveryType,
        isFeatured: products.isFeatured,
        isNew: products.isNew,
        currentStock: products.currentStock,
        pointsReward: products.pointsReward,
        maxQuantity: products.maxQuantity,
        videoUrl: products.videoUrl,
        videoThumbnail: products.videoThumbnail,
        views: products.views,
        salesCount: products.salesCount,
        averageRating: products.averageRating,
        ratingCount: products.ratingCount,
        reviewCount: products.reviewCount,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId))
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(
        sort === "price_asc"
          ? products.basePrice
          : sort === "price_desc"
          ? desc(products.basePrice)
          : sort === "rating"
          ? desc(products.averageRating)
          : sort === "popular"
          ? desc(products.salesCount)
          : desc(products.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // Get images for each product
    const productIds = productsData.map((p) => p.id);
    const images = productIds.length > 0
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

    // Get categories for each product
    const productCategoriesData = productIds.length > 0
      ? await db
          .select({
            productId: productCategories.productId,
            categoryId: categories.id,
            categoryName: categories.name,
            categoryNameAr: categories.nameAr,
            categorySlug: categories.slug,
            categoryIcon: categories.icon,
            categoryPrice: productCategories.categoryPrice,
            isPrimary: productCategories.isPrimary,
          })
          .from(productCategories)
          .innerJoin(categories, eq(productCategories.categoryId, categories.id))
          .where(inArray(productCategories.productId, productIds))
      : [];

    // Group images and categories by product
    const imagesByProduct: Record<string, any[]> = {};
    images.forEach((img) => {
      if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
      imagesByProduct[img.productId].push(img);
    });

    const categoriesByProduct: Record<string, any[]> = {};
    productCategoriesData.forEach((pp) => {
      if (!categoriesByProduct[pp.productId]) categoriesByProduct[pp.productId] = [];
      categoriesByProduct[pp.productId].push(pp);
    });

    // Format response
    const formattedProducts = productsData.map((product) => ({
      id: product.id,
      name: locale === "ar" && product.nameAr ? product.nameAr : product.name,
      nameAr: product.nameAr,
      slug: product.slug,
      description: locale === "ar" && product.descriptionAr ? product.descriptionAr : product.description,
      descriptionAr: product.descriptionAr,
      sku: product.sku,
      price: product.basePrice?.toString() || "0",
      compareAtPrice: product.compareAtPrice?.toString() || null,
      deliveryType: product.deliveryType,
      isFeatured: product.isFeatured,
      isNew: product.isNew,
      currentStock: product.currentStock,
      pointsReward: product.pointsReward,
      maxQuantity: product.maxQuantity,
      videoUrl: product.videoUrl,
      videoThumbnail: product.videoThumbnail,
      views: product.views,
      salesCount: product.salesCount,
      averageRating: product.averageRating?.toString() || "0",
      ratingCount: product.ratingCount,
      reviewCount: product.reviewCount,
      images: imagesByProduct[product.id] || [],
      categories: categoriesByProduct[product.id] || [],
      createdAt: product.createdAt,
    }));

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const total = parseInt(countResult[0]?.count?.toString() || "0");
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
