-- product_tags (match src/db/schema.ts)

CREATE TABLE IF NOT EXISTS "product_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "tag" varchar(100) NOT NULL,
  "tag_group" varchar(50) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_tags_product_idx" ON "product_tags" ("product_id");
CREATE INDEX IF NOT EXISTS "product_tags_tag_group_idx" ON "product_tags" ("tag_group");
