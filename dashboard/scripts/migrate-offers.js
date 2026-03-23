/**
 * Run offers table migration directly
 * Usage: node scripts/migrate-offers.js
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});
const db = drizzle({ client: pool });

async function migrate() {
  console.log('Running offers table migration...');

  try {
    // Add new columns to offers table
    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "display_type" varchar(20) DEFAULT 'banner' NOT NULL
    `);
    console.log('✓ Added display_type column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "display_position" integer DEFAULT 0
    `);
    console.log('✓ Added display_position column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "background_color" varchar(20)
    `);
    console.log('✓ Added background_color column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "text_color" varchar(20) DEFAULT '#FFFFFF'
    `);
    console.log('✓ Added text_color column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "show_countdown" boolean DEFAULT false NOT NULL
    `);
    console.log('✓ Added show_countdown column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "cta_text" varchar(100)
    `);
    console.log('✓ Added cta_text column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "cta_text_ar" varchar(100)
    `);
    console.log('✓ Added cta_text_ar column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "cta_link" varchar(500)
    `);
    console.log('✓ Added cta_link column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "featured_image" varchar(500)
    `);
    console.log('✓ Added featured_image column');

    await db.execute(sql`
      ALTER TABLE "offers"
      ADD COLUMN IF NOT EXISTS "deleted_at" timestamp
    `);
    console.log('✓ Added deleted_at column');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "offers_display_type_idx" ON "offers" ("display_type")
    `);
    console.log('✓ Created offers_display_type_idx index');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "offers_display_position_idx" ON "offers" ("display_position")
    `);
    console.log('✓ Created offers_display_position_idx index');

    console.log('\n✅ Migration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrate();
