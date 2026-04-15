import { NextRequest, NextResponse } from "next/server";
import { processDueStorefrontAutoFulfill } from "@/services/storeOrderAutoFulfill";

/** Vercel / external cron: set CRON_SECRET and send Authorization: Bearer <secret>. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await processDueStorefrontAutoFulfill(80);
  return NextResponse.json({ success: true, data: result });
}
