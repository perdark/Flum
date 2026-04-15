import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/store-queries";

export async function GET() {
  try {
    const tree = await getCategoryTree();
    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
