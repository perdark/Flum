import { NextRequest, NextResponse } from "next/server";
import { getAlsoBought } from "@/lib/store-queries";
import { getStoreCustomer } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });
  }

  try {
    const customer = await getStoreCustomer();
    const products = await getAlsoBought(productId, {
      limit: 4,
      pricingTier: customer?.type === "merchant" ? "merchant" : "retail",
    });
    return NextResponse.json({ success: true, data: products });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
