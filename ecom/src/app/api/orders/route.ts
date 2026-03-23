import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { orders, orderItems, cartItems, carts, products, coupons, couponUsage } from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getCurrentCustomer, getCustomerSession } from "@/lib/auth";
import { cookies } from "next/headers";

// Helper to get cart
async function getCart() {
  const db = getDb();
  const user = await getCurrentCustomer();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("cart_session_id")?.value;

  let cart = null;

  if (user) {
    const userCart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, user.id))
      .limit(1);
    if (userCart[0]) cart = userCart[0];
  }

  if (!cart && sessionId) {
    const sessionCart = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    if (sessionCart[0]) cart = sessionCart[0];
  }

  return cart;
}

// Helper to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// POST /api/orders - Create order (checkout)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      paymentMethod = "manual_contact",
      couponCode,
      notes,
    } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const cart = await getCart();

    if (!cart) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Get cart items
    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        categoryId: cartItems.categoryId,
        quantity: cartItems.quantity,
        price: cartItems.price,
        productName: products.name,
        productNameAr: products.nameAr,
        productSlug: products.slug,
        productDeliveryType: products.deliveryType,
        productBasePrice: products.basePrice,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.price?.toString() || "0") * item.quantity;
    }, 0);

    let discount = 0;
    let couponId = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, couponCode.toUpperCase()),
            eq(coupons.isActive, true)
          )
        )
        .limit(1);

      if (coupon[0]) {
        const now = new Date();
        const validFrom = new Date(coupon[0].validFrom);
        const validUntil = coupon[0].validUntil ? new Date(coupon[0].validUntil) : null;

        if (now < validFrom) {
          return NextResponse.json(
            { error: "Coupon is not yet valid" },
            { status: 400 }
          );
        }

        if (validUntil && now > validUntil) {
          return NextResponse.json(
            { error: "Coupon has expired" },
            { status: 400 }
          );
        }

        if (coupon[0].usageLimit && coupon[0].usageCount >= coupon[0].usageLimit) {
          return NextResponse.json(
            { error: "Coupon usage limit reached" },
            { status: 400 }
          );
        }

        const minPurchase = parseFloat(coupon[0].minPurchase?.toString() || "0");
        if (subtotal < minPurchase) {
          return NextResponse.json(
            { error: `Minimum purchase of ${minPurchase} required for this coupon` },
            { status: 400 }
          );
        }

        // Check user limit
        const userUsageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(couponUsage)
          .where(
            and(
              eq(couponUsage.couponId, coupon[0].id),
              eq(couponUsage.customerEmail, customerEmail)
            )
          );

        if (userUsageCount[0]?.count >= (coupon[0].userLimit || 1)) {
          return NextResponse.json(
            { error: "You have already used this coupon" },
            { status: 400 }
          );
        }

        // Calculate discount
        if (coupon[0].discountType === "percentage") {
          discount = subtotal * (parseFloat(coupon[0].discountValue?.toString() || "0") / 100);
        } else {
          discount = parseFloat(coupon[0].discountValue?.toString() || "0");
        }

        // Apply max discount
        const maxDiscount = parseFloat(coupon[0].maxDiscount?.toString() || "0");
        if (maxDiscount > 0 && discount > maxDiscount) {
          discount = maxDiscount;
        }

        couponId = coupon[0].id;
      }
    }

    const tax = 0; // No tax for digital products
    const total = subtotal - discount + tax;

    // Get current user
    const session = await getCustomerSession();
    const userId = session?.userId || null;

    // Execute all DB mutations in a transaction
    try {
      const result = await db.transaction(async (tx) => {
        // Increment coupon usage within transaction
        if (couponId) {
          await tx
            .update(coupons)
            .set({ usageCount: sql`${coupons.usageCount} + 1` })
            .where(eq(coupons.id, couponId));
        }

        // Create order
        const orderResult = await tx
          .insert(orders)
          .values({
            orderNumber: generateOrderNumber(),
            userId,
            customerEmail,
            customerName,
            status: "pending",
            fulfillmentStatus: "pending",
            paymentMethod,
            paymentStatus: "pending",
            subtotal: subtotal.toString(),
            discount: discount.toString(),
            tax: tax.toString(),
            total: total.toString(),
            couponId,
            notes,
          })
          .returning();

        const order = orderResult[0];

        // Create order items
        for (const item of items) {
          const itemSubtotal = parseFloat(item.price?.toString() || "0") * item.quantity;
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            deliveryType: item.productDeliveryType,
            price: item.price?.toString() || "0",
            quantity: item.quantity,
            subtotal: itemSubtotal.toString(),
          });
        }

        // Record coupon usage
        if (couponId) {
          await tx.insert(couponUsage).values({
            couponId,
            orderId: order.id,
            customerEmail,
            discountAmount: discount.toString(),
          });
        }

        // Clear cart
        await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

        return order;
      });

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          orderNumber: result.orderNumber,
          status: result.status,
          total: result.total?.toString() || "0",
          subtotal: result.subtotal?.toString() || "0",
          discount: result.discount?.toString() || "0",
        },
      });
    } catch (error) {
      console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET /api/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentCustomer();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let page = parseInt(searchParams.get("page") || "1");
    let limit = parseInt(searchParams.get("limit") || "10");
    
    // Validate pagination parameters
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Cap maximum limit
    
    const offset = (page - 1) * limit;

    const db = getDb();

    const ordersData = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        fulfillmentStatus: orders.fulfillmentStatus,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        createdAt: orders.createdAt,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.userId, user.id));

    const total = parseInt(countResult[0]?.count?.toString() || "0");
    const totalPages = Math.ceil(total / limit);

    // Get order items for each order
    const orderIds = ordersData.map((o) => o.id);
    const items = orderIds.length > 0
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder: Record<string, any[]> = {};
    items.forEach((item) => {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
      itemsByOrder[item.orderId].push(item);
    });

    const formattedOrders = ordersData.map((order) => ({
      ...order,
      items: itemsByOrder[order.id] || [],
    }));

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
