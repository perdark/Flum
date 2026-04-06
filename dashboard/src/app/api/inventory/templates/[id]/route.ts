/**
 * Inventory Templates API Routes - Single Template
 *
 * PUT /api/inventory/templates/[id] - Update a template
 * DELETE /api/inventory/templates/[id] - Delete a template (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryTemplates } from "@/db/schema";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, isNull } from "drizzle-orm";

// ============================================================================
// GET /api/inventory/templates/[id] - Single template (schema only)
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await params;
    const db = getDb();
    const [row] = await db
      .select()
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, id), isNull(inventoryTemplates.deletedAt)))
      .limit(1);
    if (!row) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Get template error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/inventory/templates/[id] - Update template
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, description, fieldsSchema, multiSellEnabled, multiSellMax, cooldownEnabled, cooldownDurationHours, color, icon } = body;

    // Validate input
    if (!name || !fieldsSchema) {
      return NextResponse.json(
        { success: false, error: "Name and fieldsSchema are required" },
        { status: 400 }
      );
    }

    // Validate fieldsSchema structure
    if (!Array.isArray(fieldsSchema) || fieldsSchema.length === 0) {
      return NextResponse.json(
        { success: false, error: "fieldsSchema must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each field definition
    for (const field of fieldsSchema) {
      if (!field.name || !field.type || field.required === undefined) {
        return NextResponse.json(
          { success: false, error: "Each field must have name, type, and required" },
          { status: 400 }
        );
      }
    }

    // Validate linked pair references
    const fieldNames = new Set(fieldsSchema.map((f: any) => f.name));
    for (const field of fieldsSchema) {
      if (field.linkedTo && !fieldNames.has(field.linkedTo)) {
        return NextResponse.json(
          { success: false, error: `Linked field "${field.linkedTo}" not found in fieldsSchema` },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Check if template exists
    const [existing] = await db
      .select()
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if name is unique (excluding current template)
    const [nameConflict] = await db
      .select()
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.name, name))
      .limit(1);

    if (nameConflict && nameConflict.id !== id) {
      return NextResponse.json(
        { success: false, error: "Template with this name already exists" },
        { status: 409 }
      );
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (fieldsSchema !== undefined) updateData.fieldsSchema = fieldsSchema;
    if (multiSellEnabled !== undefined) updateData.multiSellEnabled = multiSellEnabled;
    if (multiSellMax !== undefined) updateData.multiSellMax = multiSellMax;
    if (cooldownEnabled !== undefined) updateData.cooldownEnabled = cooldownEnabled;
    if (cooldownDurationHours !== undefined) updateData.cooldownDurationHours = cooldownDurationHours;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    // Update template
    const [updated] = await db
      .update(inventoryTemplates)
      .set(updateData)
      .where(eq(inventoryTemplates.id, id))
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
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    console.error("Update template error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/inventory/templates/[id] - Delete template (soft delete)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const db = getDb();

    // Check if template exists
    const [existing] = await db
      .select()
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    const [deleted] = await db
      .update(inventoryTemplates)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryTemplates.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: deleted,
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

    console.error("Delete template error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
