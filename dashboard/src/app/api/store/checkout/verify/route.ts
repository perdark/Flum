import { NextResponse } from "next/server";

/** Payment provider callback placeholder (e.g. ZainCash redirect). */
export async function POST() {
  return NextResponse.json({ success: true, data: { status: "pending_implementation" } });
}
