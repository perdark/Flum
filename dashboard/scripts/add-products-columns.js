/**
 * Simple migration script to add missing columns
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Adding missing columns to products table...');

  // Add multi-sell columns to products
  const productStatements = [
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS multi_sell_enabled BOOLEAN DEFAULT false NOT NULL',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS multi_sell_factor INTEGER DEFAULT 5',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS cooldown_enabled BOOLEAN DEFAULT false NOT NULL',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS cooldown_duration_hours INTEGER DEFAULT 12',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false NOT NULL',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_template_id UUID REFERENCES inventory_templates(id)',
    'CREATE INDEX IF NOT EXISTS products_bundle_template_idx ON products(bundle_template_id)',
  ];

  for (const stmt of productStatements) {
    try {
      await sql.query(stmt);
      console.log('✓', stmt.substring(0, 50) + '...');
    } catch (err) {
      console.log('⊘', stmt.substring(0, 50) + '...');
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
