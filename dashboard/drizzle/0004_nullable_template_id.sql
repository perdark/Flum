-- Make inventory_items.template_id nullable (for custom-field inventory items)
ALTER TABLE "inventory_items" ALTER COLUMN "template_id" DROP NOT NULL;
--> statement-breakpoint
