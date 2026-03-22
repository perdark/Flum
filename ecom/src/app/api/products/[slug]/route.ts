import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { products, productImages, productCategories, categories, reviews } from "@/lib/db/schema";
import { eq, and, desc, sql, avg } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get("locale") || "en";

    const db = getDb();

    // Get product
    const productData = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (!productData[0]) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product = productData[0];

    // Get product images
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.sortOrder);

    // Get product categories
    const categoriesMappedData = await db
      .select({
        productId: productCategories.productId,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryNameAr: categories.nameAr,
        categorySlug: categories.slug,
        categoryIcon: categories.icon,
        categoryBanner: categories.banner,
        categoryPrice: productCategories.categoryPrice,
        categorySku: productCategories.categorySku,
        isPrimary: productCategories.isPrimary,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, product.id));

    // Get category
    let categoryData = null;
    const primaryCategoryMapping = categoriesMappedData.find(c => c.isPrimary);
    if (primaryCategoryMapping) {
      categoryData = {
        id: primaryCategoryMapping.categoryId,
        name: primaryCategoryMapping.categoryName,
        nameAr: primaryCategoryMapping.categoryNameAr,
        slug: primaryCategoryMapping.categorySlug,
        icon: primaryCategoryMapping.categoryIcon,
        banner: primaryCategoryMapping.categoryBanner,
      };
    }

    // Get approved reviews
    const reviewsData = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
        createdAt: reviews.createdAt,
        customerEmail: reviews.customerEmail,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, product.id),
          eq(reviews.isApproved, true),
          eq(reviews.isActive, true)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    // Increment view count
    await db
      .update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, product.id));

    // Format response
    const formattedProduct = {
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
      views: product.views + 1,
      salesCount: product.salesCount,
      averageRating: product.averageRating?.toString() || "0",
      ratingCount: product.ratingCount,
      reviewCount: product.reviewCount,
      images,
      categories: categoriesMappedData,
      category: categoryData,
      reviews: reviewsData,
      metadata: product.metadata,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    console.error("Product detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
