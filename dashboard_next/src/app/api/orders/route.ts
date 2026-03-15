/**
 * Orders API Routes
 *
 * GET /api/orders - List orders with filtering and pagination
 * POST /api/orders - Create a new order
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products, coupons, users } from "@/db/schema";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, or, inArray, isNull } from "drizzle-orm";
import { fulfillOrder } from "@/services/autoDelivery";

// ============================================================================
// GET /api/orders - List orders
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.VIEW_ORDERS);
    const isAdmin = user.role === "admin";

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const fulfillmentStatus = searchParams.get("fulfillmentStatus");
    const claimStatus = searchParams.get("claimStatus"); // 'unclaimed', 'mine', 'others', 'any'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions = [sql`orders.deleted_at IS NULL`];

    if (search) {
      conditions.push(
        or(
          like(orders.customerEmail, `%${search}%`),
          like(orders.customerName || "", `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(orders.status, status as "pending" | "completed" | "cancelled" | "refunded"));
    }

    if (fulfillmentStatus) {
      conditions.push(eq(orders.fulfillmentStatus, fulfillmentStatus as "pending" | "processing" | "delivered" | "failed"));
    }

    // Claim filtering
    if (claimStatus) {
      switch (claimStatus) {
        case "unclaimed":
          conditions.push(or(isNull(orders.claimedBy), sql`claim_expires_at < NOW()`)!);
          break;
        case "mine":
          conditions.push(eq(orders.claimedBy, user.id));
          break;
        case "others":
          conditions.push(and(
            sql`${orders.claimedBy} != ${user.id}`,
            sql`claim_expires_at >= NOW()`
          )!);
          break;
        // 'any' - no filter needed
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get orders with claim info
    const ordersList = await db
      .select({
        id: orders.id,
        customerEmail: orders.customerEmail,
        customerName: orders.customerName,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        currency: orders.currency,
        couponId: orders.couponId,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        deliveredAt: orders.deliveredAt,
        processedBy: orders.processedBy,
        claimedBy: orders.claimedBy,
        claimedAt: orders.claimedAt,
        claimExpiresAt: orders.claimExpiresAt,
        claimantName: users.name,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.claimedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get order items for each order
    const orderIds = ordersList.map((o) => o.id);

    const itemsList = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.price,
        subtotal: orderItems.subtotal,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    // Group items by order and add computed fields
    const ordersWithItems = ordersList.map((order: any) => ({
      ...order,
      isClaimedByMe: order.claimedBy === user.id,
      isClaimExpired: order.claimExpiresAt ? order.claimExpiresAt < new Date() : false,
      items: itemsList.filter((item) => item.orderId === order.id),
    }));

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    console.error("Get orders error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/orders - Create new order (public endpoint for checkout)
// ============================================================================()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      items,
      couponCode,
      currency = "USD",
    } = body;

    // Validate input
    if (!customerEmail || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Email and items are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify products exist and get prices
    const productIds = items.map((i: { productId: string }) => i.productId);
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
      return NextResponse.json(
        { success: false, error: "One or more products not found" },
        { status: 404 }
      );
    }

    // Check all products are active
    const inactiveProducts = productsData.filter((p) => !p.isActive);
    if (inactiveProducts.length > 0) {
      return NextResponse.json(
        { success: false, error: "One or more products are not available" },
        { status: 400 }
      );
    }

    // Calculate subtotal
    let subtotal = 0;
    const orderItemsData = items.map((item: { productId: string; quantity: number }) => {
      const product = productsData.find((p) => p.id === item.productId);
      const unitPrice = parseFloat(product!.price);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        productName: product!.name,
        productSlug: product!.slug,
        platformId: null,
        platformName: null,
        deliveryType: product!.deliveryType,
        price: unitPrice.toString(),
        quantity: item.quantity,
        subtotal: itemSubtotal.toString(),
      };
    });

    // Apply coupon if provided
    let discount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, couponCode.toUpperCase()),
            sql`is_active = true`,
            sql`deleted_at IS NULL`,
            sql`(valid_until IS NULL OR valid_until > NOW())`
          )
        )
        .limit(1);

      if (coupon) {
        // Check usage limits
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return NextResponse.json(
            { success: false, error: "Coupon has reached its usage limit" },
            { status: 400 }
          );
        }

        // Check min purchase
        const minPurchase = parseFloat(coupon.minPurchase || "0");
        if (subtotal < minPurchase) {
          return NextResponse.json(
            {
              success: false,
              error: `Minimum purchase of $${minPurchase} required for this coupon`,
            },
            { status: 400 }
          );
        }

        // Calculate discount
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

    const total = subtotal - discount;

    // Create order
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerEmail,
        customerName: customerName || null,
        subtotal: subtotal.toString(),
        discount: discount.toString(),
        total: total.toString(),
        currency,
        couponId,
        status: "pending",
        fulfillmentStatus: "pending",
        paymentMethod: "online",
        paymentStatus: "pending",
      })
      .returning();

    // Create order items
    await db.insert(orderItems).values(
      orderItemsData.map((item) => ({
        orderId: order.id,
        ...item,
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        order,
        items: orderItemsData,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
