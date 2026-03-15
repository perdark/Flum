/**
 * Inventory Batches API
 *
 * GET /api/inventory/batches - List batches
 * POST /api/inventory/batches - Create a new batch
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryBatches, inventoryItems, products, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

// ============================================================================
// GET /api/inventory/batches - List batches
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryBatches)
      .where(sql`${inventoryBatches.deletedAt} IS NULL`);

    const total = countResult[0]?.count || 0;

    // Get batches with item counts
    const batches = await db
      .select({
        id: inventoryBatches.id,
        name: inventoryBatches.name,
        source: inventoryBatches.source,
        notes: inventoryBatches.notes,
        createdBy: inventoryBatches.createdBy,
        createdAt: inventoryBatches.createdAt,
        createdByName: users.name,
        // Count items in this batch
        itemCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM inventory_items
          WHERE inventory_items.batch_id = inventory_batches.id
            AND inventory_items.deleted_at IS NULL
        )`,
      })
      .from(inventoryBatches)
      .leftJoin(users, eq(inventoryBatches.createdBy, users.id))
      .where(sql`${inventoryBatches.deletedAt} IS NULL`)
      .orderBy(desc(inventoryBatches.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    console.error("Get batches error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/inventory/batches - Create batch
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const { name, source, notes } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [newBatch] = await db
      .insert(inventoryBatches)
      .values({
        name: name.trim(),
        source: source || null,
        notes: notes || null,
        createdBy: user.id,
      })
      .returning();

    // Log activity
    await logActivity({
      userId: user.id,
      action: "batch_created",
      entity: "inventory_batch",
      entityId: newBatch.id,
      metadata: { name: newBatch.name, source },
    });

    return NextResponse.json({
      success: true,
      data: newBatch,
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

    console.error("Create batch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
