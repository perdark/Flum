/**
 * Stock Validation Service
 *
 * Provides logic for detecting stock mismatches across linked field pairs.
 * For example: if email and password are linked, alerts when counts don't match.
 */

import { getDb } from "@/db";
import { inventoryItems, inventoryTemplates, products, productVariants } from "@/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { sqlInventoryRowsForProduct } from "@/lib/inventoryProductScope";
import type {
  StockAvailability,
  StockMismatchField,
  StockMismatchAlert,
  InventoryFieldDefinition,
  StockVariantAvailabilitySlice,
} from "@/types";

/**
 * Get field counts for available inventory items of a product/template
 */
async function getFieldCounts(
  productId?: string,
  templateId?: string,
  variantId?: string | null
): Promise<Record<string, number>> {
  const db = getDb();

  let catalogItemId: string | null = null;
  if (productId) {
    const [p] = await db
      .select({ inventoryCatalogItemId: products.inventoryCatalogItemId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    catalogItemId = p?.inventoryCatalogItemId ?? null;
  }

  const conditions = [
    sql`${inventoryItems.status} = 'available'`,
    sql`${inventoryItems.deletedAt} IS NULL`,
  ];

  if (productId) {
    conditions.push(sqlInventoryRowsForProduct(productId, catalogItemId));
  }
  if (templateId) {
    conditions.push(eq(inventoryItems.templateId, templateId));
  }
  if (variantId !== undefined) {
    if (variantId === null) {
      conditions.push(isNull(inventoryItems.variantId));
    } else {
      conditions.push(eq(inventoryItems.variantId, variantId));
    }
  }

  const items = await db
    .select({ values: inventoryItems.values })
    .from(inventoryItems)
    .where(and(...conditions));

  // Count occurrences of each field value
  const fieldCounts: Record<string, number> = {};

  for (const item of items) {
    const values = item.values as Record<string, unknown>;
    if (values) {
      for (const [key, value] of Object.entries(values)) {
        if (key === "_metadata") continue;
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          fieldCounts[key] = (fieldCounts[key] || 0) + 1;
        }
      }
    }
  }

  return fieldCounts;
}

function buildAvailabilitySlice(
  fields: InventoryFieldDefinition[],
  fieldCounts: Record<string, number>,
  variantId: string | null
): StockVariantAvailabilitySlice {
  const linkGroups: Record<string, { fields: string[]; minCount: number }> = {};
  const mismatches: StockMismatchField[] = [];

  for (const field of fields) {
    if (field.linkGroup) {
      if (!linkGroups[field.linkGroup]) {
        linkGroups[field.linkGroup] = { fields: [], minCount: Infinity };
      }
      linkGroups[field.linkGroup].fields.push(field.name);
      const count = fieldCounts[field.name] || 0;
      linkGroups[field.linkGroup].minCount = Math.min(
        linkGroups[field.linkGroup].minCount,
        count
      );
    }
  }

  for (const group of Object.values(linkGroups)) {
    for (const fieldName of group.fields) {
      const count = fieldCounts[fieldName] || 0;
      if (count !== group.minCount) {
        const field = fields.find((f) => f.name === fieldName);
        mismatches.push({
          fieldName,
          fieldLabel: field?.label || fieldName,
          totalCount: count,
          linkedFieldName: field?.linkedTo || null,
          linkedFieldTotalCount: field?.linkedTo
            ? fieldCounts[field.linkedTo] || 0
            : null,
          unmatchedCount: count - group.minCount,
        });
      }
    }
  }

  let sellableQuantity = Infinity;
  for (const group of Object.values(linkGroups)) {
    sellableQuantity = Math.min(sellableQuantity, group.minCount);
  }

  const unlinkedFields = fields.filter((f) => !f.linkGroup && !f.linkedTo);
  if (unlinkedFields.length > 0) {
    const totalAvailable =
      Object.values(fieldCounts).length > 0 ? Math.min(...Object.values(fieldCounts)) : 0;
    sellableQuantity = Math.min(sellableQuantity, totalAvailable);
  }

  if (sellableQuantity === Infinity) {
    sellableQuantity = 0;
  }

  return {
    variantId,
    sellableQuantity,
    fieldCounts,
    linkedGroups: linkGroups,
    hasMismatch: mismatches.length > 0,
    mismatches,
  };
}

/**
 * Analyze stock availability for a template or product
 * Detects mismatches in linked pairs
 */
export async function analyzeStockAvailability(
  productId?: string,
  templateId?: string,
  variantId?: string
): Promise<StockAvailability | null> {
  const db = getDb();

  // Get template info
  let template;
  if (templateId) {
    [template] = await db
      .select()
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.id, templateId))
      .limit(1);
  } else if (productId) {
    const [product] = await db
      .select({ templateId: products.inventoryTemplateId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product?.templateId) {
      [template] = await db
        .select()
        .from(inventoryTemplates)
        .where(eq(inventoryTemplates.id, product.templateId))
        .limit(1);
    }
  }

  if (!template) {
    return null;
  }

  const fields = template.fieldsSchema as InventoryFieldDefinition[];

  let variantBreakdown: StockVariantAvailabilitySlice[] | undefined;

  if (productId && variantId === undefined) {
    const vrows = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    if (vrows.length > 1) {
      variantBreakdown = [];
      for (const row of vrows) {
        const fc = await getFieldCounts(productId, template.id, row.id);
        variantBreakdown.push(buildAvailabilitySlice(fields, fc, row.id));
      }
      const fcUnassigned = await getFieldCounts(productId, template.id, null);
      const hasUnassigned = Object.values(fcUnassigned).some((n) => n > 0);
      if (hasUnassigned) {
        variantBreakdown.push(buildAvailabilitySlice(fields, fcUnassigned, null));
      }
    }
  }

  const fieldCounts = await getFieldCounts(productId, template.id, variantId);
  const slice = buildAvailabilitySlice(fields, fieldCounts, variantId ?? null);

  return {
    templateId: template.id,
    productId: productId || null,
    fieldCounts: slice.fieldCounts,
    linkedGroups: slice.linkedGroups,
    sellableQuantity: slice.sellableQuantity,
    hasMismatch: slice.hasMismatch,
    mismatches: slice.mismatches,
    variantBreakdown,
  };
}

