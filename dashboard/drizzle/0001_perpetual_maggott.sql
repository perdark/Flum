ALTER TABLE "order_items" DROP CONSTRAINT "order_items_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "display_type" varchar(20) DEFAULT 'banner' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "display_position" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "background_color" varchar(20);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "text_color" varchar(20) DEFAULT '#FFFFFF';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "show_countdown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "cta_text" varchar(100);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "cta_text_ar" varchar(100);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "cta_link" varchar(500);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "featured_image" varchar(500);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "offers_display_type_idx" ON "offers" USING btree ("display_type");--> statement-breakpoint
CREATE INDEX "offers_display_position_idx" ON "offers" USING btree ("display_position");--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "category_name";