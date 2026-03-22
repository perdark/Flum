/**
 * POST /api/auth/logout
 *
 * Invalidate current session
 */

import { NextResponse } from "next/server";
import { invalidateSession, getCurrentUser } from "@/lib/auth";
import { logLogout } from "@/services/activityLog";

export async function POST() {
  try {
    const user = await getCurrentUser();

    // Invalidate session
    await invalidateSession();

    // Log logout if user was authenticated
    if (user) {
      await logLogout(user.id);
    }

    return NextResponse.json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
