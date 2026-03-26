/**
 * Customers API Routes
 *
 * GET /api/customers - List customers
 * POST /api/customers - Create customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers, orders } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, like, or, desc, sql, and } from "drizzle-orm";

// GET /api/customers - List customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    if (type === "aggregate") {
      const aggConditions = [];
      if (search) {
        aggConditions.push(
          or(
            like(orders.customerName, `%${search}%`),
            like(orders.customerEmail, `%${search}%`)
          )!
        );
      }

      const countResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${orders.customerEmail})::int`,
        })
        .from(orders)
        .where(aggConditions.length > 0 ? and(...aggConditions) : undefined);

      const total = countResult[0]?.count || 0;

      const customersData = await db
        .select({
          email: orders.customerEmail,
          name: orders.customerName,
          orderCount: sql<number>`count(*)::int`,
          totalSpent: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
          lastOrderDate: sql<string>`MAX(${orders.createdAt})`,
        })
        .from(orders)
        .where(aggConditions.length > 0 ? and(...aggConditions) : undefined)
        .groupBy(orders.customerEmail, orders.customerName)
        .orderBy(desc(sql`MAX(${orders.createdAt})`))
        .limit(limit)
        .offset(offset);

      return NextResponse.json({
        success: true,
        data: customersData,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // Build query conditions
    const conditions = [sql`customers.deleted_at IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.businessName || "", `%${search}%`)
        )!
      );
    }

    if (type) {
      conditions.push(eq(customers.type, type));
    }

    if (status) {
      conditions.push(eq(customers.status, status));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Get customers
    const customersList = await db
      .select()
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: customersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create customer
export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_STAFF);

    const body = await request.json();
    const {
      email,
      name,
      phone,
      type = "retail",
      businessName,
      taxId,
      status = "active",
    } = body;

    // Validate input
    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: "Email and name are required" },
        { status: 400 }
      );
    }

    if (!["retail", "merchant"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be 'retail' or 'merchant'" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Customer with this email already exists" },
        { status: 409 }
      );
    }

    // Create customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        email: email.trim(),
        name: name.trim(),
        phone: phone?.trim() || null,
        type,
        businessName: businessName?.trim() || null,
        taxId: taxId?.trim() || null,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCustomer,
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
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Create customer error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
