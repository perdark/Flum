import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifyPassword } from "@/utils/security";
import { createCustomerSessionCookie } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    const db = getDb();
    const [row] = await db
      .select({
        id: customers.id,
        passwordHash: customers.passwordHash,
      })
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)))
      .limit(1);

    if (!row?.passwordHash) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    await createCustomerSessionCookie(row.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("login:", e);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
