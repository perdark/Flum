import { NextRequest, NextResponse } from "next/server";
import { loginCustomer } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    const result = await loginCustomer(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Login failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
