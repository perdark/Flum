-- inventory_items.variant_id: ties stock lines to product_variants (schema + API already use it)
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid;
CREATE INDEX IF NOT EXISTS "inventory_items_variant_idx" ON "inventory_items" ("variant_id");
