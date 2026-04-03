import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, sql } from "drizzle-orm";
import {
  countCodesForFieldWithSchema,
  countCodesInRowWithSchema,
  getTemplateFieldsForCodes,
  type FieldSchemaForCodes,
} from "@/lib/inventoryCodes";
import { manualSellInventoryCondition } from "@/lib/inventoryManualSellFilters";

/** Per-field: lines = inventory rows with that field filled; codes = atomic values (respects wholeFieldIsOneItem). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id: templateId } = await params;
    const { searchParams } = new URL(request.url);
    const poolAvailableOnly = searchParams.get("pool") === "available";

    const db = getDb();

    const [template] = await db
      .select({ fieldsSchema: inventoryTemplates.fieldsSchema })
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, templateId), sql`${inventoryTemplates.deletedAt} IS NULL`))
      .limit(1);

    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const fieldDefs = getTemplateFieldsForCodes(
      Array.isArray(template.fieldsSchema) ? (template.fieldsSchema as FieldSchemaForCodes[]) : []
    );

    const baseConditions = [
      eq(inventoryItems.templateId, templateId),
      sql`${inventoryItems.deletedAt} IS NULL`,
    ];

    if (poolAvailableOnly) {
      baseConditions.push(eq(inventoryItems.status, "available"));
    } else {
      baseConditions.push(manualSellInventoryCondition(user.id));
    }

    const items = await db
      .select({ values: inventoryItems.values })
      .from(inventoryItems)
      .where(and(...baseConditions));

    const fields: Record<string, { lines: number; codes: number }> = {};
    for (const f of fieldDefs) {
      const name = f.name;
      let lines = 0;
      let codes = 0;
      for (const row of items) {
        const vals = row.values as Record<string, unknown>;
        const c = countCodesForFieldWithSchema(vals, f);
        if (c > 0) {
          lines += 1;
          codes += c;
        }
      }
      fields[name] = { lines, codes };
    }

    let totalCodes = 0;
    for (const row of items) {
      const vals = row.values as Record<string, unknown>;
      totalCodes += countCodesInRowWithSchema(vals, fieldDefs);
    }

    return NextResponse.json({
      success: true,
      data: {
        fields,
        totalCodes,
        totalRows: items.length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("field-code-stats error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
