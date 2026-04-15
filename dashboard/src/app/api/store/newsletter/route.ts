import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { storeNewsletterSignups } from "@/db/schema";
import { isValidEmail } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
    }

    const db = getDb();
    await db.insert(storeNewsletterSignups).values({ email }).onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("newsletter:", e);
    return NextResponse.json({ success: false, error: "Could not save" }, { status: 500 });
  }
}
