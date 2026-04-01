ALTER TABLE "inventory_items" ADD COLUMN "custom_fields" jsonb DEFAULT '[]'::jsonb;
