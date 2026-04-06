/**
 * GET /api/inventory/catalog-products — flat list of inventory products (catalog SKUs) with stock stats
 */

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryCatalogItems, inventoryItems, inventoryTemplates } from "@/db/schema";
import { hasPermission, requireAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  countCodesInRowWithSchema,
  getTemplateFieldsForCodes,
  maxBundlesPeelableFromRow,
  type FieldSchemaForCodes,
} from "@/lib/inventoryCodes";

export async function GET() {
  try {
    const user = await requireAuth();
    if (
      !hasPermission(user, PERMISSIONS.MANAGE_INVENTORY) &&
      !hasPermission(user, PERMISSIONS.PROCESS_ORDERS)
    ) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const db = getDb();

    const catalogRows = await db
      .select({
        id: inventoryCatalogItems.id,
        templateId: inventoryCatalogItems.templateId,
        name: inventoryCatalogItems.name,
        sortOrder: inventoryCatalogItems.sortOrder,
        definingValues: inventoryCatalogItems.definingValues,
        defaultValues: inventoryCatalogItems.defaultValues,
        isActive: inventoryCatalogItems.isActive,
        templateName: inventoryTemplates.name,
        templateDescription: inventoryTemplates.description,
        templateColor: inventoryTemplates.color,
        templateIcon: inventoryTemplates.icon,
        templateIsActive: inventoryTemplates.isActive,
        fieldsSchema: inventoryTemplates.fieldsSchema,
        multiSellEnabled: inventoryTemplates.multiSellEnabled,
        multiSellMax: inventoryTemplates.multiSellMax,
        cooldownEnabled: inventoryTemplates.cooldownEnabled,
        cooldownDurationHours: inventoryTemplates.cooldownDurationHours,
      })
      .from(inventoryCatalogItems)
      .innerJoin(inventoryTemplates, eq(inventoryCatalogItems.templateId, inventoryTemplates.id))
      .where(and(isNull(inventoryCatalogItems.deletedAt), isNull(inventoryTemplates.deletedAt)))
      .orderBy(inventoryTemplates.name, inventoryCatalogItems.sortOrder, inventoryCatalogItems.name);

    if (catalogRows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const fieldsByTemplate = new Map<string, FieldSchemaForCodes[]>();
    for (const c of catalogRows) {
      if (!fieldsByTemplate.has(c.templateId)) {
        fieldsByTemplate.set(
          c.templateId,
          getTemplateFieldsForCodes(
            Array.isArray(c.fieldsSchema) ? (c.fieldsSchema as FieldSchemaForCodes[]) : []
          )
        );
      }
    }

    const catalogIds = catalogRows.map((c) => c.id);
    const invRows = await db
      .select({
        catalogItemId: inventoryItems.catalogItemId,
        templateId: inventoryItems.templateId,
        values: inventoryItems.values,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.status, "available"),
          isNull(inventoryItems.deletedAt),
          inArray(inventoryItems.catalogItemId, catalogIds)
        )
      );

    const codesByCatalogItem = new Map<string, number>();
    const stockRowsByCatalogItem = new Map<string, number>();
    const availableQtyByCatalogItem = new Map<string, number>();
    for (const row of invRows) {
      const cid = row.catalogItemId;
      const tid = row.templateId;
      if (!cid || !tid) continue;
      const fieldDefs = fieldsByTemplate.get(tid);
      if (!fieldDefs?.length) continue;
      const vals = row.values as Record<string, unknown>;
      const add = countCodesInRowWithSchema(vals, fieldDefs);
      if (add === 0) continue;
      codesByCatalogItem.set(cid, (codesByCatalogItem.get(cid) ?? 0) + add);
      stockRowsByCatalogItem.set(cid, (stockRowsByCatalogItem.get(cid) ?? 0) + 1);
      const bundles = maxBundlesPeelableFromRow(vals, fieldDefs);
      if (bundles > 0) {
        availableQtyByCatalogItem.set(cid, (availableQtyByCatalogItem.get(cid) ?? 0) + bundles);
      }
    }

    const data = catalogRows.map((c) => ({
      id: c.id,
      templateId: c.templateId,
      templateName: c.templateName,
      templateDescription: c.templateDescription,
      templateColor: c.templateColor,
      templateIcon: c.templateIcon,
      templateIsActive: c.templateIsActive,
      fieldsSchema: c.fieldsSchema,
      multiSellEnabled: c.multiSellEnabled,
      multiSellMax: c.multiSellMax,
      cooldownEnabled: c.cooldownEnabled,
      cooldownDurationHours: c.cooldownDurationHours,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      definingValues: c.definingValues,
      defaultValues: c.defaultValues,
      codesCount: codesByCatalogItem.get(c.id) ?? 0,
      stockCount: stockRowsByCatalogItem.get(c.id) ?? 0,
      /** Sellable units (bundles: one code per field), same basis as reserve-bundles */
      availableQty: availableQtyByCatalogItem.get(c.id) ?? 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("catalog-products GET:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
