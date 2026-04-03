import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, inventoryTemplates, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import {
  countCodesForFieldWithSchema,
  countCodesInRowWithSchema,
  getTemplateFieldsForCodes,
  peelAtomicCodesFromFieldWithSchema,
  type FieldSchemaForCodes,
} from "@/lib/inventoryCodes";

function cloneValues(v: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(v ?? {})) as Record<string, unknown>;
  } catch {
    return { ...(v as Record<string, unknown>) };
  }
}

function splitCost(total: string | null, part: number, whole: number): string | null {
  if (!total || whole <= 0 || part <= 0) return total;
  const t = parseFloat(total);
  if (!Number.isFinite(t) || t <= 0) return total;
  const u = (t * part) / whole;
  return u.toFixed(2);
}

/**
 * POST — Reserve up to `quantity` codes from a template field (FIFO).
 * Splits multiline/array rows into separate inventory rows so each code is one cart line.
 * Respects `wholeFieldIsOneItem` (whole field = one peel, no splitting).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id: templateId } = await params;
    const body = await request.json();
    const { fieldName, quantity, excludeIds: excludeBody } = body as {
      fieldName?: string;
      quantity?: number;
      excludeIds?: string[];
    };

    if (!fieldName || typeof fieldName !== "string") {
      return NextResponse.json({ success: false, error: "fieldName is required" }, { status: 400 });
    }
    const qty = Math.min(500, Math.max(1, Math.floor(Number(quantity) || 0)));
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ success: false, error: "quantity must be at least 1" }, { status: 400 });
    }

    const excludeIds = Array.isArray(excludeBody)
      ? excludeBody.filter((s): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s))
      : [];

    const db = getDb();

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
    const fieldDef = fieldDefs.find((f) => f.name === fieldName);
    if (!fieldDef) {
      return NextResponse.json({ success: false, error: "Unknown field for this template" }, { status: 400 });
    }

    const entries: Array<{ id: string; cost: string | null; valuePreview: string }> = [];
    const stockByProduct = new Map<string, number>();

    const bumpStock = (productId: string | null, delta: number) => {
      if (!productId || delta === 0) return;
      stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + delta);
    };

    function fieldHasCodes(vals: Record<string, unknown>, fd: FieldSchemaForCodes): boolean {
      return countCodesForFieldWithSchema(vals, fd) > 0;
    }

    await db.transaction(async (tx) => {
      let remaining = qty;
      const localExclude = new Set(excludeIds);

      while (remaining > 0) {
        const conditions = [
          eq(inventoryItems.templateId, templateId),
          eq(inventoryItems.status, "available"),
          sql`${inventoryItems.deletedAt} IS NULL`,
        ];
        if (localExclude.size > 0) {
          conditions.push(notInArray(inventoryItems.id, [...localExclude]));
        }

        const batch = await tx
          .select()
          .from(inventoryItems)
          .where(and(...conditions))
          .orderBy(asc(inventoryItems.createdAt))
          .limit(80);

        const row = batch.find((r) => fieldHasCodes(r.values as Record<string, unknown>, fieldDef));
        if (!row) break;

        const vals = row.values as Record<string, unknown>;
        const c = countCodesForFieldWithSchema(vals, fieldDef);
        if (c <= 0) break;

        const take = Math.min(remaining, c);

        if (c === 1 && take === 1) {
          localExclude.add(row.id);
          const raw = vals[fieldName];
          const valuePreview =
            raw === undefined || raw === null ? "—" : String(raw).slice(0, 80);
          entries.push({
            id: row.id,
            cost: row.cost,
            valuePreview,
          });
          remaining -= 1;
          continue;
        }

        const rawField = vals[fieldName];
        const { peeled, remainder } = peelAtomicCodesFromFieldWithSchema(rawField, take, fieldDef);
        if (peeled.length === 0) break;

        const baseCost = row.cost;
        for (const atom of peeled) {
          const newVals = cloneValues(vals);
          newVals[fieldName] = atom as string | number | boolean;
          const [ins] = await tx
            .insert(inventoryItems)
            .values({
              templateId: row.templateId,
              productId: row.productId,
              variantId: row.variantId,
              values: newVals as Record<string, string | number | boolean>,
              cost: splitCost(baseCost, 1, c),
              status: "available" as const,
              multiSellEnabled: row.multiSellEnabled,
              multiSellMax: row.multiSellMax,
              multiSellSaleCount: 0,
              cooldownEnabled: row.cooldownEnabled,
              cooldownUntil: row.cooldownUntil,
              cooldownDurationHours: row.cooldownDurationHours,
            })
            .returning();
          entries.push({
            id: ins.id,
            cost: ins.cost,
            valuePreview: atom === undefined || atom === null ? "—" : String(atom).slice(0, 80),
          });
        }

        bumpStock(row.productId, peeled.length);

        const remCount =
          remainder != null ? countCodesForFieldWithSchema({ [fieldName]: remainder }, fieldDef) : 0;
        const updatedVals = cloneValues(vals);

        if (remainder != null && remCount > 0) {
          updatedVals[fieldName] = remainder as string | number | boolean;
          const newCost = baseCost && c > 0 ? splitCost(baseCost, remCount, c) : baseCost;
          await tx
            .update(inventoryItems)
            .set({
              values: updatedVals as Record<string, string | number | boolean>,
              cost: newCost,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, row.id));
        } else {
          delete updatedVals[fieldName];
          const still = countCodesInRowWithSchema(updatedVals, fieldDefs);
          if (still <= 0) {
            await tx.delete(inventoryItems).where(eq(inventoryItems.id, row.id));
            bumpStock(row.productId, -1);
          } else {
            await tx
              .update(inventoryItems)
              .set({
                values: updatedVals as Record<string, string | number | boolean>,
                updatedAt: new Date(),
              })
              .where(eq(inventoryItems.id, row.id));
          }
        }

        remaining -= peeled.length;
      }
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
        entries,
        reserved: entries.length,
        requested: qty,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    console.error("reserve-codes error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
