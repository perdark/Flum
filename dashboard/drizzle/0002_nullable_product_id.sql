-- Make productId nullable in inventory_items to support standalone stock
-- This allows adding inventory without requiring a product first

ALTER TABLE `inventory_items` ALTER COLUMN `product_id` DROP NOT NULL;
