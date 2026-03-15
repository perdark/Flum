import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { platforms, products, productPlatforms, productImages } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get("locale") || "en";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Get platform
    const platformData = await db
      .select()
      .from(platforms)
      .where(and(eq(platforms.slug, slug), eq(platforms.isActive, true)))
      .limit(1);

    if (!platformData[0]) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }

    const platform = platformData[0];

    // Get product IDs for this platform
    const platformProductsData = await db
      .select({
        productId: productPlatforms.productId,
        platformPrice: productPlatforms.platformPrice,
      })
      .from(productPlatforms)
      .where(eq(productPlatforms.platformId, platform.id));

    const productIds = platformProductsData.map((pp) => pp.productId);

    let productsData: any[] = [];
    let total = 0;

    if (productIds.length > 0) {
      // Get products
      productsData = await db
        .select({
          id: products.id,
          name: products.name,
          nameAr: products.nameAr,
          slug: products.slug,
          description: products.description,
          descriptionAr: products.descriptionAr,
          basePrice: products.basePrice,
          compareAtPrice: products.compareAtPrice,
          deliveryType: products.deliveryType,
          isFeatured: products.isFeatured,
          isNew: products.isNew,
          currentStock: products.currentStock,
          pointsReward: products.pointsReward,
          averageRating: products.averageRating,
          reviewCount: products.reviewCount,
          salesCount: products.salesCount,
          views: products.views,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(
          and(
            inArray(products.id, productIds),
            eq(products.isActive, true)
          )
        )
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);

      // Get images
      const pIds = productsData.map((p) => p.id);
      const images = pIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, pIds))
        : [];

      const imagesByProduct: Record<string, any[]> = {};
      images.forEach((img) => {
        if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
        imagesByProduct[img.productId].push(img);
      });

      // Format products with platform price override
      const priceOverrides = new Map(
        platformProductsData.map((pp) => [pp.productId, pp.platformPrice])
      );

      productsData = productsData.map((product) => ({
        ...product,
        price: priceOverrides.get(product.id)?.toString() || product.basePrice?.toString() || "0",
        images: imagesByProduct[product.id] || [],
      }));

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            inArray(products.id, productIds),
            eq(products.isActive, true)
          )
        );
      total = parseInt(countResult[0]?.count?.toString() || "0");
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        id: platform.id,
        name: locale === "ar" && platform.nameAr ? platform.nameAr : platform.name,
        nameAr: platform.nameAr,
        slug: platform.slug,
        description: platform.description,
        icon: platform.icon,
        banner: platform.banner,
        parentId: platform.parentId,
        sortOrder: platform.sortOrder,
      },
      products: {
        data: productsData,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Platform detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform" },
      { status: 500 }
    );
  }
}
