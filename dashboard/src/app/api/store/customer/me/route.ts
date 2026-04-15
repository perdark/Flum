import { NextResponse } from "next/server";
import { getStoreCustomer } from "@/lib/customer-auth";

export async function GET() {
  try {
    const customer = await getStoreCustomer();
    if (!customer) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ success: true, data: customer });
  } catch (e) {
    console.error("customer/me:", e);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
