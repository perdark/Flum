import { NextRequest, NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/store-queries";

function tagList(raw: string | null): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function finiteFloat(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function positiveInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const { products, total } = await getActiveProducts({
      categorySlug: sp.get("category") || undefined,
      search: sp.get("search") || undefined,
      sort: sp.get("sort") || "newest",
      featured: sp.get("featured") === "true" || undefined,
      isNew: sp.get("new") === "true" || undefined,
      isBundle: sp.get("bundle") === "1" || undefined,
      onSale: sp.get("deals") === "1" || sp.get("onSale") === "1" || undefined,
      minPrice: finiteFloat(sp.get("minPrice")),
      maxPrice: finiteFloat(sp.get("maxPrice")),
      platformTags: tagList(sp.get("platforms")),
      regionTags: tagList(sp.get("regions")),
      typeTags: tagList(sp.get("types")),
      inStockOnly: sp.get("inStock") === "1" || undefined,
      minRating: finiteFloat(sp.get("minRating")),
      page: positiveInt(sp.get("page"), 1),
      limit: Math.min(48, positiveInt(sp.get("limit"), 20)),
    });

    const page = positiveInt(sp.get("page"), 1);
    const limit = Math.min(48, positiveInt(sp.get("limit"), 20));

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
