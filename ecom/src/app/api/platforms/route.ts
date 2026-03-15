import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { platforms, productPlatforms, products } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull } from "drizzle-orm";

// GET /api/platforms - List all platforms (tree structure)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";
    const asTree = searchParams.get("asTree") === "true";
    const includeProductCount = searchParams.get("includeProductCount") === "true";

    const db = getDb();

    // Get all active platforms (not deleted)
    const allPlatforms = await db
      .select()
      .from(platforms)
      .where(eq(platforms.isActive, true))
      .orderBy(platforms.sortOrder, platforms.name);

    if (!asTree) {
      // Return flat list with localized names
      const formatted = allPlatforms.map((platform) => ({
        id: platform.id,
        name: locale === "ar" && platform.nameAr ? platform.nameAr : platform.name,
        nameAr: platform.nameAr,
        slug: platform.slug,
        description: platform.description,
        icon: platform.icon,
        banner: platform.banner,
        parentId: platform.parentId,
        sortOrder: platform.sortOrder,
      }));

      return NextResponse.json({
        success: true,
        data: formatted,
      });
    }

    // Build tree structure (like dashboard)
    const platformMap = new Map<string, any>();
    const rootPlatforms: any[] = [];

    // First pass: create map and initialize children arrays
    for (const platform of allPlatforms) {
      platformMap.set(platform.id, {
        id: platform.id,
        name: locale === "ar" && platform.nameAr ? platform.nameAr : platform.name,
        nameAr: platform.nameAr,
        slug: platform.slug,
        description: platform.description,
        icon: platform.icon,
        banner: platform.banner,
        parentId: platform.parentId,
        sortOrder: platform.sortOrder,
        children: [],
      });
    }

    // Second pass: build hierarchy
    for (const platform of allPlatforms) {
      const node = platformMap.get(platform.id)!;
      if (platform.parentId) {
        const parent = platformMap.get(platform.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found (might be deleted), treat as root
          rootPlatforms.push(node);
        }
      } else {
        rootPlatforms.push(node);
      }
    }

    // Optionally add product counts
    if (includeProductCount) {
      const productCounts = await db
        .select({
          platformId: productPlatforms.platformId,
          count: sql<number>`count(distinct ${productPlatforms.productId})`,
        })
        .from(productPlatforms)
        .innerJoin(products, eq(productPlatforms.productId, products.id))
        .where(eq(products.isActive, true))
        .groupBy(productPlatforms.platformId);

      const countMap = new Map(
        productCounts.map((pc) => [pc.platformId, pc.count])
      );

      // Add counts recursively
      const addCounts = (nodes: any[]) => {
        for (const node of nodes) {
          node.productCount = countMap.get(node.id) || 0;
          if (node.children?.length > 0) {
            addCounts(node.children);
            // Add children counts to parent
            node.productCount += node.children.reduce(
              (sum: number, child: any) => sum + (child.productCount || 0),
              0
            );
          }
        }
      };
      addCounts(rootPlatforms);
    }

    return NextResponse.json({
      success: true,
      data: rootPlatforms,
    });
  } catch (error) {
    console.error("Platforms API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}
