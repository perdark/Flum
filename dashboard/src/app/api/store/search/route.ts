import { NextRequest, NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/store-queries";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { products } = await getActiveProducts({
      search: q,
      limit: 8,
      sort: "popular",
    });

    const data = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      image: p.image,
      inStock: p.inStock,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("store/search:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 },
    );
  }
}
