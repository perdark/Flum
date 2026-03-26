/**
 * Migration to add missing columns to order_items table
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Adding bundle_path and fulfilled_quantity columns to order_items...');

    // Check if bundle_path column exists
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name IN ('bundle_path', 'fulfilled_quantity')
    `;

    const existingColumns = columns.map(c => c.column_name);

    if (!existingColumns.includes('bundle_path')) {
      await sql`ALTER TABLE order_items ADD COLUMN bundle_path varchar(500)`;
      console.log('✓ Added bundle_path column');
    } else {
      console.log('  bundle_path already exists');
    }

    if (!existingColumns.includes('fulfilled_quantity')) {
      await sql`ALTER TABLE order_items ADD COLUMN fulfilled_quantity integer default 0`;
      console.log('✓ Added fulfilled_quantity column');
    } else {
      console.log('  fulfilled_quantity already exists');
    }

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
