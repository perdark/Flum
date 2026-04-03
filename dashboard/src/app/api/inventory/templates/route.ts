/**
 * Inventory Templates API Routes
 *
 * GET /api/inventory/templates - List all inventory templates
 * POST /api/inventory/templates - Create a new template
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryTemplates, inventoryItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, sql, and } from "drizzle-orm";
import { countCodesInRowWithSchema, getTemplateFieldsForCodes, type FieldSchemaForCodes } from "@/lib/inventoryCodes";

// ============================================================================
// GET /api/inventory/templates - List templates
// ============================================================================()

export async function GET() {
  try {
    const db = getDb();

    const templates = await db
      .select({
        id: inventoryTemplates.id,
        name: inventoryTemplates.name,
        description: inventoryTemplates.description,
        fieldsSchema: inventoryTemplates.fieldsSchema,
        isActive: inventoryTemplates.isActive,
        multiSellEnabled: inventoryTemplates.multiSellEnabled,
        multiSellMax: inventoryTemplates.multiSellMax,
        cooldownEnabled: inventoryTemplates.cooldownEnabled,
        cooldownDurationHours: inventoryTemplates.cooldownDurationHours,
        color: inventoryTemplates.color,
        icon: inventoryTemplates.icon,
        createdAt: inventoryTemplates.createdAt,
        updatedAt: inventoryTemplates.updatedAt,
        stockCount: sql<number>`(
          SELECT COUNT(*)::int FROM inventory_items 
          WHERE inventory_items.template_id = ${inventoryTemplates.id} 
            AND inventory_items.status = 'available'
            AND inventory_items.deleted_at IS NULL
        )`,
      })
      .from(inventoryTemplates)
      .where(sql`${inventoryTemplates.deletedAt} IS NULL`)
      .orderBy(inventoryTemplates.createdAt);

    const invRows = await db
      .select({
        templateId: inventoryItems.templateId,
        values: inventoryItems.values,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.status, "available"),
          sql`${inventoryItems.deletedAt} IS NULL`,
          sql`${inventoryItems.templateId} IS NOT NULL`
        )
      );

    const fieldsByTemplate = new Map<string, FieldSchemaForCodes[]>();
    for (const t of templates) {
      fieldsByTemplate.set(
        t.id,
        getTemplateFieldsForCodes(Array.isArray(t.fieldsSchema) ? (t.fieldsSchema as FieldSchemaForCodes[]) : [])
      );
    }

    const codesByTemplate = new Map<string, number>();
    for (const row of invRows) {
      const tid = row.templateId;
      if (!tid) continue;
      const fieldDefs = fieldsByTemplate.get(tid);
      if (!fieldDefs?.length) continue;
      const vals = row.values as Record<string, unknown>;
      const add = countCodesInRowWithSchema(vals, fieldDefs);
      if (add === 0) continue;
      codesByTemplate.set(tid, (codesByTemplate.get(tid) ?? 0) + add);
    }

    const data = templates.map((t) => ({
      ...t,
      codesCount: codesByTemplate.get(t.id) ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data,
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
        multiSellEnabled: multiSellEnabled ?? false,
        multiSellMax: multiSellMax ?? 5,
        cooldownEnabled: cooldownEnabled ?? false,
        cooldownDurationHours: cooldownDurationHours ?? 12,
        color: color || null,
        icon: icon || null,
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
