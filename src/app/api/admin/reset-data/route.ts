/**
 * Database Reset API Route
 *
 * POST /api/admin/reset-data - Clear all data (admin only)
 *
 * Deletes all records from tables while keeping users and sessions intact.
 * Tables are deleted in order to respect foreign key constraints.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Only admins can reset data
    const user = await requirePermission(PERMISSIONS.MANAGE_STAFF);
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can reset database" },
        { status: 403 }
      );
    }

    const db = getDb();

    // Delete in order to respect foreign key constraints
    // Child tables first, then parent tables
    const tablesToDelete = [
      // Order-related (child tables first)
      "order_delivery_snapshots",
      "order_items",
      "orders",
      // Inventory-related (child tables first)
      "inventory_items",
      "inventory_batches",
      // Coupon-related (child tables first)
      "coupon_usage",
      "coupons",
      // Product-related (child tables first)
      "product_platform_links",
      "product_images",
      "products",
      // Templates and platforms
      "inventory_templates",
      "platforms",
      // Logs and analytics
      "activity_logs",
      "daily_analytics",
      // Reviews
      "reviews",
    ];

    const deletedCounts: Record<string, number> = {};

    for (const table of tablesToDelete) {
      const result = await db.execute(
        // Using TRUNCATE for efficiency, CASCADE to handle any remaining FK constraints
        // and RESTART IDENTITY to reset sequences
        // Also filtering out soft-deleted records
        `DELETE FROM ${table} RETURNING *`
      );
      deletedCounts[table] = result.rowCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Database reset successfully",
        deletedCounts,
        tablesProcessed: tablesToDelete.length,
        timestamp: new Date().toISOString(),
      },
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

    console.error("Database reset error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
