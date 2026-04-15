ALTER TABLE "bundle_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE SET NULL;
