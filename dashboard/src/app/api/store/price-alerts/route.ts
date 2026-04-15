import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { priceAlertSubscriptions, products, productImages } from "@/db/schema";
import { and, eq, desc, isNull, lt, sql } from "drizzle-orm";
import { getStoreCustomer } from "@/lib/customer-auth";
import { isValidUuid } from "@/utils/security";

export async function GET(req: NextRequest) {
  const customer = await getStoreCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const onlyTriggered = req.nextUrl.searchParams.get("triggered") === "1";

  const rows = await db
    .select({
      id: priceAlertSubscriptions.id,
      productId: priceAlertSubscriptions.productId,
      priceAtSubscribe: priceAlertSubscriptions.priceAtSubscribe,
      notifiedAt: priceAlertSubscriptions.notifiedAt,
      lastNotifiedPrice: priceAlertSubscriptions.lastNotifiedPrice,
      createdAt: priceAlertSubscriptions.createdAt,
      productName: products.name,
      productSlug: products.slug,
      currentPrice: products.basePrice,
    })
    .from(priceAlertSubscriptions)
    .innerJoin(products, eq(products.id, priceAlertSubscriptions.productId))
    .where(
      onlyTriggered
        ? and(
            eq(priceAlertSubscriptions.customerId, customer.id),
            isNull(products.deletedAt),
            lt(sql`${products.basePrice}::numeric`, sql`${priceAlertSubscriptions.priceAtSubscribe}::numeric`),
          )
        : and(
            eq(priceAlertSubscriptions.customerId, customer.id),
            isNull(products.deletedAt),
          ),
    )
    .orderBy(desc(priceAlertSubscriptions.createdAt));

  const productIds = rows.map((r) => r.productId);
  const imgMap = new Map<string, string>();
  if (productIds.length > 0) {
    const imgs = await db
      .select({ productId: productImages.productId, url: productImages.url, sortOrder: productImages.sortOrder })
      .from(productImages)
      .where(sql`${productImages.productId} = ANY(${productIds})`);
    const sorted = imgs.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const i of sorted) if (!imgMap.has(i.productId)) imgMap.set(i.productId, i.url);
  }

  const data = rows.map((r) => {
    const current = Number(r.currentPrice);
    const subscribed = Number(r.priceAtSubscribe);
    return {
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productSlug: r.productSlug,
      imageUrl: imgMap.get(r.productId) ?? null,
      priceAtSubscribe: subscribed,
      currentPrice: current,
      dropped: current < subscribed,
      dropAmount: Math.max(0, subscribed - current),
      dropPercent: subscribed > 0 ? Math.max(0, Math.round(((subscribed - current) / subscribed) * 100)) : 0,
      notifiedAt: r.notifiedAt,
      createdAt: r.createdAt,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const customer = await getStoreCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Sign in to get alerts" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const productId = body?.productId;
  const source = typeof body?.source === "string" ? body.source.slice(0, 32) : "product";
  if (!productId || !isValidUuid(productId)) {
    return NextResponse.json({ success: false, error: "Invalid productId" }, { status: 400 });
  }

  const db = getDb();
  const prod = await db
    .select({ id: products.id, basePrice: products.basePrice })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);
  if (!prod[0]) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const inserted = await db
    .insert(priceAlertSubscriptions)
    .values({
      customerId: customer.id,
      productId,
      priceAtSubscribe: prod[0].basePrice,
      source,
    })
    .onConflictDoNothing({
      target: [priceAlertSubscriptions.customerId, priceAlertSubscriptions.productId],
    })
    .returning({ id: priceAlertSubscriptions.id });

  return NextResponse.json({
    success: true,
    data: { subscribed: true, new: inserted.length > 0 },
  });
}

export async function DELETE(req: NextRequest) {
  const customer = await getStoreCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const productId = req.nextUrl.searchParams.get("productId");
  const id = req.nextUrl.searchParams.get("id");
  const db = getDb();

  if (id && isValidUuid(id)) {
    await db
      .delete(priceAlertSubscriptions)
      .where(and(eq(priceAlertSubscriptions.id, id), eq(priceAlertSubscriptions.customerId, customer.id)));
    return NextResponse.json({ success: true });
  }
  if (productId && isValidUuid(productId)) {
    await db
      .delete(priceAlertSubscriptions)
      .where(
        and(
          eq(priceAlertSubscriptions.productId, productId),
          eq(priceAlertSubscriptions.customerId, customer.id),
        ),
      );
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: "id or productId required" }, { status: 400 });
}
