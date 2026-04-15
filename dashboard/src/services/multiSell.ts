/**
 * Multi-Sell Cooldown Service
 *
 * Manages inventory items that can be sold multiple times before entering cooldown
 * Uses inventory_items table with multi_sell_* fields
 */

import { getDb } from "@/db";
import { inventoryItems, products } from "@/db/schema";
import { eq, and, lt, isNull, or, sql } from "drizzle-orm";
import { sqlInventoryRowsForProduct } from "@/lib/inventoryProductScope";

export interface MultiSellConfig {
  productId: string;
  maxSales: number;
  cooldownHours: number;
}

export interface AvailableUnit {
  id: string;
  values: Record<string, unknown>;
  saleCount: number;
  maxSales: number;
  status: string;
}

/**
 * Get virtual stock count for multi-sell product
 */
export async function getVirtualStock(productId: string): Promise<number> {
  const db = getDb();
  const [p] = await db
    .select({ inventoryCatalogItemId: products.inventoryCatalogItemId })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const cid = p?.inventoryCatalogItemId ?? null;
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN status = 'available' AND COALESCE(multi_sell_enabled, false) = false THEN 1
        WHEN status = 'available' AND COALESCE(multi_sell_enabled, false) = true
          AND COALESCE(multi_sell_sale_count, 0) < COALESCE(multi_sell_max, 5)
          AND (cooldown_until IS NULL OR cooldown_until <= NOW())
        THEN GREATEST(0, COALESCE(multi_sell_max, 5) - COALESCE(multi_sell_sale_count, 0))
        WHEN status = 'in_cooldown' AND cooldown_until IS NOT NULL AND cooldown_until <= NOW()
        THEN COALESCE(multi_sell_max, 5)
        ELSE 0
      END
    ), 0)::int AS n
    FROM inventory_items
    WHERE ${sqlInventoryRowsForProduct(productId, cid)}
      AND deleted_at IS NULL
  `);
  const row = r.rows[0] as { n: number } | undefined;
  return row?.n ?? 0;
}

/**
 * Get cooldown status for display
 */
export function getCooldownDisplay(cooldownUntil: Date | null): string | null {
  if (!cooldownUntil || new Date(cooldownUntil) < new Date()) {
    return null;
  }

  const hours = Math.ceil(
    (new Date(cooldownUntil).getTime() - Date.now()) / (1000 * 60 * 60)
  );

  if (hours < 1) {
    const minutes = Math.ceil(
      (new Date(cooldownUntil).getTime() - Date.now()) / (1000 * 60)
    );
    return `Available in ${minutes} minutes`;
  }

  return `Available in ${hours} hour${hours === 1 ? "" : "s"}`;
}
