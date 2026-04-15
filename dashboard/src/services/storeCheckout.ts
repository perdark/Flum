/**
 * Guest storefront checkout — creates pending order (same shape as POST /api/orders).
 */

import { getDb } from "@/db";
import { products, orders, orderItems, coupons } from "@/db/schema";
import { and, eq, inArray, isNull, or, gte, lte, sql } from "drizzle-orm";

export type CheckoutItemInput = { productId: string; quantity: number };

export async function createGuestStoreOrder(input: {
  customerEmail: string;
  customerName?: string | null;
  items: CheckoutItemInput[];
  couponCode?: string | null;
  currency?: string;
  paymentMethod: string;
  customerId?: string | null;
  customerType?: string | null;
}) {
  const db = getDb();
  const { customerEmail, customerName, items, couponCode, currency = "USD", paymentMethod } =
    input;

  if (!customerEmail || !items.length) {
    throw new Error("Email and items are required");
  }

  const productIds = items.map((i) => i.productId);
  const productsData = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.basePrice,
      deliveryType: products.deliveryType,
      isActive: products.isActive,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  if (productsData.length !== productIds.length) {
    throw new Error("One or more products not found");
  }
  if (productsData.some((p) => !p.isActive)) {
    throw new Error("One or more products are not available");
  }

  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const product = productsData.find((p) => p.id === item.productId)!;
    const unitPrice = parseFloat(product.price);
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;
    return {
      productId: item.productId,
      productName: product.name,
      productSlug: product.slug,
      deliveryType: product.deliveryType,
      price: unitPrice.toString(),
      quantity: item.quantity,
      subtotal: itemSubtotal.toString(),
    };
  });

  let discount = 0;
  let couponId: string | null = null;
  if (couponCode?.trim()) {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, couponCode.trim().toUpperCase()),
          eq(coupons.isActive, true),
          isNull(coupons.deletedAt),
          lte(coupons.validFrom, sql`NOW()`),
          or(isNull(coupons.validUntil), gte(coupons.validUntil, sql`NOW()`)),
        ),
      )
      .limit(1);

    if (coupon) {
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("Coupon has reached its usage limit");
      }
      const minPurchase = parseFloat(coupon.minPurchase || "0");
      if (subtotal < minPurchase) {
        throw new Error(`Minimum purchase of ${minPurchase} required for this coupon`);
      }
      if (coupon.discountType === "percentage") {
        discount = subtotal * (parseFloat(coupon.discountValue) / 100);
        if (coupon.maxDiscount) {
          discount = Math.min(discount, parseFloat(coupon.maxDiscount));
        }
      } else {
        discount = parseFloat(coupon.discountValue);
      }
      couponId = coupon.id;
    }
  }

  const total = Math.max(0, subtotal - discount);
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const checkoutToken = crypto.randomUUID();

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      customerEmail,
      customerName: customerName || null,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: "0",
      total: total.toFixed(2),
      currency,
      couponId,
      status: "pending",
      fulfillmentStatus: "pending",
      paymentMethod,
      paymentStatus: "pending",
      customerId: input.customerId ?? null,
      customerType: input.customerType ?? null,
      metadata: { checkoutToken, source: "storefront" },
    })
    .returning();

  await db.insert(orderItems).values(
    orderItemsData.map((row) => ({
      orderId: order.id,
      ...row,
    })),
  );

  return { order, items: orderItemsData, checkoutToken };
}
