ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "inventory_catalog_item_id" uuid;
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
CREATE INDEX IF NOT EXISTS "products_inventory_catalog_item_idx" ON "products" ("inventory_catalog_item_id");
