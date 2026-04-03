ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "reserved_by" uuid REFERENCES "users"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "inventory_items_reserved_by_idx" ON "inventory_items" ("reserved_by");
