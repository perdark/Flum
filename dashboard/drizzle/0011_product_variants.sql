-- product_option_groups, product_option_values, product_variants (match src/db/schema.ts)

CREATE TABLE IF NOT EXISTS "product_option_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_option_groups_product_idx" ON "product_option_groups" ("product_id");

CREATE TABLE IF NOT EXISTS "product_option_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "option_group_id" uuid NOT NULL REFERENCES "product_option_groups"("id") ON DELETE CASCADE,
  "value" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_option_values_group_idx" ON "product_option_values" ("option_group_id");

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "option_combination" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sku" varchar(100),
  "price" numeric(10, 2) NOT NULL,
  "compare_at_price" numeric(10, 2),
  "stock_count" integer DEFAULT 0 NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_variants_product_idx" ON "product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_default_idx" ON "product_variants" ("product_id", "is_default");