/**
 * Get mismatch alerts for all templates with linked fields
 */
export async function getAllMismatchAlerts(): Promise<StockMismatchAlert[]> {
  const db = getDb();

  // Get all templates that have linked fields
  const templates = await db
    .select({
      id: inventoryTemplates.id,
      name: inventoryTemplates.name,
      fieldsSchema: inventoryTemplates.fieldsSchema,
    })
    .from(inventoryTemplates)
    .where(sql`${inventoryTemplates.deletedAt} IS NULL`);

  const alerts: StockMismatchAlert[] = [];

  for (const template of templates) {
    const fields = template.fieldsSchema as InventoryFieldDefinition[];
    const hasLinkedFields = fields.some((f) => f.linkedTo || f.linkGroup);

    if (!hasLinkedFields) continue;

    const availability = await analyzeStockAvailability(undefined, template.id);
    if (availability && availability.hasMismatch) {
      // Get products using this template
      const productsUsing = await db
        .select({
          id: products.id,
          name: products.name,
        })
        .from(products)
        .where(eq(products.inventoryTemplateId, template.id));

      const severity: "info" | "warning" | "error" =
        availability.sellableQuantity === 0 ? "error" : "warning";

      if (productsUsing.length > 0) {
        for (const product of productsUsing) {
          alerts.push({
            templateId: template.id,
            templateName: template.name,
            stockTypeName: null,
            productId: product.id,
            productName: product.name,
            fields: availability.mismatches,
            sellableQuantity: availability.sellableQuantity,
            totalAvailable: Math.round(
              Object.values(availability.fieldCounts).reduce((s, c) => s + c, 0) /
                Math.max(fields.length, 1)
            ),
            severity,
          });
        }
      } else {
        alerts.push({
          templateId: template.id,
          templateName: template.name,
          stockTypeName: null,
          productId: null,
          productName: null,
          fields: availability.mismatches,
          sellableQuantity: availability.sellableQuantity,
          totalAvailable: Math.round(
            Object.values(availability.fieldCounts).reduce((s, c) => s + c, 0) /
              Math.max(fields.length, 1)
          ),
          severity,
        });
      }
    }
  }

  return alerts;
}

/**
 * Check if a requested quantity can be sold for a product
 * Takes linked pair constraints into account
 */
export async function canSellQuantity(
  productId: string,
  quantity: number,
  variantId?: string
): Promise<{ canSell: boolean; available: number; mismatches: StockMismatchField[] }> {
  const availability = await analyzeStockAvailability(productId, undefined, variantId);

  if (!availability) {
    return { canSell: false, available: 0, mismatches: [] };
  }

  return {
    canSell: availability.sellableQuantity >= quantity,
    available: availability.sellableQuantity,
    mismatches: availability.mismatches,
  };
}
