/**
 * Simple migration runner to make product_id nullable in inventory_items
 * Run with: node scripts/run-migration.js
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Running migration: Making product_id nullable in inventory_items...');

    await sql`
      ALTER TABLE inventory_items
      ALTER COLUMN product_id
      DROP NOT NULL
    `;

    console.log('✓ Migration completed successfully!');
    console.log('You can now add standalone stock without linking to a product.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
