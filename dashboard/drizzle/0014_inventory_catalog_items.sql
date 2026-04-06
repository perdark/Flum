CREATE TABLE IF NOT EXISTS "inventory_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"defining_values" jsonb,
	"default_values" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "inventory_catalog_items" ADD CONSTRAINT "inventory_catalog_items_template_id_inventory_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."inventory_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_catalog_items_template_name_unique" ON "inventory_catalog_items" USING btree ("template_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_catalog_items_template_idx" ON "inventory_catalog_items" USING btree ("template_id");
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "catalog_item_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_catalog_item_id_inventory_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."inventory_catalog_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_catalog_item_idx" ON "inventory_items" USING btree ("catalog_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_template_catalog_status_idx" ON "inventory_items" USING btree ("template_id","catalog_item_id","status");
