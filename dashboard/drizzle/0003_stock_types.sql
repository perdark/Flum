-- Stock Types table
CREATE TABLE IF NOT EXISTS "stock_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"fields_schema" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "stock_types_name_unique" UNIQUE("name"),
	CONSTRAINT "stock_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_types_name_idx" ON "stock_types" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_types_slug_idx" ON "stock_types" USING btree ("slug");
--> statement-breakpoint

-- Add stock_type_id to inventory_templates
ALTER TABLE "inventory_templates" ADD COLUMN IF NOT EXISTS "stock_type_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_templates" ADD CONSTRAINT "inventory_templates_stock_type_id_stock_types_id_fk" FOREIGN KEY ("stock_type_id") REFERENCES "public"."stock_types"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_templates_stock_type_idx" ON "inventory_templates" USING btree ("stock_type_id");
--> statement-breakpoint

-- Seed default stock types
INSERT INTO "stock_types" ("name", "slug", "description", "icon", "color", "fields_schema", "is_system") VALUES
('Account Credentials', 'account_credentials', 'Code + Email + Password combo. Email and password are linked pairs.', 'key', 'amber', '[
  {"name": "code", "type": "string", "required": true, "label": "Code", "isVisibleToAdmin": true, "isVisibleToMerchant": false, "isVisibleToCustomer": true, "repeatable": false, "eachLineIsProduct": false, "linkedTo": null, "linkGroup": null, "parentId": null, "displayOrder": 0},
  {"name": "email", "type": "string", "required": true, "label": "Email", "isVisibleToAdmin": true, "isVisibleToMerchant": false, "isVisibleToCustomer": true, "repeatable": false, "eachLineIsProduct": false, "linkedTo": "password", "linkGroup": "credentials", "parentId": null, "displayOrder": 1},
  {"name": "password", "type": "string", "required": true, "label": "Password", "isVisibleToAdmin": true, "isVisibleToMerchant": false, "isVisibleToCustomer": true, "repeatable": false, "eachLineIsProduct": false, "linkedTo": "email", "linkGroup": "credentials", "parentId": null, "displayOrder": 2}
]'::jsonb, true),
('Code Only', 'code_only', 'Single code field. Manual delivery from orders page.', 'hash', 'blue', '[
  {"name": "code", "type": "string", "required": true, "label": "Code", "isVisibleToAdmin": true, "isVisibleToMerchant": false, "isVisibleToCustomer": true, "repeatable": false, "eachLineIsProduct": false, "linkedTo": null, "linkGroup": null, "parentId": null, "displayOrder": 0}
]'::jsonb, true),
('Bundle', 'bundle', 'Auto-pulls from sub-product inventories. No own fields.', 'package', 'purple', '[]'::jsonb, true)
ON CONFLICT (name) DO NOTHING;
