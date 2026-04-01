/**
 * Manual Sell API Routes
 *
 * POST /api/manual-sell - Process manual sale with shortage handling
 *
 * Shortage actions:
 * - (not specified): Return shortage info without creating order
 * - "partial": Sell only what's available
 * - "add-inventory": Create inventory (can be more than shortage, extras become available)
 * - "pending": Create pending order
 * - "fail": Return error if shortage exists
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, orders, orderItems, inventoryItems, orderDeliverySnapshots, productPricing, bundleItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logActivity, logOrderCompleted } from "@/services/activityLog";
import {
  pickOneInventoryLine,
  applySaleToInventoryLine,
  resetExpiredMultisellCooldowns,
  decrementLinkedProductStock,
  type InventoryRowPick,
} from "@/services/autoDelivery";
import { sqlInventoryRowsForProduct } from "@/lib/inventoryProductScope";

interface ManualSellItem {
  productId: string;
  quantity: number;
}

interface ManualSellRequest {
  items: ManualSellItem[];
  customerEmail: string;
  customerName?: string;
  shortageAction?: "fail" | "partial" | "add-inventory" | "pending";
  inventoryItemsToAdd?: Array<{
    productId: string;
    values: Record<string, string | number | boolean>;
  }>;
  newCost?: number;
  eachLineIsProduct?: boolean;
  customerType?: "retail" | "merchant";
}

interface ShortageItem {
  productId: string;
  productName: string;
  requested: number;
  available: number;
  shortage: number;
}

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number; // delivered quantity
  requestedQuantity?: number; // original requested quantity
  unitPrice: number;
  items: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }>;
}

// Helper: Check inventory availability for all items
async function checkInventoryAvailability(
  db: any,
  items: ManualSellItem[],
  productsData: any[],
  bundleItemsData: any[] = []
): Promise<{
  shortages: ShortageItem[];
  hasShortage: boolean;
  availableByProduct: Map<string, number>;
}> {
  const shortages: ShortageItem[] = [];
  const availableByProduct = new Map<string, number>();

  for (const requestItem of items) {
    const product = productsData.find((p) => p.id === requestItem.productId);
    if (!product) continue;

    if (product.isBundle) {
      // For bundles, check availability of all sub-products
      const bundleSubItems = bundleItemsData.filter(
        (bi) => bi.bundleProductId === product.id
      );

      if (bundleSubItems.length === 0) {
        availableByProduct.set(requestItem.productId, 0);
        shortages.push({
          productId: product.id,
          productName: product.name,
          requested: requestItem.quantity,
          available: 0,
          shortage: requestItem.quantity,
        });
        continue;
      }

      // Get available count for each sub-product
      const subProductIds = [...new Set(bundleSubItems.map((bi) => bi.productId).filter(Boolean))];
      const subProductCounts = new Map<string, number>();

      for (const subProductId of subProductIds) {
        const countResult = await db.execute(
          sql`
            SELECT COUNT(*) as count
            FROM inventory_items
            WHERE ${sqlInventoryRowsForProduct(subProductId)}
              AND status = 'available'
              AND deleted_at IS NULL
          `
        );
        subProductCounts.set(subProductId, parseInt(countResult.rows[0].count, 10));
      }

      // Calculate how many complete bundles can be made
      let maxBundles = Infinity;
      for (const subItem of bundleSubItems) {
        if (!subItem.productId) continue;
        const subAvailable = subProductCounts.get(subItem.productId || '') || 0;
        const needed = subItem.quantity || 1;
        const possibleBundles = Math.floor(subAvailable / needed);
        maxBundles = Math.min(maxBundles, possibleBundles);
      }
      if (maxBundles === Infinity) maxBundles = 0;

      const available = maxBundles;
      availableByProduct.set(requestItem.productId, available);

      const shortage = Math.max(0, requestItem.quantity - available);
      if (shortage > 0) {
        shortages.push({
          productId: product.id,
          productName: product.name,
          requested: requestItem.quantity,
          available,
          shortage,
        });
      }
    } else {
      // Regular product - count available inventory
      const countResult = await db.execute(
        sql`
          SELECT COUNT(*) as count
          FROM inventory_items
          WHERE ${sqlInventoryRowsForProduct(requestItem.productId)}
            AND status = 'available'
            AND deleted_at IS NULL
        `
      );

      const available = parseInt(countResult.rows[0].count, 10);
      availableByProduct.set(requestItem.productId, available);

      const shortage = Math.max(0, requestItem.quantity - available);

      if (shortage > 0) {
        shortages.push({
          productId: product.id,
          productName: product.name,
          requested: requestItem.quantity,
          available,
          shortage,
        });
      }
    }
  }

  return {
    shortages,
    hasShortage: shortages.length > 0,
    availableByProduct,
  };
}

// Helper: Fulfill items with available inventory (up to requested quantity)
// Uses pickOneInventoryLine + applySaleToInventoryLine for multi-sell awareness
async function fulfillItems(
  tx: any,
  productId: string,
  requestedQuantity: number,
  product: any,
  unitPrice?: number,
  orderItemId?: string | null,
  orderId?: string | null,
  userId?: string | null
): Promise<{
  deliveredItems: DeliveryItem;
  shortage: number;
}> {
  await resetExpiredMultisellCooldowns(tx, productId);

  const soldItems: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }> = [];
  const soldIds: string[] = [];

  for (let q = 0; q < requestedQuantity; q++) {
    const row = await pickOneInventoryLine(tx, productId);
    if (!row) break;

    const { decrementStock } = await applySaleToInventoryLine(
      tx,
      row,
      orderItemId ?? null,
      orderId ?? null,
      userId ?? null
    );

    soldItems.push({
      inventoryId: row.id,
      values: row.values,
    });
    soldIds.push(row.id);
  }

  // Update stock for all linked products (primary FK + junction table)
  await decrementLinkedProductStock(tx, soldIds);

  const shortage = requestedQuantity - soldItems.length;

  return {
    deliveredItems: {
      productId: product.id,
      productName: product.name,
      quantity: soldItems.length,
      unitPrice: unitPrice ?? parseFloat(product.price),
      items: soldItems,
    },
    shortage,
  };
}

// Helper: Create inventory items (can be sold or available)
async function createInventory(
  tx: any,
  productId: string,
  itemsArray: Array<Record<string, string | number | boolean>>,
  templateId: string,
  markSold = true
): Promise<Array<{ inventoryId: string; values: Record<string, string | number | boolean> }>> {
  const newItems = itemsArray.map((values) => ({
    productId,
    templateId,
    values,
    status: markSold ? ("sold" as const) : ("available" as const),
    purchasedAt: markSold ? new Date() : null,
  }));

  const inserted = await tx
    .insert(inventoryItems)
    .values(newItems)
    .returning();

  // Update product stats
  if (markSold) {
    // For sold items, increase totalSold but don't change stockCount (they were never available)
    await tx
      .update(products)
      .set({
        totalSold: sql`${products.totalSold} + ${itemsArray.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  } else {
    // For available items, increase stockCount
    await tx
      .update(products)
      .set({
        stockCount: sql`${products.stockCount} + ${itemsArray.length}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  return inserted.map((item: any) => ({
    inventoryId: item.id,
    values: item.values as Record<string, string | number | boolean>,
  }));
}

// Helper: Fulfill bundle items by pulling from sub-product inventories (multi-sell aware)
async function fulfillBundleItems(
  tx: any,
  _bundleProductId: string,
  requestedQuantity: number,
  bundleProduct: any,
  bundleSubItems: any[],
  unitPrice?: number,
  orderItemId?: string | null,
  orderId?: string | null,
  userId?: string | null
): Promise<{
  deliveredItems: DeliveryItem;
  shortage: number;
}> {
  const soldItems: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }> = [];

  const withPid = bundleSubItems.filter((bi) => bi.productId);
  if (withPid.length === 0) {
    return {
      deliveredItems: {
        productId: bundleProduct.id,
        productName: bundleProduct.name,
        quantity: 0,
        unitPrice: unitPrice ?? parseFloat(bundleProduct.basePrice || bundleProduct.price || "0"),
        items: [],
      },
      shortage: requestedQuantity,
    };
  }

  let fulfilledCount = 0;
  const oid = orderItemId ?? null;
  const ordId = orderId ?? null;

  for (let bundleIdx = 0; bundleIdx < requestedQuantity; bundleIdx++) {
    await tx.execute(sql`SAVEPOINT sp_manual_bundle`);
    try {
      const batch: Array<{ row: InventoryRowPick; subPid: string }> = [];
      for (const subItem of withPid) {
        await resetExpiredMultisellCooldowns(tx, subItem.productId);
        const need = subItem.quantity || 1;
        for (let n = 0; n < need; n++) {
          const row = (await pickOneInventoryLine(tx, subItem.productId)) as InventoryRowPick | null;
          if (!row) throw new Error("shortage");
          batch.push({ row, subPid: subItem.productId });
        }
      }
      for (const { row, subPid } of batch) {
        const { decrementStock } = await applySaleToInventoryLine(
          tx,
          row,
          oid,
          ordId,
          userId ?? null
        );
        soldItems.push({
          inventoryId: row.id,
          values: row.values,
        });
        if (decrementStock) {
          await decrementLinkedProductStock(tx, [row.id]);
        } else {
          // Multi-sell partial: still count the sale
          await tx.execute(sql`
            UPDATE ${products}
            SET total_sold = total_sold + 1,
                updated_at = NOW()
            WHERE id = ${subPid}
          `);
        }
      }
      fulfilledCount++;
      await tx.execute(sql`RELEASE SAVEPOINT sp_manual_bundle`);
    } catch {
      await tx.execute(sql`ROLLBACK TO SAVEPOINT sp_manual_bundle`);
      break;
    }
  }

  const shortage = requestedQuantity - fulfilledCount;

  return {
    deliveredItems: {
      productId: bundleProduct.id,
      productName: bundleProduct.name,
      quantity: fulfilledCount,
      unitPrice: unitPrice ?? parseFloat(bundleProduct.basePrice || bundleProduct.price || "0"),
      items: soldItems,
    },
    shortage,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);

    const body: ManualSellRequest = await request.json();
    const {
      items,
      customerEmail,
      customerName,
      inventoryItemsToAdd,
      newCost,
      eachLineIsProduct,
    } = body;
    let shortageAction: "fail" | "partial" | "add-inventory" | "pending" | undefined = body.shortageAction;
    const customerType = body.customerType || "retail";

    // Validate input
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items are required" },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get product details with pricing info
    const productIds = items.map((i) => i.productId);
    const productsData = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.basePrice,
        deliveryType: products.deliveryType,
        inventoryTemplateId: products.inventoryTemplateId,
        isBundle: products.isBundle,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    // Fetch bundle items for bundle products
    const bundleProductIds = productsData.filter((p) => p.isBundle).map((p) => p.id);
    const bundleItemsData = bundleProductIds.length > 0
      ? await db
          .select({
            bundleProductId: bundleItems.bundleProductId,
            productId: bundleItems.productId,
            productName: bundleItems.productName,
            quantity: bundleItems.quantity,
            templateFieldId: bundleItems.templateFieldId,
            lineIndex: bundleItems.lineIndex,
          })
          .from(bundleItems)
          .where(inArray(bundleItems.bundleProductId, bundleProductIds))
      : [];

    // Get pricing tiers for B2B support
    const productCosts = await db
      .select({
        productId: productPricing.productId,
        cost: productPricing.cost,
        customerType: productPricing.customerType,
        wholesalePrice: productPricing.wholesalePrice,
        retailPrice: productPricing.retailPrice,
      })
      .from(productPricing)
      .where(inArray(productPricing.productId, productIds));

    // Create price maps: productId -> price based on customer type
    const priceMap = new Map<string, number>();
    const costMap = new Map<string, number | null>();
    
    for (const product of productsData) {
      // Default to base price
      let finalPrice = parseFloat(product.price);
      let finalCost: number | null = null;

      // Find pricing for the customer type
      const pricing = productCosts.find(
        (pc) => pc.productId === product.id && pc.customerType === customerType
      );
      
      if (pricing) {
        if (customerType === "merchant" && pricing.wholesalePrice) {
          finalPrice = parseFloat(pricing.wholesalePrice);
        } else if (pricing.retailPrice) {
          finalPrice = parseFloat(pricing.retailPrice);
        }
        if (pricing.cost) {
          finalCost = parseFloat(pricing.cost);
        }
      }

      priceMap.set(product.id, finalPrice);
      costMap.set(product.id, finalCost);
    }

    if (productsData.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more products not found" },
        { status: 404 }
      );
    }

    // Check inventory availability
    const availability = await checkInventoryAvailability(db, items, productsData, bundleItemsData);

    // When no shortageAction specified:
    // - If NO shortage: auto-complete the sale directly
    // - If shortage exists: return availability info for user to choose action
    if (!shortageAction) {
      // If no shortage, complete the sale automatically
      if (!availability.hasShortage) {
        // Set shortageAction to "complete" (which will fulfill all items)
        shortageAction = "fail"; // This will trigger the fulfillment flow below
        // But we need to skip the "fail" check since we know there's no shortage
        // We'll handle this in the transaction section
      } else {
        // Calculate what would be delivered
        const potentialDelivery = items.map(item => {
          const product = productsData.find(p => p.id === item.productId)!;
          const available = availability.availableByProduct.get(item.productId) || 0;
          const toDeliver = Math.min(item.quantity, available);
          const unitPrice = priceMap.get(product.id) || parseFloat(product.price);
          return {
            productId: item.productId,
            productName: product.name,
            requested: item.quantity,
            available,
            canDeliver: toDeliver,
            shortage: Math.max(0, item.quantity - available),
            subtotalIfPartial: (unitPrice * toDeliver).toString(),
          };
        });

        const totalRequested = items.reduce((sum, item) => {
          const product = productsData.find(p => p.id === item.productId)!;
          const unitPrice = priceMap.get(product.id) || parseFloat(product.price);
          return sum + (unitPrice * item.quantity);
        }, 0);

        const totalCanDeliver = potentialDelivery.reduce((sum, item) => {
          return sum + (parseFloat(item.subtotalIfPartial));
        }, 0);

        return NextResponse.json({
          success: true,
          action: "check",
          data: {
            hasShortage: true,
            shortageItems: availability.shortages,
            potentialDelivery,
            totals: {
              requested: totalRequested.toString(),
              canDeliver: totalCanDeliver.toString(),
            },
            options: {
              partial: "Create order with available items only",
              addInventory: "Add missing inventory and complete sale",
              pending: "Create pending order for unfulfilled items",
            },
          },
        });
      }
    }

    // Handle "fail" action - only fail if there's actual shortage
    if (shortageAction === "fail" && availability.hasShortage) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient inventory",
          shortageItems: availability.shortages,
        },
        { status: 400 }
      );
    }

    // If auto-completing (no shortage), treat as "partial" to fulfill all items
    if (shortageAction === "fail" && !availability.hasShortage) {
      shortageAction = "partial";
    }

    // Process the sale based on action
    const result = await db.transaction(async (tx) => {
      const deliveryItems: DeliveryItem[] = [];
      const remainingShortages: ShortageItem[] = [];
      let actualTotal = 0;
      let actualQuantity = 0; // Track actual items delivered
      const extraInventoryCreated: Array<{ productId: string; quantity: number }> = [];

      // Group inventory items to add by product
      const inventoryByProduct = new Map<string, Array<Record<string, string | number | boolean>>>();
      if (inventoryItemsToAdd) {
        for (const invItem of inventoryItemsToAdd) {
          if (!inventoryByProduct.has(invItem.productId)) {
            inventoryByProduct.set(invItem.productId, []);
          }
          inventoryByProduct.get(invItem.productId)!.push(invItem.values);
        }
      }

      // First pass: fulfill with available inventory
      for (const requestItem of items) {
        const product = productsData.find((p) => p.id === requestItem.productId);
        if (!product) continue;

        // Check if product has inventory template for stock tracking
        if (!product.inventoryTemplateId && !product.isBundle) {
          // No template = no stock tracking, manual delivery
          // Create delivery item with no inventory items
          const itemPrice = priceMap.get(product.id) || parseFloat(product.price);
          const noStockItem: DeliveryItem = {
            productId: product.id,
            productName: product.name,
            quantity: requestItem.quantity,
            requestedQuantity: requestItem.quantity,
            unitPrice: itemPrice,
            items: [],
          };
          deliveryItems.push(noStockItem);
          actualTotal += requestItem.quantity * itemPrice;
          actualQuantity += requestItem.quantity;
          continue;
        }

        // Handle bundle products
        if (product.isBundle) {
          const bundleSubItems = bundleItemsData.filter(
            (bi) => bi.bundleProductId === product.id
          );

          const { deliveredItems, shortage } = await fulfillBundleItems(
            tx,
            requestItem.productId,
            requestItem.quantity,
            product,
            bundleSubItems,
            priceMap.get(product.id),
            null,
            null,
            user.id
          );

          (deliveredItems as any).requestedQuantity = requestItem.quantity;
          deliveryItems.push(deliveredItems);
          actualTotal += deliveredItems.quantity * deliveredItems.unitPrice;
          actualQuantity += deliveredItems.quantity;

          if (shortage > 0 && shortageAction !== "partial") {
            remainingShortages.push({
              productId: product.id,
              productName: product.name,
              requested: requestItem.quantity,
              available: deliveredItems.quantity,
              shortage,
            });
          }
          continue;
        }

        const { deliveredItems, shortage } = await fulfillItems(
          tx,
          requestItem.productId,
          requestItem.quantity,
          product,
          priceMap.get(product.id)
        );
        // Add requestedQuantity to track original request vs delivered
        (deliveredItems as any).requestedQuantity = requestItem.quantity;
        deliveryItems.push(deliveredItems);
        actualTotal += deliveredItems.quantity * deliveredItems.unitPrice;
        actualQuantity += deliveredItems.quantity;

        if (shortage > 0) {
          const additionalInventory = inventoryByProduct.get(requestItem.productId) || [];

          if (additionalInventory.length > 0) {
            // Determine how many to fulfill vs keep available
            const toFulfill = Math.min(shortage, additionalInventory.length);
            const toKeepAvailable = additionalInventory.length - toFulfill;

            // Create and sell items needed for this order
            if (toFulfill > 0) {
              const toSell = additionalInventory.slice(0, toFulfill);
              const createdSold = await createInventory(
                tx,
                requestItem.productId,
                toSell,
                product.inventoryTemplateId!,
                true
              );

              // Add created items to delivery
              deliveredItems.items.push(...createdSold);
              deliveredItems.quantity += toFulfill;
              const itemPrice = priceMap.get(product.id) || parseFloat(product.price);
              deliveredItems.unitPrice = itemPrice;
              actualTotal += toFulfill * itemPrice;
              actualQuantity += toFulfill;
            }

            // Create extra items as available for future sales
            if (toKeepAvailable > 0) {
              const toKeep = additionalInventory.slice(toFulfill);
              await createInventory(
                tx,
                requestItem.productId,
                toKeep,
                product.inventoryTemplateId!,
                false
              );
              extraInventoryCreated.push({ productId: requestItem.productId, quantity: toKeepAvailable });
            }

            // Check if still has shortage
            const remainingShortage = requestItem.quantity - deliveredItems.quantity;
            if (remainingShortage > 0) {
              remainingShortages.push({
                productId: product.id,
                productName: product.name,
                requested: requestItem.quantity,
                available: deliveredItems.quantity,
                shortage: remainingShortage,
              });
            }
          } else {
            // No additional inventory provided
            if (shortageAction !== "partial") {
              remainingShortages.push({
                productId: product.id,
                productName: product.name,
                requested: requestItem.quantity,
                available: deliveredItems.quantity,
                shortage,
              });
            }
          }
        }
      }

      // Determine order status
      // Check if any product has manual delivery type
      const hasManualDelivery = deliveryItems.some((di) => {
        const product = productsData.find(p => p.id === di.productId);
        return product?.deliveryType === "manual";
      });
      
      const hasUnfulfilledItems = remainingShortages.length > 0;
      let orderStatus: "pending" | "completed" = "completed";
      let fulfillmentStatus: "pending" | "processing" | "delivered" = "delivered";

      if (hasManualDelivery) {
        // Manual delivery: order stays pending for manual fulfillment from Orders page
        // Stock is still deducted, but service delivery is manual
        orderStatus = "pending";
        fulfillmentStatus = "pending";
      } else if (shortageAction === "partial") {
        // Partial: order is completed with whatever was delivered
        orderStatus = "completed";
        fulfillmentStatus = "delivered";
      } else if (hasUnfulfilledItems && shortageAction === "pending") {
        // Pending: order stays pending for unfulfilled items
        orderStatus = "pending";
        fulfillmentStatus = "pending";
      } else if (!hasUnfulfilledItems) {
        // All items fulfilled with auto delivery
        orderStatus = "completed";
        fulfillmentStatus = "delivered";
      }

      // Create order
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerEmail,
          customerName: customerName || null,
          subtotal: actualTotal.toString(),
          discount: "0",
          total: actualTotal.toString(),
          status: orderStatus,
          fulfillmentStatus,
          paymentMethod: "manual",
          paymentStatus: "completed",
          processedBy: user.id,
          deliveredAt: fulfillmentStatus === "delivered" ? new Date() : null,
          claimedBy: hasUnfulfilledItems ? user.id : null,
          claimedAt: hasUnfulfilledItems ? new Date() : null,
          claimExpiresAt: hasUnfulfilledItems ? new Date(Date.now() + 30 * 60 * 1000) : null,
          customerType,
          pricingTierUsed: customerType === "merchant" ? "wholesale" : "retail",
          metadata: { saleSource: "manual_product" },
        })
        .returning();

      // Create order items and link inventory
      for (const deliveryItem of deliveryItems) {
        const unitPrice = deliveryItem.unitPrice;
        const product = productsData.find(p => p.id === deliveryItem.productId);

        const deliveredQuantity = deliveryItem.quantity;
        // For pending orders, use requested quantity; otherwise use delivered quantity
        const itemQuantity = (orderStatus === "pending" && (deliveryItem as any).requestedQuantity)
          ? (deliveryItem as any).requestedQuantity
          : deliveredQuantity;
        const itemSubtotal = (unitPrice * deliveredQuantity).toString();

        // Use provided newCost, or fetch from product pricing, or null
        const itemCost = newCost
          ? newCost.toString()
          : (costMap.get(deliveryItem.productId)?.toString() || null);

        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            productId: deliveryItem.productId,
            productName: product?.name || deliveryItem.productName,
            productSlug: product?.slug || deliveryItem.productId,
            deliveryType: product?.deliveryType || "manual",
            price: unitPrice.toString(),
            quantity: itemQuantity,
            subtotal: itemSubtotal,
            cost: itemCost,
            deliveredInventoryIds: sql`${JSON.stringify(
              deliveryItem.items.map((i) => i.inventoryId)
            )}::jsonb`,
          })
          .returning();

        // Link inventory to order item
        for (const soldItem of deliveryItem.items) {
          await tx
            .update(inventoryItems)
            .set({ orderItemId: orderItem.id })
            .where(eq(inventoryItems.id, soldItem.inventoryId));
        }
      }

      // Create delivery snapshot
      await tx.insert(orderDeliverySnapshots).values({
        orderId: order.id,
        payload: { items: deliveryItems },
        createdBy: user.id,
      });

      // Log activity
      if (orderStatus === "completed") {
        await logOrderCompleted(user.id, order.id, actualTotal.toString());
      } else {
        await logActivity({
          userId: user.id,
          action: "order_created",
          entity: "order",
          entityId: order.id,
          metadata: {
            total: actualTotal.toString(),
            pendingItems: remainingShortages,
          },
        });
      }

      return {
        order,
        deliveryItems,
        shortageItems: remainingShortages,
        extraInventoryCreated,
      };
    });

    return NextResponse.json(
      {
        success: true,
        action: shortageAction,
        data: {
          orderId: result.order.id,
          order: result.order,
          deliveryItems: result.deliveryItems,
          shortageItems: result.shortageItems,
          hasShortage: result.shortageItems.length > 0,
          extraInventoryCreated: result.extraInventoryCreated,
        },
      },
      { status: 201 }
    );
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
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Manual sell error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
