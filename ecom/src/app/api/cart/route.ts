import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { carts, cartItems, products, productPlatforms, platforms, productImages } from "@/lib/db/schema";
import { eq, and, sql, desc, inArray, isNull } from "drizzle-orm";
import { getCurrentCustomer, getCustomerSession } from "@/lib/auth";
import { cookies } from "next/headers";

// Helper to get or create cart
async function getOrCreateCart() {
  const db = getDb();
  const user = await getCurrentCustomer();

  // Try to get session ID from cookie
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("cart_session_id")?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("cart_session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  // Try to find existing cart
  let cart = null;

  if (user) {
    // First try to find cart by user ID
    const userCart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, user.id))
      .limit(1);
    if (userCart[0]) {
      cart = userCart[0];
    }
  }

  if (!cart && sessionId) {
    // Try to find cart by session
    const sessionCart = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    if (sessionCart[0]) {
      cart = sessionCart[0];

      // If user is logged in, link the session cart to user
      if (user && !cart.userId) {
        await db.update(carts).set({ userId: user.id }).where(eq(carts.id, cart.id));
        cart.userId = user.id;
      }
    }
  }

  // Create new cart if not exists
  if (!cart) {
    const result = await db
      .insert(carts)
      .values({
        userId: user?.id || null,
        sessionId: sessionId,
      })
      .returning();
    cart = result[0];
  }

  return cart;
}

// GET /api/cart - Get cart contents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";

    const cart = await getOrCreateCart();
    const db = getDb();

    const items = await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        price: cartItems.price,
        createdAt: cartItems.createdAt,
        productId: products.id,
        productName: products.name,
        productNameAr: products.nameAr,
        productSlug: products.slug,
        productDescription: products.description,
        productDescriptionAr: products.descriptionAr,
        productBasePrice: products.basePrice,
        productDeliveryType: products.deliveryType,
        productCurrentStock: products.currentStock,
        productMaxQuantity: products.maxQuantity,
        platformId: platforms.id,
        platformName: platforms.name,
        platformNameAr: platforms.nameAr,
        platformSlug: platforms.slug,
        platformIcon: platforms.icon,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productPlatforms, eq(cartItems.platformId, productPlatforms.platformId))
      .leftJoin(platforms, eq(productPlatforms.platformId, platforms.id))
      .where(eq(cartItems.cartId, cart.id));

    // Get images for products
    const productIds = items.map((item) => item.productId);
    const images = productIds.length > 0
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

    const imagesByProduct: Record<string, any[]> = {};
    images.forEach((img) => {
      if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
      imagesByProduct[img.productId].push(img);
    });

    // Format items
    const formattedItems = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price?.toString() || "0",
      product: {
        id: item.productId,
        name: locale === "ar" && item.productNameAr ? item.productNameAr : item.productName,
        nameAr: item.productNameAr,
        slug: item.productSlug,
        description: locale === "ar" && item.productDescriptionAr ? item.productDescriptionAr : item.productDescription,
        descriptionAr: item.productDescriptionAr,
        basePrice: item.productBasePrice?.toString() || "0",
        deliveryType: item.productDeliveryType,
        currentStock: item.productCurrentStock,
        maxQuantity: item.productMaxQuantity,
        images: imagesByProduct[item.productId] || [],
      },
      platform: item.platformId ? {
        id: item.platformId,
        name: locale === "ar" && item.platformNameAr ? item.platformNameAr : item.platformName,
        nameAr: item.platformNameAr,
        slug: item.platformSlug,
        icon: item.platformIcon,
      } : null,
    }));

    // Calculate totals
    const subtotal = formattedItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        id: cart.id,
        items: formattedItems,
        totals: {
          subtotal: subtotal.toString(),
          itemsCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, platformId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const cart = await getOrCreateCart();

    // Verify product exists and is active
    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (!product[0]) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check stock
    if (product[0].currentStock !== null && product[0].currentStock !== -1 && product[0].currentStock < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 }
      );
    }

    // Check if item already exists in cart
    const existingItem = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, productId),
          platformId ? eq(cartItems.platformId, platformId) : sql`${cartItems.platformId} IS NULL`
        )
      )
      .limit(1);

    if (existingItem[0]) {
      // Update quantity
      const newQuantity = existingItem[0].quantity + quantity;
      await db
        .update(cartItems)
        .set({ quantity: newQuantity })
        .where(eq(cartItems.id, existingItem[0].id));
    } else {
      // Add new item
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        platformId: platformId || null,
        quantity,
        price: product[0].basePrice,
      });
    }

    // Update cart timestamp
    await db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    return NextResponse.json({
      success: true,
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity === undefined) {
      return NextResponse.json(
        { error: "Item ID and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const db = getDb();
    const cart = await getOrCreateCart();

    // Verify item belongs to cart
    const item = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!item[0]) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    // Check stock
    const product = await db
      .select({ currentStock: products.currentStock })
      .from(products)
      .where(eq(products.id, item[0].productId))
      .limit(1);

    if (product[0] && product[0].currentStock !== null && product[0].currentStock !== -1 && product[0].currentStock < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 }
      );
    }

    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, itemId));

    return NextResponse.json({
      success: true,
      message: "Cart updated",
    });
  } catch (error) {
    console.error("Update cart error:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const cart = await getOrCreateCart();

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
