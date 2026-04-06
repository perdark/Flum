import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, orders, orderItems, orderDeliverySnapshots, inventoryTemplates } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "@/services/activityLog";
import { templateRequiresCatalogItem } from "@/lib/inventoryCatalog";

/** PostgreSQL uuid[] literal for ANY() / ALL() */
function sqlUuidArray(ids: string[]) {
  if (ids.length === 0) return sql`ARRAY[]::uuid[]`;
  return sql`ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::uuid[]`;
}

interface TemplateSellRequest {
  templateId: string;
  inventoryIds: string[];
  customerEmail?: string;
  customerName?: string;
  unitPrice?: number;
  label?: string;
  /** Template-backed internal SKU (inventory_catalog_items) */
  catalogItemId?: string;
  catalogItemName?: string;
  /** Read-only: availability vs cart ids (no sale) */
  dryRun?: boolean;
  /** When true (default), missing cart ids are replaced with FIFO rows from the same template */
  fifoReplacement?: boolean;
  /** Original number of lines the cashier wants (defaults to inventoryIds.length) */
  requestedLineCount?: number;
  /** When fewer lines can be sold than requested: complete order vs leave remainder pending */
  shortageHandling?: "complete" | "pending_remainder";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const body = (await request.json()) as TemplateSellRequest;
    const {
      templateId,
      inventoryIds,
      customerEmail,
      customerName,
      unitPrice,
      label,
      dryRun,
      fifoReplacement = true,
      requestedLineCount: requestedLineCountRaw,
      shortageHandling = "complete",
    } = body;

    const catalogItemId =
      typeof body.catalogItemId === "string" && body.catalogItemId.trim().length > 0
        ? body.catalogItemId.trim()
        : null;
    const catalogItemName =
      typeof body.catalogItemName === "string" && body.catalogItemName.trim().length > 0
        ? body.catalogItemName.trim()
        : null;

    const catalogPoolFilter = catalogItemId ? sql`AND catalog_item_id = ${catalogItemId}` : sql``;

    const idList = Array.isArray(inventoryIds)
      ? inventoryIds.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    const reqFromBody = Math.floor(Number(requestedLineCountRaw) || 0);
    const requestedLineCount = Math.max(idList.length, reqFromBody > 0 ? reqFromBody : idList.length);

