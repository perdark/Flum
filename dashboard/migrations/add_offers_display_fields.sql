-- Migration: Add display settings fields to offers table
-- Run this in your database (Neon PostgreSQL)

-- Add new columns to offers table
ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "display_type" varchar(20) DEFAULT 'banner' NOT NULL,
ADD COLUMN IF NOT EXISTS "display_position" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "background_color" varchar(20),
ADD COLUMN IF NOT EXISTS "text_color" varchar(20) DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS "show_countdown" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "cta_text" varchar(100),
ADD COLUMN IF NOT EXISTS "cta_text_ar" varchar(100),
ADD COLUMN IF NOT EXISTS "cta_link" varchar(500),
ADD COLUMN IF NOT EXISTS "featured_image" varchar(500),
ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "offers_display_type_idx" ON "offers"("display_type");
CREATE INDEX IF NOT EXISTS "offers_display_position_idx" ON "offers"("display_position");

-- Update applies_to to default to 'all' if null
UPDATE "offers" SET "applies_to" = 'all' WHERE "applies_to" IS NULL;
