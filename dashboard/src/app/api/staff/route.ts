/**
 * Staff API Routes
 *
 * GET /api/staff - List all staff members
 * POST /api/staff - Create a new staff account (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, isValidEmail, isValidPassword } from "@/utils/security";
import { eq, sql, or } from "drizzle-orm";
import { logStaffCreated } from "@/services/activityLog";

// ============================================================================
// GET /api/staff - List staff members
// ============================================================================()

export async function GET() {
  try {
    const currentUser = await requireAdmin();

    const db = getDb();

    const staffList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(sql`deleted_at IS NULL`)
      .orderBy(users.createdAt);

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    console.error("Get staff error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/staff - Create staff account
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAdmin();

    const body = await request.json();
    const { email, name, password, role = "staff" } = body;

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { success: false, error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters with letters and numbers",
        },
        { status: 400 }
      );
    }

    if (!["admin", "staff"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be 'admin' or 'staff'" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, email),
          sql`deleted_at IS NOT NULL AND email = ${email}` // Check soft deleted too
        )
      )
      .limit(1);

    if (existing) {
      // If soft deleted, restore instead
      if (existing.deletedAt) {
        const passwordHash = await hashPassword(password);
        const [restored] = await db
          .update(users)
          .set({
            name,
            passwordHash,
            role,
            isActive: true,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        return NextResponse.json({
          success: true,
          data: {
            id: restored.id,
            email: restored.email,
            name: restored.name,
            role: restored.role,
          },
        }, { status: 201 });
      }

      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        role,
        isActive: true,
      })
      .returning();

    // Remove password hash from response
    const { passwordHash: _, ...userResponse } = newUser;

    // Log activity
    await logStaffCreated(currentUser.id!, newUser.id, newUser.email, newUser.role!);

    return NextResponse.json({
      success: true,
      data: userResponse,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    console.error("Create staff error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
