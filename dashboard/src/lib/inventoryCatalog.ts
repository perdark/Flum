import { getDb } from "@/db";
import { inventoryCatalogItems } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type CatalogInsertContext = {
  catalogItemId: string | null;
  definingValues?: Record<string, string | number | boolean>;
  defaultValues?: Record<string, string | number | boolean>;
};

/** Resolve catalog row and enforce rules when inserting stock for a template. */
export async function resolveCatalogInsertContext(
  db: Db,
  templateId: string,
  catalogItemId: string | null | undefined
): Promise<CatalogInsertContext | { error: string }> {
  const requires = await templateRequiresCatalogItem(db, templateId);
  if (requires && !catalogItemId) {
    return { error: "This template uses inventory catalog items; catalogItemId is required when adding stock." };
  }
  if (!catalogItemId) {
    return { catalogItemId: null };
  }
  const [row] = await db
    .select()
    .from(inventoryCatalogItems)
    .where(
      and(
        eq(inventoryCatalogItems.id, catalogItemId),
        eq(inventoryCatalogItems.templateId, templateId),
        isNull(inventoryCatalogItems.deletedAt)
      )
    )
    .limit(1);
  if (!row) {
    return { error: "Catalog item not found for this template" };
  }
  if (!row.isActive) {
    return { error: "Catalog item is inactive" };
  }
  return {
    catalogItemId: row.id,
    definingValues: row.definingValues ?? undefined,
    defaultValues: row.defaultValues ?? undefined,
  };
}

/** True if template has at least one non-deleted catalog item (new stock must set catalogItemId). */
export async function templateRequiresCatalogItem(db: Db, templateId: string): Promise<boolean> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(inventoryCatalogItems)
    .where(
      and(
        eq(inventoryCatalogItems.templateId, templateId),
        isNull(inventoryCatalogItems.deletedAt)
      )
    );
  return (row?.c ?? 0) > 0;
}

export function valuesMatchDefining(
  values: Record<string, unknown>,
  defining: Record<string, string | number | boolean> | null | undefined
): boolean {
  if (!defining || Object.keys(defining).length === 0) return true;
  for (const [k, expected] of Object.entries(defining)) {
    const actual = values[k];
    if (actual === undefined || actual === null) return false;
    if (String(actual) !== String(expected)) return false;
  }
  return true;
}

/** Merge defining + default + row values (defining wins for fixed keys). */
export function mergeCatalogIntoValues(
  rowValues: Record<string, string | number | boolean>,
  defining: Record<string, string | number | boolean> | null | undefined,
  defaults: Record<string, string | number | boolean> | null | undefined
): Record<string, string | number | boolean> {
  const out = { ...rowValues };
  if (defaults) {
    for (const [k, v] of Object.entries(defaults)) {
      if (out[k] === undefined || out[k] === null || out[k] === "") {
        out[k] = v;
      }
    }
  }
  if (defining) {
    for (const [k, v] of Object.entries(defining)) {
      out[k] = v;
    }
  }
  return out;
}
