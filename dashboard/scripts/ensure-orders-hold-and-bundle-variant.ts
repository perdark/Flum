/**
 * Adds columns introduced in m.txt when migrations were not applied:
 * - orders.hold_until
 * - bundle_items.variant_id (+ FK to product_variants)
 *
 * From dashboard directory:
 *   npx tsx scripts/ensure-orders-hold-and-bundle-variant.ts
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

  await sql.unsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "hold_until" timestamp;`);

  await sql.unsafe(
    `ALTER TABLE "bundle_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid;`
  );

  await sql.unsafe(`
DO $$ BEGIN
  ALTER TABLE "bundle_items"
    ADD CONSTRAINT "bundle_items_variant_id_product_variants_id_fk"
    FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  console.log("OK: orders.hold_until and bundle_items.variant_id are present.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
