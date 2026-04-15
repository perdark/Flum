import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword } from "@/utils/security";
import { createCustomerSessionCookie } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "Customer";

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Valid email and password (6+ chars) required" },
        { status: 400 },
      );
    }
    if (body.type === "merchant") {
      return NextResponse.json(
        { success: false, error: "Business accounts are created by an administrator." },
        { status: 403 },
      );
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [row] = await db
      .insert(customers)
      .values({
        email,
        name: name || email.split("@")[0],
        type: "retail",
        passwordHash,
      })
      .returning({ id: customers.id });

    await createCustomerSessionCookie(row.id);

    return NextResponse.json({ success: true, data: { id: row.id } }, { status: 201 });
  } catch (e) {
    console.error("register:", e);
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}
