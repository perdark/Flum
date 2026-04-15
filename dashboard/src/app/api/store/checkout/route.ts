import { NextRequest, NextResponse } from "next/server";
import { createGuestStoreOrder } from "@/services/storeCheckout";
import { getStoreCustomer } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const customerName = body.customerName as string | undefined;
    const items = body.items as Array<{ productId: string; quantity: number }> | undefined;
    const couponCode = body.couponCode as string | undefined;
    const paymentMethod =
      typeof body.paymentMethod === "string" && body.paymentMethod.trim()
        ? body.paymentMethod.trim()
        : "zain_cash";

    const customer = await getStoreCustomer();
    const customerEmail = inputEmail || customer?.email || "";

    if (!customerEmail || !items?.length) {
      return NextResponse.json({ success: false, error: "Email and cart items required" }, { status: 400 });
    }

    const { order, checkoutToken } = await createGuestStoreOrder({
      customerEmail,
      customerName: customerName || null,
      items,
      couponCode: couponCode || null,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      paymentMethod,
      customerId: customer?.id ?? null,
      customerType: customer?.type ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderNumber: order.orderNumber,
          total: order.total,
          checkoutToken,
          paymentStatus: order.paymentStatus,
        },
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    console.error("store checkout:", e);
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
