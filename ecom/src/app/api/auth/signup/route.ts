import { NextRequest, NextResponse } from "next/server";
import { registerCustomer } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`signup:${ip}`, 3, 60 * 60 * 1000); // 3 attempts per hour

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please try again later.",
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    const result = await registerCustomer(email, password, firstName, lastName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Registration failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
