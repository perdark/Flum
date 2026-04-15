/**
 * Auto-fulfill storefront orders that are past the configured wait time,
 * only when inventory can fully satisfy the order (see canFulfillOrder).
 */

import { getDb } from "@/db";
import { orders, storeSettings } from "@/db/schema";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { canFulfillOrder, fulfillOrder } from "@/services/autoDelivery";

export type AutoFulfillResult = { processed: number; skipped: number; errors: string[] };

export async function processDueStorefrontAutoFulfill(limit = 40): Promise<AutoFulfillResult> {
  const db = getDb();
  const errors: string[] = [];
  let processed = 0;
  let skipped = 0;

  const [settings] = await db
    .select({ minutes: storeSettings.autoApproveTimeoutMinutes })
    .from(storeSettings)
    .limit(1);

  const timeoutMinutes = settings?.minutes ?? 0;
  if (!timeoutMinutes || timeoutMinutes <= 0) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const candidates = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      metadata: orders.metadata,
      fulfillmentStatus: orders.fulfillmentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        sql`orders.deleted_at IS NULL`,
        eq(orders.fulfillmentStatus, "pending"),
        sql`${orders.createdAt} <= ${cutoff}`,
        or(isNull(orders.holdUntil), sql`${orders.holdUntil} <= NOW()`)!
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  for (const o of candidates) {
    const meta = o.metadata as Record<string, unknown> | null;
    if (meta?.source !== "storefront") {
      skipped++;
      continue;
    }

    const can = await canFulfillOrder(o.id);
    if (!can) {
      skipped++;
      continue;
    }

    const result = await fulfillOrder(o.id);
    if (!result.success || result.fulfillmentStatus !== "delivered") {
      errors.push(
        `${o.orderNumber}: ${result.errors.length ? result.errors.join("; ") : result.fulfillmentStatus}`
      );
      continue;
    }

    await db
      .update(orders)
      .set({
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, o.id));

    processed++;
  }

  return { processed, skipped, errors };
}
