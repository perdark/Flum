/**
 * Inventory Templates API Routes
 *
 * GET /api/inventory/templates - List all inventory templates
 * POST /api/inventory/templates - Create a new template
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryTemplates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// GET /api/inventory/templates - List templates
// ============================================================================()

export async function GET() {
  try {
    const db = getDb();

    const templates = await db
      .select()
      .from(inventoryTemplates)
      .where(sql`deleted_at IS NULL`)
      .orderBy(inventoryTemplates.createdAt);

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/inventory/templates - Create template
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

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

    // Check if name is unique
    const [existing] = await db
      .select()
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.name, name))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Template with this name already exists" },
        { status: 409 }
      );
    }

    // Create template
    const [template] = await db
      .insert(inventoryTemplates)
      .values({
        name,
        description,
        fieldsSchema,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: template,
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

    console.error("Create template error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
