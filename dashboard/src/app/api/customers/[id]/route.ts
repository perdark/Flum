/**
 * Customer API Routes
 *
 * GET /api/customers/[id] - Get customer
 * PUT /api/customers/[id] - Update customer
 * DELETE /api/customers/[id] - Delete customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq } from "drizzle-orm";

// GET /api/customers/[id] - Get customer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, params.id),
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_STAFF);

    const body = await request.json();
    const { name, phone, type, businessName, taxId, status } = body;

    const db = getDb();

    // Check if customer exists
    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, params.id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Update customer
    const [updated] = await db
      .update(customers)
      .set({
        name: name?.trim() || existing.name,
        phone: phone?.trim() || null,
        type: type || existing.type,
        businessName: businessName?.trim() || null,
        taxId: taxId?.trim() || null,
        status: status || existing.status,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
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
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Update customer error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_STAFF);

    const db = getDb();

    // Soft delete by setting deletedAt
    await db
      .update(customers)
      .set({
        deletedAt: new Date(),
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(customers.id, params.id));

    return NextResponse.json({
      success: true,
      data: { message: "Customer deleted successfully" },
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
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Delete customer error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
