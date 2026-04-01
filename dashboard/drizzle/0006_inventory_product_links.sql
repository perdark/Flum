-- Optional label per stock row
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stock_label VARCHAR(255);

-- Many-to-many: stock lines ↔ products (secondary links; primary remains inventory_items.product_id)
CREATE TABLE IF NOT EXISTS inventory_item_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT inv_item_product_unique UNIQUE (inventory_item_id, product_id)
);

CREATE INDEX IF NOT EXISTS inv_item_product_product_idx ON inventory_item_product_links(product_id);
CREATE INDEX IF NOT EXISTS inv_item_product_item_idx ON inventory_item_product_links(inventory_item_id);

-- Backfill links from existing primary product_id
INSERT INTO inventory_item_product_links (inventory_item_id, product_id)
SELECT id, product_id FROM inventory_items
WHERE product_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT (inventory_item_id, product_id) DO NOTHING;
