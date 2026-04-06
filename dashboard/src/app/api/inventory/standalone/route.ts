/**
 * Standalone Stock API Route
 *
 * POST /api/inventory/standalone - Add stock without requiring a product
 * Allows adding inventory with nullable productId and nullable templateId
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { inventoryCatalogItems, inventoryItems, products, productVariants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import {
  mergeCatalogIntoValues,
  resolveCatalogInsertContext,
} from "@/lib/inventoryCatalog";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

    const body = await request.json();
    const {
      templateId: templateIdRaw,
      catalogItemId,
      productId,
      items,
      cost,
      eachLineIsProduct,
      variantId,
      batchName,
    } = body as {
      templateId?: string | null;
      catalogItemId?: string | null;
      productId?: string | null;
      items: unknown[];
      cost?: string | number | null;
      eachLineIsProduct?: boolean;
      variantId?: string | null;
      batchName?: string;
    };

    // Validate input - templateId is now optional (for custom-field inventory)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    // If productId is provided, verify it exists
    if (productId) {
      const db = getDb();
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return NextResponse.json(
          { success: false, error: "Product not found" },
          { status: 404 }
        );
      }
    }

    const db = getDb();

    let templateId = templateIdRaw || null;
    if (catalogItemId && !templateId) {
      const [cat] = await db
        .select({ templateId: inventoryCatalogItems.templateId })
        .from(inventoryCatalogItems)
        .where(eq(inventoryCatalogItems.id, catalogItemId))
        .limit(1);
      templateId = cat?.templateId ?? null;
    }

    if (catalogItemId && !templateId) {
      return NextResponse.json(
        { success: false, error: "Invalid catalogItemId or missing template" },
        { status: 400 }
      );
    }

    const catalogCtx = templateId
      ? await resolveCatalogInsertContext(db, templateId, catalogItemId ?? null)
      : { catalogItemId: null as string | null, definingValues: undefined, defaultValues: undefined };
    if ("error" in catalogCtx) {
      return NextResponse.json({ success: false, error: catalogCtx.error }, { status: 400 });
    }
    const ctxOk = catalogCtx;

    // Insert inventory items - templateId is now optional
    const itemsToInsert = (items as Array<Record<string, unknown>>).map((item) => {
      const {
        multiSellEnabled,
        multiSellMax,
        cooldownEnabled,
        cooldownDurationHours,
        ...rest
      } = item as Record<string, unknown>;
      const base: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (k === "_metadata") continue;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          base[k] = v;
        }
      }
      const merged =
        ctxOk.catalogItemId && (ctxOk.definingValues || ctxOk.defaultValues)
          ? mergeCatalogIntoValues(base, ctxOk.definingValues, ctxOk.defaultValues)
          : base;
      return {
        templateId: templateId || null,
        catalogItemId: ctxOk.catalogItemId,
        productId: productId || null,
        variantId: variantId || null,
        cost: cost || null,
        values: {
          ...merged,
          _metadata: {
            eachLineIsProduct,
            hasTemplate: !!templateId,
            ...(batchName ? { batchName } : {}),
            ...(ctxOk.catalogItemId ? { catalogItemId: ctxOk.catalogItemId } : {}),
          },
        },
        status: "available" as const,
        multiSellEnabled: Boolean(multiSellEnabled) || false,
        multiSellMax: Math.max(1, parseInt(String(multiSellMax ?? 5), 10) || 5),
        cooldownEnabled: Boolean(cooldownEnabled) || false,
        cooldownDurationHours: Math.max(1, parseInt(String(cooldownDurationHours ?? 12), 10) || 12),
      };
    });

    const insertedItems = await db
      .insert(inventoryItems)
      .values(itemsToInsert)
      .returning();

    if (productId) {
      await db
        .update(products)
        .set({
          stockCount: sql`${products.stockCount} + ${insertedItems.length}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      // Also update variant stockCount if variant specified
      if (variantId) {
        await db
          .update(productVariants)
          .set({
            stockCount: sql`${productVariants.stockCount} + ${insertedItems.length}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, variantId));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        count: insertedItems.length,
        items: insertedItems,
      },
    }, { status: 201 });
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

    console.error("Standalone stock error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
