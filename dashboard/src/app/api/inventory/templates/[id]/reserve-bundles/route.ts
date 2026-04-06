import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryCatalogItems, inventoryItems, inventoryTemplates, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { templateRequiresCatalogItem } from "@/lib/inventoryCatalog";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  countCodesForFieldWithSchema,
  countCodesInRowWithSchema,
  getTemplateFieldsForCodes,
  peelAtomicCodesFromFieldWithSchema,
  splitCostAcrossUnits,
  type FieldSchemaForCodes,
} from "@/lib/inventoryCodes";

const RESERVE_TTL_MS = 30 * 60 * 1000;

function cloneValues(v: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(v ?? {})) as Record<string, unknown>;
  } catch {
    return { ...(v as Record<string, unknown>) };
  }
}

type ReserveBundlesBody = {
  bundleCount?: number;
  /** Release these reserved lines (same user) before re-reserving */
  previousReservedIds?: string[];
  /** Required when the template has inventory catalog items */
  catalogItemId?: string | null;
};

/**
 * POST /api/inventory/templates/[id]/reserve-bundles
 *
 * Reserve N **bundles** for manual sell: each bundle = one atomic code from every non-empty template field
 * (same row peeled in lockstep). Solves “qty 5 but only 1 code per field” when stock is one multiline row.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id: templateId } = await params;
    const body = (await request.json()) as ReserveBundlesBody;
    const bundleCount = Math.min(500, Math.max(0, Math.floor(Number(body.bundleCount) || 0)));
    const prevRaw = Array.isArray(body.previousReservedIds) ? body.previousReservedIds : [];
    const previousReservedIds = prevRaw.filter(
      (s): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s)
    );
    const catalogItemIdRaw = body.catalogItemId;
    const catalogItemId =
      typeof catalogItemIdRaw === "string" && /^[0-9a-f-]{36}$/i.test(catalogItemIdRaw)
        ? catalogItemIdRaw
        : null;

    if (bundleCount < 0) {
      return NextResponse.json({ success: false, error: "Invalid bundle count" }, { status: 400 });
    }

    const db = getDb();

    const requiresCatalog = await templateRequiresCatalogItem(db, templateId);
    if (requiresCatalog && !catalogItemId) {
      return NextResponse.json(
        { success: false, error: "catalogItemId is required for this template" },
        { status: 400 }
      );
    }
    if (catalogItemId) {
      const [cat] = await db
        .select({ id: inventoryCatalogItems.id })
        .from(inventoryCatalogItems)
        .where(
          and(
            eq(inventoryCatalogItems.id, catalogItemId),
            eq(inventoryCatalogItems.templateId, templateId),
            sql`${inventoryCatalogItems.deletedAt} IS NULL`
          )
        )
        .limit(1);
      if (!cat) {
        return NextResponse.json(
          { success: false, error: "Catalog item not found for this template" },
          { status: 404 }
        );
      }
    }
    const reservedUntil = new Date(Date.now() + RESERVE_TTL_MS);

    const [template] = await db
      .select({ fieldsSchema: inventoryTemplates.fieldsSchema })
      .from(inventoryTemplates)
      .where(and(eq(inventoryTemplates.id, templateId), sql`${inventoryTemplates.deletedAt} IS NULL`))
      .limit(1);

    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const fieldDefs = getTemplateFieldsForCodes(
      Array.isArray(template.fieldsSchema) ? (template.fieldsSchema as FieldSchemaForCodes[]) : []
    );
    if (fieldDefs.length === 0) {
      return NextResponse.json({ success: false, error: "Template has no fields" }, { status: 400 });
    }

    const stockByProduct = new Map<string, number>();
    const bumpStock = (productId: string | null, delta: number) => {
      if (!productId || delta === 0) return;
      stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + delta);
    };

    function maxBundlesInRow(vals: Record<string, unknown>): number {
      let m = Number.POSITIVE_INFINITY;
      for (const f of fieldDefs) {
        const n = countCodesForFieldWithSchema(vals, f);
        m = Math.min(m, n);
      }
      if (!Number.isFinite(m)) return 0;
      return Math.floor(m);
    }

    const result = await db.transaction(async (tx) => {
      if (previousReservedIds.length > 0) {
        await tx
          .update(inventoryItems)
          .set({
            status: "available",
            reservedUntil: null,
            reservedBy: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(inventoryItems.id, previousReservedIds),
              eq(inventoryItems.templateId, templateId),
              eq(inventoryItems.reservedBy, user.id),
              eq(inventoryItems.status, "reserved")
            )
          );
      }

      if (bundleCount === 0) {
        return { rows: [] as Array<{ id: string; values: unknown; cost: string | null }> };
      }

      let remaining = bundleCount;
      const outRows: Array<{ id: string; values: unknown; cost: string | null }> = [];
      const excluded = new Set<string>();

      while (remaining > 0) {
        const cond = [
          eq(inventoryItems.templateId, templateId),
          eq(inventoryItems.status, "available"),
          sql`${inventoryItems.deletedAt} IS NULL`,
        ];
        if (catalogItemId) {
          cond.push(eq(inventoryItems.catalogItemId, catalogItemId));
        }
        if (excluded.size > 0) {
          cond.push(notInArray(inventoryItems.id, [...excluded]));
        }

        const batch = await tx
          .select()
          .from(inventoryItems)
          .where(and(...cond))
          .orderBy(asc(inventoryItems.createdAt))
          .limit(1)
          .for("update", { skipLocked: true });

        const row = batch[0];
        if (!row) break;

        let vals = cloneValues(row.values) as Record<string, unknown>;
        const initialWhole = countCodesInRowWithSchema(vals, fieldDefs);
        const mb = maxBundlesInRow(vals);
        if (mb === 0 || initialWhole === 0) {
          excluded.add(row.id);
          continue;
        }

        const take = Math.min(remaining, mb);
        let sourceCost: string | null = row.cost;

        for (let b = 0; b < take; b++) {
          const wholeNow = countCodesInRowWithSchema(vals, fieldDefs);
          if (wholeNow === 0) break;

          const newVals: Record<string, unknown> = {};

          for (const f of fieldDefs) {
            const raw = vals[f.name];
            const { peeled, remainder } = peelAtomicCodesFromFieldWithSchema(raw, 1, f);
            if (peeled.length === 0) {
              throw new Error("PEEL_FAILED");
            }
            newVals[f.name] = peeled[0] as string | number | boolean;
            vals[f.name] = remainder as string | number | boolean;
          }

          const partCodes = countCodesInRowWithSchema(newVals, fieldDefs);
          const costStr = splitCostAcrossUnits(sourceCost, partCodes, wholeNow);

          const stillAfter = countCodesInRowWithSchema(vals, fieldDefs);
          sourceCost = splitCostAcrossUnits(sourceCost, stillAfter, wholeNow);

          const [ins] = await tx
            .insert(inventoryItems)
            .values({
              templateId: row.templateId,
              productId: row.productId,
              variantId: row.variantId,
              catalogItemId: row.catalogItemId ?? catalogItemId,
              values: newVals as Record<string, string | number | boolean>,
              cost: costStr,
              status: "reserved",
              reservedUntil,
              reservedBy: user.id,
              multiSellEnabled: row.multiSellEnabled,
              multiSellMax: row.multiSellMax,
              multiSellSaleCount: 0,
              cooldownEnabled: row.cooldownEnabled,
              cooldownUntil: row.cooldownUntil,
              cooldownDurationHours: row.cooldownDurationHours,
              updatedAt: new Date(),
            })
            .returning({
              id: inventoryItems.id,
              values: inventoryItems.values,
              cost: inventoryItems.cost,
            });

          outRows.push({ id: ins.id, values: ins.values, cost: ins.cost });
          bumpStock(row.productId, 1);
          remaining -= 1;
        }

        const still = countCodesInRowWithSchema(vals, fieldDefs);

        if (still <= 0) {
          await tx.delete(inventoryItems).where(eq(inventoryItems.id, row.id));
          bumpStock(row.productId, -1);
        } else {
          await tx
            .update(inventoryItems)
            .set({
              values: vals as Record<string, string | number | boolean>,
              cost: sourceCost,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, row.id));
        }
      }

      if (bundleCount > 0 && outRows.length === 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      return { rows: outRows };
    });

    for (const [pid, delta] of stockByProduct) {
      if (delta === 0) continue;
      await db
        .update(products)
        .set({
          stockCount: sql`${products.stockCount} + ${delta}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, pid));
    }

    return NextResponse.json({
      success: true,
      data: {
        rows: result.rows,
        reservedUntil: reservedUntil.toISOString(),
        requestedBundles: bundleCount,
        reservedBundles: result.rows.length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { success: false, error: "Not enough stock to form any bundle" },
          { status: 409 }
        );
      }
      if (error.message === "PEEL_FAILED") {
        return NextResponse.json({ success: false, error: "Could not peel codes from inventory" }, { status: 409 });
      }
    }
    console.error("reserve-bundles error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
