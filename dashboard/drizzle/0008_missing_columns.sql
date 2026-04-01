-- Add missing columns to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stock_label VARCHAR(255);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- Create inventory_item_product_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_item_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS inv_item_product_unique ON inventory_item_product_links(inventory_item_id, product_id);
CREATE INDEX IF NOT EXISTS inv_item_product_product_idx ON inventory_item_product_links(product_id);
CREATE INDEX IF NOT EXISTS inv_item_product_item_idx ON inventory_item_product_links(inventory_item_id);
