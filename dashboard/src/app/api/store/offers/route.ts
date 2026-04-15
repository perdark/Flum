import { NextRequest, NextResponse } from "next/server";
import { getActiveOffers } from "@/lib/store-queries";

export async function GET(request: NextRequest) {
  try {
    const displayType = request.nextUrl.searchParams.get("type") || undefined;
    const offers = await getActiveOffers(displayType);
    return NextResponse.json({ success: true, data: offers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch offers" },
      { status: 500 },
    );
  }
}
