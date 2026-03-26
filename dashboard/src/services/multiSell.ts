/**
 * Multi-Sell Cooldown Service
 *
 * Manages inventory units that can be sold multiple times before entering cooldown
 */

import { db } from "@/db";
import { inventoryUnits, products } from "@/db/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";

export interface MultiSellConfig {
  productId: string;
  maxSales: number;
  cooldownHours: number;
}

export interface AvailableUnit {
  id: string;
  physicalUnitId: string;
  saleCount: number;
  maxSales: number;
  status: string;
}

/**
 * Get available inventory units for a product
 */
export async function getAvailableUnits(
  productId: string,
  quantity: number
): Promise<string[]> {
  const now = new Date();

  const units = await db
    .select({ id: inventoryUnits.id })
    .from(inventoryUnits)
    .where(
      and(
        eq(inventoryUnits.productId, productId),
        eq(inventoryUnits.status, "available"),
        lt(inventoryUnits.saleCount, inventoryUnits.maxSales),
        or(
          isNull(inventoryUnits.cooldownUntil),
          lt(inventoryUnits.cooldownUntil, now)
        )
      )
    )
    .limit(quantity);

  return units.map((u) => u.id);
}

/**
 * Get detailed available units with status info
 */
export async function getAvailableUnitsWithDetails(
  productId: string,
  quantity: number
): Promise<AvailableUnit[]> {
  const now = new Date();

  const units = await db
    .select({
      id: inventoryUnits.id,
      physicalUnitId: inventoryUnits.physicalUnitId,
      saleCount: inventoryUnits.saleCount,
      maxSales: inventoryUnits.maxSales,
      status: inventoryUnits.status,
    })
    .from(inventoryUnits)
    .where(
      and(
        eq(inventoryUnits.productId, productId),
        eq(inventoryUnits.status, "available"),
        lt(inventoryUnits.saleCount, inventoryUnits.maxSales),
        or(
          isNull(inventoryUnits.cooldownUntil),
          lt(inventoryUnits.cooldownUntil, now)
        )
      )
    )
    .limit(quantity);

  return units;
}

/**
 * Record a sale and trigger cooldown if needed
 */
export async function recordSale(
  unitId: string,
  maxSales: number,
  cooldownHours: number
): Promise<void> {
  const unit = await db.query.inventoryUnits.findFirst({
    where: eq(inventoryUnits.id, unitId),
  });

  if (!unit) {
    throw new Error("Unit not found");
  }

  const newSaleCount = (unit.saleCount || 0) + 1;
  const willCooldown = newSaleCount >= maxSales;

  await db
    .update(inventoryUnits)
    .set({
      saleCount: newSaleCount,
      lastSaleAt: new Date(),
      cooldownUntil: willCooldown
        ? new Date(Date.now() + cooldownHours * 60 * 60 * 1000)
        : unit.cooldownUntil,
      status: willCooldown ? "in_cooldown" : "available",
      updatedAt: new Date(),
    })
    .where(eq(inventoryUnits.id, unitId));
}

/**
 * Get virtual stock count for multi-sell product
 */
export async function getVirtualStock(productId: string): Promise<number> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product || !product.multiSellEnabled) return 0;

  const now = new Date();
  const units = await db.query.inventoryUnits.findMany({
    where: and(
      eq(inventoryUnits.productId, productId),
      or(
        isNull(inventoryUnits.cooldownUntil),
        lt(inventoryUnits.cooldownUntil, now)
      )
    ),
  });

  let virtualStock = 0;
  for (const unit of units) {
    const remainingSales = (unit.maxSales || 5) - (unit.saleCount || 0);
    if (unit.status !== "exhausted" && remainingSales > 0) {
      virtualStock += remainingSales;
    }
  }

  return virtualStock;
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

/**
 * Create new inventory units for a product
 */
export async function createInventoryUnits(
  productId: string,
  unitCount: number,
  config: Partial<MultiSellConfig>
): Promise<void> {
  const units = Array.from({ length: unitCount }, (_, i) => ({
    productId,
    physicalUnitId: `${productId}-${Date.now()}-${i}`,
    maxSales: config.maxSales || 5,
    cooldownDurationHours: config.cooldownHours || 12,
    status: "available" as const,
    saleCount: 0,
  }));

  await db.insert(inventoryUnits).values(units);
}

/**
 * Reset cooldown for a unit (admin action)
 */
export async function resetCooldown(unitId: string): Promise<void> {
  await db
    .update(inventoryUnits)
    .set({
      cooldownUntil: null,
      status: "available",
      updatedAt: new Date(),
    })
    .where(eq(inventoryUnits.id, unitId));
}

/**
 * Get all units for a product with their status
 */
export async function getProductUnits(productId: string) {
  return db.query.inventoryUnits.findMany({
    where: eq(inventoryUnits.productId, productId),
    orderBy: (units, { desc }) => [desc(units.createdAt)],
  });
}
