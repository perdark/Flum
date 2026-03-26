/**
 * Migration to add cost column to order_items table
 * This tracks the actual cost of goods sold per order item
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Adding cost column to order_items...');

    // Check if cost column exists
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name = 'cost'
    `;

    if (columns.length === 0) {
      await sql`ALTER TABLE order_items ADD COLUMN cost decimal(10, 2)`;
      console.log('✓ Added cost column to order_items');
    } else {
      console.log('  cost column already exists');
    }

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