    if (!templateId || requestedLineCount < 1) {
      return NextResponse.json(
        { success: false, error: "templateId and at least one line (inventoryIds or requestedLineCount) are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [template] = await db
      .select({ id: inventoryTemplates.id, name: inventoryTemplates.name })
      .from(inventoryTemplates)
      .where(eq(inventoryTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const catalogRequired = await templateRequiresCatalogItem(db, templateId);
    if (catalogRequired && !catalogItemId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This template uses inventory products — select a catalog SKU (catalogItemId) to sell stock.",
        },
        { status: 400 }
      );
    }

    if (dryRun) {
      const target = requestedLineCount;

      let matchedIds: string[] = [];
      if (idList.length > 0) {
        const matchedResult = await db.execute(sql`
          SELECT id::text AS id
          FROM inventory_items
          WHERE id = ANY(${sqlUuidArray(idList)})
            AND template_id = ${templateId}
            AND deleted_at IS NULL
            AND (
              status = 'available'
              OR (status = 'reserved' AND reserved_by = ${user.id})
            )
        `);
        matchedIds = (matchedResult.rows as { id: string }[]).map((r) => r.id);
      }

      const matchedCount = matchedIds.length;
      const totalResult = await db.execute(sql`
        SELECT COUNT(*)::text AS c
        FROM inventory_items
        WHERE template_id = ${templateId}
          AND deleted_at IS NULL
          ${catalogPoolFilter}
          AND (
            status = 'available'
            OR (status = 'reserved' AND reserved_by = ${user.id})
          )
      `);
      const totalAvail = parseInt(
        (totalResult.rows[0] as { c: string } | undefined)?.c || "0",
        10
      );

      const needBeyondMatched = Math.max(0, target - matchedCount);
      const poolBeyondMatched = Math.max(0, totalAvail - matchedCount);
      const fifoCan = fifoReplacement ? Math.min(needBeyondMatched, poolBeyondMatched) : 0;

      const sellableWithFifo = matchedCount + fifoCan;
      const shortageWithFifo = Math.max(0, target - sellableWithFifo);
      const sellableStrict = matchedCount;
      const shortageStrict = Math.max(0, target - sellableStrict);

      return NextResponse.json({
        success: true,
        action: "dry_run",
        data: {
          templateId,
          templateName: template.name,
          requestedCount: target,
          cartIdCount: idList.length,
          matchedFromCartIds: matchedCount,
          matchedIds,
          sellableWithFifo,
          shortageWithFifo,
          sellableStrict,
          shortageStrict,
        },
      });
    }

    if (!customerEmail || unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: "customerEmail and unitPrice are required for sale" },
        { status: 400 }
      );
    }

    const target = requestedLineCount;

    const result = await db.transaction(async (tx) => {
      const lockedResult =
        idList.length > 0
          ? await tx.execute(sql`
        SELECT id, values, status, template_id, product_id, catalog_item_id
        FROM inventory_items
        WHERE id = ANY(${sqlUuidArray(idList)})
          AND template_id = ${templateId}
          AND deleted_at IS NULL
          AND (
            status = 'available'
            OR (status = 'reserved' AND reserved_by = ${user.id})
          )
        FOR UPDATE SKIP LOCKED
      `)
          : { rows: [] as unknown[] };


      type RawRow = {
        id: string;
        values: unknown;
        status: string;
        template_id: string;
        product_id: string | null;
        catalog_item_id: string | null;
      };

      let lockedRowsRaw = lockedResult.rows as RawRow[];

      if (catalogItemId) {
        const bad = lockedRowsRaw.filter((r) => r.catalog_item_id !== catalogItemId);
        if (bad.length > 0) {
          throw new Error("Some stock entries do not match the selected inventory product");
        }
      }
      const lockedIds = new Set(lockedRowsRaw.map((r) => r.id));

      let stockRowsRaw = [...lockedRowsRaw];

      if (fifoReplacement && stockRowsRaw.length < target) {
        const excludeIds = [...new Set([...lockedIds])];
        const need = target - stockRowsRaw.length;
        const repResult = await tx.execute(sql`
          SELECT id, values, status, template_id, product_id, catalog_item_id
          FROM inventory_items
          WHERE template_id = ${templateId}
            AND status = 'available'
            AND deleted_at IS NULL
            ${catalogPoolFilter}
            AND id <> ALL(${sqlUuidArray(excludeIds)})
          ORDER BY created_at ASC
          LIMIT ${need}
          FOR UPDATE SKIP LOCKED
        `);
        stockRowsRaw = [...stockRowsRaw, ...(repResult.rows as RawRow[])];
      }

      const replacementRowsRaw = stockRowsRaw.filter((r) => !lockedIds.has(r.id));

      if (stockRowsRaw.length === 0) {
        throw new Error("No available stock entries found");
      }

      const stockRows = stockRowsRaw.map((r) => ({
        id: r.id,
        values: r.values,
      }));

      const soldCount = stockRows.length;
      const hadReplacements = replacementRowsRaw.length > 0;
      const missingFromCart = idList.filter((id) => !lockedIds.has(id));
      const isPendingRemainder =
        shortageHandling === "pending_remainder" && soldCount < target;

      for (const row of stockRows) {
        await tx
          .update(inventoryItems)
          .set({
            status: "sold",
            reservedUntil: null,
            reservedBy: null,
            purchasedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, row.id));
      }

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const lineTotal = (unitPrice * soldCount).toFixed(2);

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerEmail,
          customerName: customerName || null,
          subtotal: lineTotal,
          discount: "0",
          total: lineTotal,
          status: isPendingRemainder ? "pending" : "completed",
          fulfillmentStatus: isPendingRemainder ? "pending" : "delivered",
          paymentMethod: "manual",
          paymentStatus: "completed",
          processedBy: user.id,
          deliveredAt: isPendingRemainder ? null : new Date(),
          claimedBy: isPendingRemainder ? user.id : null,
          claimedAt: isPendingRemainder ? new Date() : null,
          claimExpiresAt: isPendingRemainder ? new Date(Date.now() + 30 * 60 * 1000) : null,
          metadata: {
            saleSource: "manual_template",
            templateId,
            templateName: template.name,
            requestedTemplateLines: target,
            fulfilledTemplateLines: soldCount,
            ...(catalogItemId
              ? {
                  catalogItemId,
                  ...(catalogItemName ? { catalogItemName } : {}),
                }
              : {}),
            ...(hadReplacements
              ? {
                  replacedItems: missingFromCart,
                  replacementCount: replacementRowsRaw.length,
                }
              : {}),
          },
        })
        .returning();

      const orderItemName = label || `${template.name} Stock`;
      const [oi] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          productId: null,
          productName: orderItemName,
          productSlug: orderItemName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          deliveryType: "auto",
          price: unitPrice.toString(),
          quantity: isPendingRemainder ? target : soldCount,
          subtotal: lineTotal,
          fulfilledQuantity: soldCount,
          deliveredInventoryIds: sql`${JSON.stringify(stockRows.map((r) => r.id))}::jsonb`,
        })
        .returning();

      for (const row of stockRows) {
        await tx
          .update(inventoryItems)
          .set({ orderItemId: oi.id })
          .where(eq(inventoryItems.id, row.id));
      }

      await tx.insert(orderDeliverySnapshots).values({
        orderId: order.id,
        payload: {
          items: [
            {
              productId: null,
              productName: orderItemName,
              quantity: soldCount,
              items: stockRows.map((r) => ({
                inventoryId: r.id,
                values: r.values as Record<string, string | number | boolean>,
              })),
            },
          ],
        },
        createdBy: user.id,
      });

      return { order, soldCount, isPendingRemainder, target };
    });

    await logActivity({
      userId: user.id,
      action: "manual_template_sell",
      entity: "order",
      entityId: result.order.id,
      metadata: {
        templateId,
        templateName: template.name,
        soldCount: result.soldCount,
        pendingRemainder: result.isPendingRemainder,
        ...(catalogItemId ? { catalogItemId, ...(catalogItemName ? { catalogItemName } : {}) } : {}),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: result.order.id,
          order: result.order,
          soldCount: result.soldCount,
          requestedLineCount: result.target,
          isPendingRemainder: result.isPendingRemainder,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      if (
        error.message === "No available stock entries found" ||
        error.message.startsWith("Some stock entries")
      )
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error("Template sell error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
