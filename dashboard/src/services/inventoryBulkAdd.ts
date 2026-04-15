import { getDb } from "@/db";
import { inventoryItems, products, orders, orderItems, productVariants } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";

export function extractMultisell(row: Record<string, unknown>): {
  values: Record<string, unknown>;
  multiSellEnabled: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
} {
  const v = { ...row };
  const multiSellEnabled = Boolean(v.multiSellEnabled);
  const multiSellMax = Math.max(1, parseInt(String(v.multiSellMax ?? 5), 10) || 5);
  const cooldownEnabled = Boolean(v.cooldownEnabled);
  const cooldownDurationHours = Math.max(1, parseInt(String(v.cooldownDurationHours ?? 12), 10) || 12);
  delete v.multiSellEnabled;
  delete v.multiSellMax;
  delete v.cooldownEnabled;
  delete v.cooldownDurationHours;
  return {
    values: v,
    multiSellEnabled,
    multiSellMax,
    cooldownEnabled,
    cooldownDurationHours,
  };
}

export type BulkAddInventoryInput = {
  userId: string;
  productId: string;
  items: Record<string, unknown>[];
  cost?: string | null;
  eachLineIsProduct?: boolean;
  sellPendingFirst?: boolean;
  variantId?: string | null;
};

export type BulkAddInventoryResult = {
  product: { id: string; name: string; inventoryTemplateId: string | null };
  fulfilledOrders: string[];
  insertedItems: Array<Record<string, unknown>>;
};

export async function runBulkInventoryAdd(input: BulkAddInventoryInput): Promise<BulkAddInventoryResult> {
  const { userId, productId, items, cost, eachLineIsProduct, sellPendingFirst, variantId } = input;

  const db = getDb();

  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      inventoryTemplateId: products.inventoryTemplateId,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (variantId) {
    const [vrow] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .limit(1);
    if (!vrow) {
      throw new Error("VARIANT_INVALID");
    }
  }

  let fulfilledOrders: string[] = [];
  let itemsConsumed = 0;
  let insertedItems: Array<any> = [];

  await db.transaction(async (tx) => {
    if (sellPendingFirst) {
      const pendingOrderItems = await tx
        .select({
          orderId: orderItems.orderId,
          orderItemId: orderItems.id,
          quantity: orderItems.quantity,
          deliveredIds: orderItems.deliveredInventoryIds,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, productId),
            sql`${orders.deletedAt} IS NULL`,
            sql`(${orders.status} = 'pending' OR ${orders.fulfillmentStatus} = 'processing')`
          )
        );

      for (const pendingItem of pendingOrderItems) {
        const delivered = ((pendingItem.deliveredIds as string[]) || []).length;
        const stillNeeded = pendingItem.quantity - delivered;
        const toFulfill = Math.min(stillNeeded, items.length - itemsConsumed);

        if (toFulfill <= 0) {
          continue;
        }

        const soldItemIds: string[] = [];
        for (let j = 0; j < toFulfill; j++) {
          const raw = items[itemsConsumed + j] as Record<string, unknown>;
          const { values: baseVals, multiSellEnabled, multiSellMax, cooldownEnabled, cooldownDurationHours } =
            extractMultisell(raw);
          const valuesWithMetadata = {
            ...baseVals,
            _metadata: {
              eachLineIsProduct,
            },
          };
          const [inserted] = await tx
            .insert(inventoryItems)
            .values({
              productId,
              templateId: product.inventoryTemplateId || null,
              cost: cost || null,
              values: valuesWithMetadata,
              status: "sold",
              purchasedAt: new Date(),
              orderItemId: pendingItem.orderItemId,
              multiSellEnabled,
              multiSellMax,
              cooldownEnabled,
              cooldownDurationHours,
              variantId: variantId || null,
            })
            .returning();
          soldItemIds.push(inserted.id);
        }

        itemsConsumed += toFulfill;

        const updatedIds = [...((pendingItem.deliveredIds as string[]) || []), ...soldItemIds];
        await tx
          .update(orderItems)
          .set({
            deliveredInventoryIds: sql`${JSON.stringify(updatedIds)}::jsonb`,
          })
          .where(eq(orderItems.id, pendingItem.orderItemId));

        await tx
          .update(products)
          .set({
            totalSold: sql`${products.totalSold} + ${toFulfill}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));

        fulfilledOrders.push(pendingItem.orderId);

        const orderItemsForOrder = await tx
          .select({ quantity: orderItems.quantity, deliveredIds: orderItems.deliveredInventoryIds })
          .from(orderItems)
          .where(eq(orderItems.orderId, pendingItem.orderId));

        const allFulfilled = orderItemsForOrder.every((oi) => {
          const deliveredCt = ((oi.deliveredIds as string[]) || []).length;
          return deliveredCt >= oi.quantity;
        });

        if (allFulfilled) {
          await tx
            .update(orders)
            .set({
              status: "completed",
              fulfillmentStatus: "delivered",
              deliveredAt: new Date(),
              claimedBy: null,
              claimedAt: null,
              claimExpiresAt: null,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, pendingItem.orderId));
        }

        if (itemsConsumed >= items.length) {
          break;
        }
      }
    }

    const itemsToCreate = sellPendingFirst ? items.slice(itemsConsumed) : items;

    if (itemsToCreate.length > 0) {
      insertedItems = await tx
        .insert(inventoryItems)
        .values(
          itemsToCreate.map((row: Record<string, unknown>) => {
            const { values: baseVals, multiSellEnabled, multiSellMax, cooldownEnabled, cooldownDurationHours } =
              extractMultisell(row);
            const valuesWithMetadata = {
              ...baseVals,
              _metadata: {
                eachLineIsProduct,
              },
            };
            return {
              productId,
              templateId: product.inventoryTemplateId || null,
              cost: cost || null,
              values: valuesWithMetadata,
              status: "available" as const,
              multiSellEnabled,
              multiSellMax,
              cooldownEnabled,
              cooldownDurationHours,
              variantId: variantId || null,
            };
          })
        )
        .returning();

      await tx
        .update(products)
        .set({
          stockCount: sql`${products.stockCount} + ${itemsToCreate.length}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      if (variantId) {
        await tx
          .update(productVariants)
          .set({
            stockCount: sql`${productVariants.stockCount} + ${itemsToCreate.length}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, variantId));
      }
    }
  });

  await logActivity({
    userId: userId,
    action: "inventory_added",
    entity: "inventory",
    entityId: insertedItems[0]?.id || productId,
    metadata: {
      productId,
      productName: product.name,
      quantity: items.length,
      cost: cost || undefined,
      fulfilledOrders: fulfilledOrders.length > 0 ? fulfilledOrders : undefined,
    },
  });

  return { product, fulfilledOrders, insertedItems };
}
