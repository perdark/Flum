/**
 * Applies inventory catalog schema if missing (when `npm run db:migrate` did not run or failed).
 * Fixes: column "catalog_item_id" does not exist / missing inventory_catalog_items table;
 *   missing products.inventory_catalog_item_id (migration 0019).
 *
 * From dashboard directory:
 *   npx tsx scripts/ensure-inventory-catalog-schema.ts
 *
 * After this succeeds, optionally run `npm run db:migrate` so Drizzle’s journal stays aligned.
 */
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(url);

  await sql.unsafe(`
CREATE TABLE IF NOT EXISTS "inventory_catalog_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255),
  "description" text,
  "defining_values" jsonb,
  "default_values" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);
`);

  await sql.unsafe(`
DO $$ BEGIN
  ALTER TABLE "inventory_catalog_items"
    ADD CONSTRAINT "inventory_catalog_items_template_id_inventory_templates_id_fk"
    FOREIGN KEY ("template_id") REFERENCES "public"."inventory_templates"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  await sql.unsafe(`
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_catalog_items_template_name_unique"
  ON "inventory_catalog_items" USING btree ("template_id","name");
`);

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "inventory_catalog_items_template_idx"
  ON "inventory_catalog_items" USING btree ("template_id");
`);

  await sql.unsafe(`
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "catalog_item_id" uuid;
`);

  await sql.unsafe(`
DO $$ BEGIN
  ALTER TABLE "inventory_items"
    ADD CONSTRAINT "inventory_items_catalog_item_id_inventory_catalog_items_id_fk"
    FOREIGN KEY ("catalog_item_id") REFERENCES "public"."inventory_catalog_items"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "inventory_items_catalog_item_idx"
  ON "inventory_items" USING btree ("catalog_item_id");
`);

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "inventory_items_template_catalog_status_idx"
  ON "inventory_items" USING btree ("template_id","catalog_item_id","status");
`);

  // products ↔ catalog SKU (migration 0019) when migrate did not apply
  await sql.unsafe(`
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "inventory_catalog_item_id" uuid;
`);
  await sql.unsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_inventory_catalog_item_id_inventory_catalog_items_id_fk'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_inventory_catalog_item_id_inventory_catalog_items_id_fk"
      FOREIGN KEY ("inventory_catalog_item_id") REFERENCES "inventory_catalog_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
`);
  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "products_inventory_catalog_item_idx" ON "products" ("inventory_catalog_item_id");
`);

  console.log(
    'Done: inventory catalog + inventory_items.catalog_item_id + products.inventory_catalog_item_id.'
  );
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
