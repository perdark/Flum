/**
 * Demo: one "Steam"-style template (5 fields), two catalog SKUs (2 month / 3 month),
 * and a few available stock rows per SKU with random placeholder values.
 *
 * Prerequisites:
 * - DATABASE_URL in .env (same as the Next.js app).
 * - Migration 0014 applied so `inventory_catalog_items` and `inventory_items.catalog_item_id` exist:
 *     cd dashboard && npm run db:migrate
 *
 * Run from the dashboard directory:
 *   npx tsx scripts/seed-inventory-catalog-demo.ts
 */
import "dotenv/config";
import { randomBytes } from "crypto";
import { getDb } from "../src/db";
import { inventoryTemplates, inventoryCatalogItems, inventoryItems } from "../src/db/schema";
import { mergeCatalogIntoValues } from "../src/lib/inventoryCatalog";
import { eq, and, isNull } from "drizzle-orm";

const TEMPLATE_NAME = "Steam accounts (catalog demo)";
const ROWS_PER_SKU = 5;

function baseField(
  name: string,
  label: string,
  type: "string" | "number" | "boolean" | "multiline",
  displayOrder: number
) {
  return {
    name,
    type,
    required: false,
    label,
    isVisibleToAdmin: true,
    isVisibleToMerchant: true,
    isVisibleToCustomer: true,
    repeatable: false,
    eachLineIsProduct: false,
    parentId: null,
    displayOrder,
    linkedTo: null,
    linkGroup: null,
  };
}

const fieldsSchema = [
  baseField("duration_months", "Duration (months)", "number", 0),
  baseField("login", "Login", "string", 1),
  baseField("password", "Password", "string", 2),
  baseField("email", "Email", "string", 3),
  baseField("recovery_code", "Recovery code", "multiline", 4),
];

function randomPlaceholderRow(): Record<string, string | number | boolean> {
  const id = randomBytes(5).toString("hex");
  return {
    duration_months: 0,
    login: `steam_user_${id}`,
    password: `pw_${randomBytes(6).toString("hex")}`,
    email: `buyer_${id}@demo.invalid`,
    recovery_code: `line1-${id}\nline2-${randomBytes(3).toString("hex")}`,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const db = getDb();

  const [existingTpl] = await db
    .select({ id: inventoryTemplates.id })
    .from(inventoryTemplates)
    .where(and(eq(inventoryTemplates.name, TEMPLATE_NAME), isNull(inventoryTemplates.deletedAt)))
    .limit(1);

  if (existingTpl) {
    console.error(
      `Template "${TEMPLATE_NAME}" already exists (id=${existingTpl.id}). Delete it or rename TEMPLATE_NAME in the script.`
    );
    process.exit(1);
  }

  const [template] = await db
    .insert(inventoryTemplates)
    .values({
      name: TEMPLATE_NAME,
      description: "Seeded demo: Steam-style accounts with catalog SKUs by duration.",
      fieldsSchema,
      isActive: true,
      multiSellEnabled: false,
      multiSellMax: 5,
      cooldownEnabled: false,
      cooldownDurationHours: 12,
      color: null,
      icon: null,
    })
    .returning();

  const [cat2] = await db
    .insert(inventoryCatalogItems)
    .values({
      templateId: template.id,
      name: "Steam 2 month",
      slug: null,
      description: "Two-month SKU",
      definingValues: { duration_months: 2 },
      defaultValues: null,
      isActive: true,
      sortOrder: 0,
    })
    .returning();

  const [cat3] = await db
    .insert(inventoryCatalogItems)
    .values({
      templateId: template.id,
      name: "Steam 3 month",
      slug: null,
      description: "Three-month SKU",
      definingValues: { duration_months: 3 },
      defaultValues: null,
      isActive: true,
      sortOrder: 1,
    })
    .returning();

  const skus = [
    { row: cat2, label: "Steam 2 month" },
    { row: cat3, label: "Steam 3 month" },
  ];

  let inserted = 0;
  for (const { row: catalog, label } of skus) {
    const defining = catalog.definingValues ?? undefined;
    for (let i = 0; i < ROWS_PER_SKU; i++) {
      const raw = randomPlaceholderRow();
      const values = mergeCatalogIntoValues(raw, defining, undefined);
      await db.insert(inventoryItems).values({
        templateId: template.id,
        catalogItemId: catalog.id,
        productId: null,
        values,
        status: "available",
      });
      inserted++;
    }
    console.log(`Inserted ${ROWS_PER_SKU} stock row(s) for ${label} (catalog ${catalog.id})`);
  }

  console.log("\nDone.");
  console.log(`  templateId:       ${template.id}`);
  console.log(`  catalog 2 month:  ${cat2.id}`);
  console.log(`  catalog 3 month:  ${cat3.id}`);
  console.log(`  total stock rows: ${inserted}`);
  console.log("\nNext: open /dashboard/inventory and /dashboard/manual-sell — use Stocks tab to sell by SKU.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
