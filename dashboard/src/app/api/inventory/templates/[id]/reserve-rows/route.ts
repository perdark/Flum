import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

const RESERVE_TTL_MS = 30 * 60 * 1000;

type ReserveRowsBody = {
  quantity?: number;
  /** Inventory row IDs the client believes it already holds (reserved by this user) */
  heldIds?: string[];
};

/**
 * POST /api/inventory/templates/[id]/reserve-rows
 * Reserve FIFO inventory rows for manual-sell cart (exclusive hold).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(PERMISSIONS.PROCESS_ORDERS);
    const { id: templateId } = await params;
    const body = (await request.json()) as ReserveRowsBody;
    const qty = Math.min(500, Math.max(0, Math.floor(Number(body.quantity) || 0)));
    const heldIdsRaw = Array.isArray(body.heldIds) ? body.heldIds : [];
    const heldIds = heldIdsRaw.filter((s): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s));

    if (qty < 0) {
      return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });
    }

    const db = getDb();
    const reservedUntil = new Date(Date.now() + RESERVE_TTL_MS);

    const result = await db.transaction(async (tx) => {
      const releaseByIds = async (ids: string[]) => {
        if (ids.length === 0) return;
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
              inArray(inventoryItems.id, ids),
              eq(inventoryItems.templateId, templateId),
              eq(inventoryItems.reservedBy, user.id)
            )
          );
      };

      if (qty === 0) {
        if (heldIds.length > 0) {
          await releaseByIds(heldIds);
        }
        return { rows: [] as Array<{
          id: string;
          values: unknown;
          cost: string | null;
          status: string;
          createdAt: Date;
        }> };
      }

      let heldRows =
        heldIds.length > 0
          ? await tx
              .select()
              .from(inventoryItems)
              .where(
                and(
                  inArray(inventoryItems.id, heldIds),
                  eq(inventoryItems.templateId, templateId),
                  eq(inventoryItems.reservedBy, user.id),
                  eq(inventoryItems.status, "reserved"),
                  sql`${inventoryItems.deletedAt} IS NULL`
                )
              )
          : [];

      heldRows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (heldRows.length > qty) {
        const keep = heldRows.slice(0, qty);
        const drop = heldRows.slice(qty).map((r) => r.id);
        await releaseByIds(drop);
        heldRows = keep;
      }

      const need = qty - heldRows.length;
      const newIds: string[] = [];

      if (need > 0) {
        const locked = await tx.execute(sql`
          SELECT id::text AS id
          FROM inventory_items
          WHERE template_id = ${templateId}
            AND deleted_at IS NULL
            AND status = 'available'
          ORDER BY created_at ASC
          LIMIT ${need}
          FOR UPDATE SKIP LOCKED
        `);
        newIds.push(...(locked.rows as { id: string }[]).map((r) => r.id));
        /** Partial reservation: pool may have fewer lines than requested — reserve what exists */
        if (newIds.length > 0) {
          await tx
            .update(inventoryItems)
            .set({
              status: "reserved",
              reservedUntil,
              reservedBy: user.id,
              updatedAt: new Date(),
            })
            .where(inArray(inventoryItems.id, newIds));
        }
      }

      const combinedCount = heldRows.length + newIds.length;
      if (qty > 0 && combinedCount === 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const allIds = [...heldRows.map((r) => r.id), ...newIds];
      if (allIds.length > 0) {
        await tx
          .update(inventoryItems)
          .set({ reservedUntil, updatedAt: new Date() })
          .where(
            and(
              inArray(inventoryItems.id, allIds),
              eq(inventoryItems.reservedBy, user.id),
              eq(inventoryItems.status, "reserved")
            )
          );
      }

      const outRows =
        allIds.length === 0
          ? []
          : await tx
              .select({
                id: inventoryItems.id,
                values: inventoryItems.values,
                cost: inventoryItems.cost,
                status: inventoryItems.status,
                createdAt: inventoryItems.createdAt,
              })
              .from(inventoryItems)
              .where(inArray(inventoryItems.id, allIds))
              .orderBy(asc(inventoryItems.createdAt));

      return { rows: outRows };
    });

    return NextResponse.json({
      success: true,
      data: {
        rows: result.rows,
        reservedUntil: reservedUntil.toISOString(),
        requestedQuantity: qty,
        reservedCount: result.rows.length,
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
          { success: false, error: "Not enough available rows to reserve" },
          { status: 409 }
        );
      }
    }
    console.error("reserve-rows error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
