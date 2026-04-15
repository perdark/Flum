import { NextResponse } from "next/server";
import { clearCustomerSessionCookie } from "@/lib/customer-auth";

export async function POST() {
  try {
    await clearCustomerSessionCookie();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("logout:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
