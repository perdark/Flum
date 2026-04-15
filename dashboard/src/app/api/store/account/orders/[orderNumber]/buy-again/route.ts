import { NextRequest, NextResponse } from "next/server";
import { getStoreCustomer } from "@/lib/customer-auth";
import { getReorderPayload } from "@/lib/store-queries";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const customer = await getStoreCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderNumber } = await params;
    const decoded = decodeURIComponent(orderNumber);
    const pricingTier = customer.type === "merchant" ? "merchant" : "retail";
    const payload = await getReorderPayload(customer.id, decoded, pricingTier);

    if (!payload) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("buy-again", e);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
