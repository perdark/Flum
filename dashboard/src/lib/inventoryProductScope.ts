/**
 * Inventory rows allocated to a product via primary `inventory_items.product_id`.
 */

import { sql } from "drizzle-orm";

/** WHERE fragment: `inventory_items` row is sellable for this product. */
export function sqlInventoryRowsForProduct(productId: string, inventoryCatalogItemId?: string | null) {
  if (inventoryCatalogItemId) {
    return sql`(inventory_items.product_id = ${productId} AND inventory_items.catalog_item_id = ${inventoryCatalogItemId})`;
  }
  return sql`(inventory_items.product_id = ${productId})`;
}

/** Correlate to outer `products.id` in SELECT subqueries (products summary, etc.) */
export function sqlInventoryItemsCorrelatedToProducts() {
  return sql`(inventory_items.product_id = products.id AND (
    products.inventory_catalog_item_id IS NULL
    OR inventory_items.catalog_item_id = products.inventory_catalog_item_id
  ))`;
}
