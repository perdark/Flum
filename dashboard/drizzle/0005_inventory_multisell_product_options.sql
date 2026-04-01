-- Multi-sell moved to inventory_items; product purchase options & region prices

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "multi_sell_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "multi_sell_max" integer DEFAULT 5 NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "multi_sell_sale_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cooldown_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cooldown_until" timestamp;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cooldown_duration_hours" integer DEFAULT 12 NOT NULL;

CREATE TABLE IF NOT EXISTS "product_purchase_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
	"slug" varchar(80) NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_keys" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_purchase_options_product_idx" ON "product_purchase_options" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_purchase_options_product_slug" ON "product_purchase_options" ("product_id", "slug");

CREATE TABLE IF NOT EXISTS "product_region_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
	"purchase_option_id" uuid REFERENCES "product_purchase_options"("id") ON DELETE cascade,
	"region_code" varchar(50) NOT NULL,
	"price" decimal(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_region_prices_product_idx" ON "product_region_prices" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_region_prices_global" ON "product_region_prices" ("product_id", "region_code") WHERE "purchase_option_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "product_region_prices_opt" ON "product_region_prices" ("product_id", "region_code", "purchase_option_id") WHERE "purchase_option_id" IS NOT NULL;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "purchase_option_id" uuid REFERENCES "product_purchase_options"("id") ON DELETE set null;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "region_code" varchar(50);
