/**
 * Inventory Templates API Routes - Single Template
 *
 * PUT /api/inventory/templates/[id] - Update a template
 * DELETE /api/inventory/templates/[id] - Delete a template (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryTemplates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

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
    const { name, description, fieldsSchema } = body;

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

    // Update template
    const [updated] = await db
      .update(inventoryTemplates)
      .set({
        name,
        description,
        fieldsSchema,
        updatedAt: new Date(),
      })
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
