/**
 * Bundle Service
 *
 * Handles bundle products with nested items and field-based grouping
 */

import { getDb } from "@/db";
import { bundleItems, products, inventoryTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { BundleItem, TemplateField } from "@/types";

/**
 * Get bundle composition with field grouping
 */
export async function getBundleComposition(
  bundleProductId: string
): Promise<Record<string, BundleItem[]>> {
  const db = getDb();
  const items = await db.query.bundleItems.findMany({
    where: eq(bundleItems.bundleProductId, bundleProductId),
    with: {
      product: true,
    },
  });

  // Group by template field
  const grouped: Record<string, BundleItem[]> = {};
  for (const item of items) {
    if (!grouped[item.templateFieldId]) {
      grouped[item.templateFieldId] = [];
    }
    grouped[item.templateFieldId].push({
      ...item,
      productId: item.productId ?? undefined,
    } as BundleItem);
  }

  return grouped;
}

/**
 * Check if bundle field is configured for per-line product handling
 */
export function isFieldPerProduct(
  templateFields: TemplateField[],
  fieldId: string
): boolean {
  const field = templateFields.find((f) => f.name === fieldId);
  return field?.eachLineIsProduct || false;
}

/**
 * Flatten bundle for order items based on template config
 */
export async function flattenBundleForOrder(
  bundleProductId: string,
  templateFields: TemplateField[]
): Promise<
  Array<{ productId: string; quantity: number; bundlePath: string }>
> {
  const composition = await getBundleComposition(bundleProductId);
  const orderItems: Array<{
    productId: string;
    quantity: number;
    bundlePath: string;
  }> = [];

  for (const [fieldId, items] of Object.entries(composition)) {
    const isPerProduct = isFieldPerProduct(templateFields, fieldId);

    if (isPerProduct) {
      // Each line is a separate product
      for (const item of items) {
        if (!item.productId) continue; // Skip lines without a linked product
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          bundlePath: `${fieldId}[${item.lineIndex}]`,
        });
      }
    } else {
      // Whole field — expand each item as its own product
      for (const item of items) {
        if (!item.productId) continue;
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          bundlePath: `${fieldId}[${item.lineIndex}]`,
        });
      }
    }
  }

  return orderItems;
}

/**
 * Add item to bundle
 */
export async function addBundleItem(data: {
  bundleProductId: string;
  templateFieldId: string;
  lineIndex: number;
  productId?: string;
  productName: string;
  quantity: number;
  priceOverride?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const db = getDb();
  const result = await db.insert(bundleItems).values({
    ...data,
    createdAt: new Date(),
  }).returning();

  return result[0].id;
}

/**
 * Update bundle item
 */
export async function updateBundleItem(
  itemId: string,
  data: Partial<{
    templateFieldId: string;
    lineIndex: number;
    productId: string;
    productName: string;
    quantity: number;
    priceOverride: string;
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const db = getDb();
  await db
    .update(bundleItems)
    .set(data)
    .where(eq(bundleItems.id, itemId));
}

/**
 * Remove bundle item
 */
export async function removeBundleItem(itemId: string): Promise<void> {
  const db = getDb();
  await db.delete(bundleItems).where(eq(bundleItems.id, itemId));
}

/**
 * Get all items for a bundle
 */
export async function getBundleItems(bundleProductId: string) {
  const db = getDb();
  return db.query.bundleItems.findMany({
    where: eq(bundleItems.bundleProductId, bundleProductId),
    with: {
      product: true,
    },
    orderBy: (items, { asc }) => [asc(items.templateFieldId), asc(items.lineIndex)],
  });
}

/**
 * Clear all items from a bundle
 */
export async function clearBundleItems(bundleProductId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(bundleItems)
    .where(eq(bundleItems.bundleProductId, bundleProductId));
}

/**
 * Get bundle price total
 */
export async function getBundleTotal(bundleProductId: string): Promise<number> {
  const db = getDb();
  const bundle = await db.query.products.findFirst({
    where: eq(products.id, bundleProductId),
  });

  if (!bundle) return 0;

  // If bundle has its own price, use it
  if (bundle.basePrice) {
    return parseFloat(bundle.basePrice.toString());
  }

  // Otherwise sum up item prices
  const items = await getBundleItems(bundleProductId);
  const total = items.reduce((sum, item) => {
    const bi = item as {
      priceOverride: unknown;
      product?: { basePrice: unknown } | null;
      quantity: number;
    };
    const price = bi.priceOverride
      ? parseFloat(String(bi.priceOverride))
      : bi.product
        ? parseFloat(String(bi.product.basePrice))
        : 0;
    return sum + price * bi.quantity;
  }, 0);

  return total;
}

/**
 * Validate bundle structure against template
 */
export async function validateBundleStructure(
  bundleProductId: string,
  templateId: string
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const db = getDb();
  const template = await db.query.inventoryTemplates.findFirst({
    where: eq(inventoryTemplates.id, templateId),
  });

  if (!template) {
    return { valid: false, errors: ["Template not found"] };
  }

  const items = await getBundleItems(bundleProductId);
  const errors: string[] = [];

  // Check required fields
  const requiredFields = template.fieldsSchema.filter(
    (f) => f.required && f.isVisibleToAdmin
  );

  for (const field of requiredFields) {
    const fieldItems = items.filter((i) => i.templateFieldId === field.name);
    if (fieldItems.length === 0) {
      errors.push(`Required field "${field.label}" is empty`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clone bundle structure from one product to another
 */
export async function cloneBundleStructure(
  sourceProductId: string,
  targetProductId: string
): Promise<void> {
  const sourceItems = await getBundleItems(sourceProductId);

  for (const item of sourceItems) {
    await addBundleItem({
      bundleProductId: targetProductId,
      templateFieldId: item.templateFieldId,
      lineIndex: item.lineIndex,
      productId: item.productId ?? undefined,
      productName: item.productName,
      quantity: item.quantity,
      priceOverride: item.priceOverride?.toString(),
      metadata: item.metadata as Record<string, unknown>,
    });
  }
}
