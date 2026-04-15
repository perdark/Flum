import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { processDueStorefrontAutoFulfill } from "@/services/storeOrderAutoFulfill";

/** Staff: run auto-fulfill pass for overdue storefront orders (inventory-backed only). */
export async function POST() {
  try {
    await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const result = await processDueStorefrontAutoFulfill();
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (e.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("auto-fulfill-due:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
