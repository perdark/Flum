/**
 * Visibility rules for manual-sell / POS: staff can allocate "available" rows,
 * or rows they already hold as "reserved" (until TTL).
 */

import { and, eq, or, isNull, sql } from "drizzle-orm";
import { inventoryItems } from "@/db/schema";

/** Rows sellable for the current cashier (FIFO pool excluding other users' holds). */
export function manualSellInventoryCondition(userId: string) {
  return or(
    eq(inventoryItems.status, "available"),
    and(
      eq(inventoryItems.status, "reserved"),
      eq(inventoryItems.reservedBy, userId),
      or(isNull(inventoryItems.reservedUntil), sql`${inventoryItems.reservedUntil} > NOW()`)
    )
  )!;
}
