/**
 * Pricing Service
 *
 * Handles tiered pricing for B2B/B2C customers
 */

import { getDb } from "@/db";
import { productPricing, products } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import type { VisibilityContext } from "@/types";

export interface PriceDisplay {
  cost?: string;
  wholesale?: string;
  retail?: string;
  current: string;
  currency: string;
  creditEligible: boolean;
  creditTermsDays?: number;
  minQuantity?: number;
}

/**
 * Get pricing for a product based on user context
 */
export async function getProductPricing(
  productId: string,
  context: VisibilityContext
): Promise<PriceDisplay> {
  const db = getDb();
  const pricing = await db.query.productPricing.findMany({
    where: eq(productPricing.productId, productId),
  });

  const retailPricing = pricing.find((p) => p.customerType === "retail");
  const merchantPricing = pricing.find((p) => p.customerType === "merchant");
  const adminPricing = pricing.find((p) => p.customerType === "admin");

  switch (context) {
    case "admin":
      return {
        cost: adminPricing?.cost ?? retailPricing?.cost ?? undefined,
        wholesale: merchantPricing?.wholesalePrice ?? undefined,
        retail: retailPricing?.retailPrice ?? undefined,
        current: retailPricing?.retailPrice || "0",
        currency: retailPricing?.currency || "USD",
        creditEligible: merchantPricing?.creditEligible || false,
        creditTermsDays: merchantPricing?.creditTermsDays ?? undefined,
        minQuantity: retailPricing?.minQuantity ?? undefined,
      };

    case "merchant":
      return {
        retail: retailPricing?.retailPrice ?? undefined,
        current: merchantPricing?.wholesalePrice || retailPricing?.retailPrice || "0",
        currency: merchantPricing?.currency || retailPricing?.currency || "USD",
        creditEligible: merchantPricing?.creditEligible || false,
        creditTermsDays: merchantPricing?.creditTermsDays ?? undefined,
        minQuantity:
          retailPricing?.minQuantity == null
            ? undefined
            : retailPricing.minQuantity,
      };

    case "customer":
      return {
        current: retailPricing?.retailPrice || "0",
        currency: retailPricing?.currency || "USD",
        creditEligible: false,
      };

    default:
      return {
        current: "0",
        currency: "USD",
        creditEligible: false,
      };
  }
}

/**
 * Get applicable pricing tier for order
 */
export async function getOrderPricingTier(
  customerType: "retail" | "merchant"
): Promise<"retail" | "wholesale"> {
  return customerType === "merchant" ? "wholesale" : "retail";
}

/**
 * Create or update pricing for a product
 */
export async function upsertProductPricing(data: {
  productId: string;
  customerType: "retail" | "merchant" | "admin";
  cost?: string;
  wholesalePrice?: string;
  retailPrice?: string;
  currency?: string;
  minQuantity?: number;
  creditEligible?: boolean;
  creditTermsDays?: number;
}) {
  const db = getDb();
  const existing = await db.query.productPricing.findFirst({
    where: and(
      eq(productPricing.productId, data.productId),
      eq(productPricing.customerType, data.customerType)
    ),
  });

  if (existing) {
    await db
      .update(productPricing)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(productPricing.id, existing.id));
    return existing.id;
  } else {
    const result = await db
      .insert(productPricing)
      .values({
        ...data,
        currency: data.currency || "USD",
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0].id;
  }
}

/**
 * Get all pricing tiers for a product
 */
export async function getAllProductPricing(productId: string) {
  const db = getDb();
  return db.query.productPricing.findMany({
    where: eq(productPricing.productId, productId),
  });
}

/**
 * Delete pricing tier
 */
export async function deleteProductPricing(pricingId: string): Promise<void> {
  const db = getDb();
  await db.delete(productPricing).where(eq(productPricing.id, pricingId));
}

/**
 * Check if customer is eligible for credit
 */
export async function isCreditEligible(
  productId: string,
  customerType: "retail" | "merchant"
): Promise<boolean> {
  const db = getDb();
  const pricing = await db.query.productPricing.findFirst({
    where: and(
      eq(productPricing.productId, productId),
      eq(productPricing.customerType, customerType)
    ),
  });

  return pricing?.creditEligible || false;
}

/**
 * Calculate price based on quantity (volume discount)
 */
export async function getPriceForQuantity(
  productId: string,
  customerType: "retail" | "merchant",
  quantity: number
): Promise<string> {
  const db = getDb();
  const allPricing = await db.query.productPricing.findMany({
    where: and(
      eq(productPricing.productId, productId),
      eq(productPricing.customerType, customerType)
    ),
  });

  // Find the best pricing tier for the quantity
  const applicablePricing = allPricing
    .filter((p) => !p.minQuantity || quantity >= p.minQuantity)
    .sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));

  if (applicablePricing.length > 0) {
    const price =
      customerType === "merchant"
        ? applicablePricing[0].wholesalePrice
        : applicablePricing[0].retailPrice;
    return price || "0";
  }

  // Fallback to product base price
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  return product?.basePrice?.toString() || "0";
}
