import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-queries";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Store settings not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error fetching store settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch store settings" },
      { status: 500 },
    );
  }
}
