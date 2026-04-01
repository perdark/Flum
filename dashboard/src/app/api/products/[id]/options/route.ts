/**
 * Product Options API Routes
 *
 * Manages option groups (e.g. "Platform", "Region") and their values
 * (e.g. "Steam", "Epic" / "US", "EU"). Also supports auto-generating
 * variant combinations from the cartesian product of all option values.
 *
 * GET  /api/products/[id]/options            - Get option groups with values
 * PUT  /api/products/[id]/options            - Bulk save option groups + values (reconcile)
 * POST /api/products/[id]/options/generate   - (via action=generate in body) Generate variant combos
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  products,
  productOptionGroups,
  productOptionValues,
  productVariants,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, inArray } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// GET /api/products/[id]/options - Get option groups with values
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.VIEW_PRODUCTS);
    const { id } = await context.params;
    const db = getDb();

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, id))
      .orderBy(productOptionGroups.sortOrder);

    const groupIds = groups.map((g) => g.id);
    let values: (typeof productOptionValues.$inferSelect)[] = [];
    if (groupIds.length > 0) {
      values = await db
        .select()
        .from(productOptionValues)
        .where(inArray(productOptionValues.optionGroupId, groupIds))
        .orderBy(productOptionValues.sortOrder);
    }

    const data = groups.map((g) => ({
      ...g,
      values: values.filter((v) => v.optionGroupId === g.id),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Get options error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/products/[id]/options - Bulk save option groups + values
// ============================================================================
//
// Body: { groups: [{ name, sortOrder, values: [{ value, sortOrder }] }] }
//
// This is a full reconcile — it replaces all existing groups/values for the
// product. Existing variants are NOT touched (use POST with action=generate
// to regenerate variant combos).

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { groups } = body as {
      groups: Array<{
        name: string;
        sortOrder?: number;
        values: Array<{ value: string; sortOrder?: number }>;
      }>;
    };

    if (!Array.isArray(groups)) {
      return NextResponse.json(
        { success: false, error: "groups array is required" },
        { status: 400 }
      );
    }

    // Validate: each group needs a name and at least one value
    for (const g of groups) {
      if (!g.name?.trim()) {
        return NextResponse.json(
          { success: false, error: "Each option group must have a name" },
          { status: 400 }
        );
      }
      if (!Array.isArray(g.values) || g.values.length === 0) {
        return NextResponse.json(
          { success: false, error: `Option group "${g.name}" must have at least one value` },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Full reconcile in a transaction
    const result = await db.transaction(async (tx) => {
      // Delete existing groups (cascade deletes values)
      await tx
        .delete(productOptionGroups)
        .where(eq(productOptionGroups.productId, id));

      if (groups.length === 0) {
        return [];
      }

      // Insert new groups
      const insertedGroups = await tx
        .insert(productOptionGroups)
        .values(
          groups.map((g, idx) => ({
            productId: id,
            name: g.name.trim(),
            sortOrder: g.sortOrder ?? idx,
          }))
        )
        .returning();

      // Insert values for each group
      const allValues: Array<{
        optionGroupId: string;
        value: string;
        sortOrder: number;
      }> = [];

      for (let i = 0; i < insertedGroups.length; i++) {
        const group = insertedGroups[i];
        const inputValues = groups[i].values;
        for (let j = 0; j < inputValues.length; j++) {
          allValues.push({
            optionGroupId: group.id,
            value: inputValues[j].value.trim(),
            sortOrder: inputValues[j].sortOrder ?? j,
          });
        }
      }

      let insertedValues: (typeof productOptionValues.$inferSelect)[] = [];
      if (allValues.length > 0) {
        insertedValues = await tx
          .insert(productOptionValues)
          .values(allValues)
          .returning();
      }

      return insertedGroups.map((g) => ({
        ...g,
        values: insertedValues.filter((v) => v.optionGroupId === g.id),
      }));
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Save options error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/products/[id]/options - Generate variant combinations
// ============================================================================
//
// Body: { action: "generate", basePrice?: number }
//
// Takes the cartesian product of all option group values and creates variants
// for any combinations that don't already exist. Removes the default variant
// if real option-based variants are generated.

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
    const { id } = await context.params;
    const body = await request.json();
    const { action, basePrice } = body;

    if (action !== "generate") {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use: generate" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify product
    const [product] = await db
      .select({ id: products.id, basePrice: products.basePrice })
      .from(products)
      .where(and(eq(products.id, id), sql`products.deleted_at IS NULL`))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Get all option groups + values
    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(eq(productOptionGroups.productId, id))
      .orderBy(productOptionGroups.sortOrder);

    if (groups.length === 0) {
      return NextResponse.json(
        { success: false, error: "No option groups defined. Add option groups first." },
        { status: 400 }
      );
    }

    const groupIds = groups.map((g) => g.id);
    const values = await db
      .select()
      .from(productOptionValues)
      .where(inArray(productOptionValues.optionGroupId, groupIds))
      .orderBy(productOptionValues.sortOrder);

    // Build map of groupId → { name, values[] }
    const groupMap = new Map<string, { name: string; values: string[] }>();
    for (const g of groups) {
      groupMap.set(g.id, {
        name: g.name,
        values: values.filter((v) => v.optionGroupId === g.id).map((v) => v.value),
      });
    }

    // Cartesian product of all option values
    const axes = groups.map((g) => {
      const entry = groupMap.get(g.id)!;
      return { name: entry.name, values: entry.values };
    });

    const combinations = cartesian(axes);

    if (combinations.length === 0) {
      return NextResponse.json(
        { success: false, error: "No combinations could be generated" },
        { status: 400 }
      );
    }

    // Get existing variants
    const existingVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    const price = basePrice ? basePrice.toString() : product.basePrice;

    // Figure out which combos already exist
    const existingCombos = new Set(
      existingVariants
        .filter((v) => !v.isDefault || Object.keys(v.optionCombination).length > 0)
        .map((v) => JSON.stringify(v.optionCombination))
    );

    const newCombos = combinations.filter(
      (combo) => !existingCombos.has(JSON.stringify(combo))
    );

    const result = await db.transaction(async (tx) => {
      // Remove the default empty variant if we're adding real ones
      const defaultVariant = existingVariants.find(
        (v) => v.isDefault && Object.keys(v.optionCombination).length === 0
      );
      if (defaultVariant && newCombos.length > 0) {
        await tx
          .delete(productVariants)
          .where(eq(productVariants.id, defaultVariant.id));
      }

      if (newCombos.length === 0) {
        return { created: 0, total: existingVariants.length };
      }

      // Insert new variants
      const inserted = await tx
        .insert(productVariants)
        .values(
          newCombos.map((combo, idx) => ({
            productId: id,
            optionCombination: combo,
            price,
            isDefault: idx === 0 && existingCombos.size === 0,
            isActive: true,
          }))
        )
        .returning();

      return {
        created: inserted.length,
        total: existingVariants.length - (defaultVariant ? 1 : 0) + inserted.length,
        variants: inserted,
      };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }
    console.error("Generate variants error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// Helper: cartesian product
// ============================================================================

function cartesian(
  axes: Array<{ name: string; values: string[] }>
): Array<Record<string, string>> {
  if (axes.length === 0) return [];

  let result: Array<Record<string, string>> = [{}];

  for (const axis of axes) {
    const next: Array<Record<string, string>> = [];
    for (const existing of result) {
      for (const value of axis.values) {
        next.push({ ...existing, [axis.name]: value });
      }
    }
    result = next;
  }

  return result;
}
