/**
 * Fix missing database columns
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fixSchema() {
  console.log('Adding missing columns to orders table...');

  const statements = [
    // Orders table - B2B fields
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_tier_used VARCHAR(50)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_adjusted BOOLEAN DEFAULT false NOT NULL',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_total DECIMAL(10, 2)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP',
    'CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)',
  ];

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      console.log('✓', stmt.substring(0, 60) + '...');
    } catch (err) {
      console.log('⊘', stmt.substring(0, 60) + '...');
      console.log('  Error:', err.message);
    }
  }

  console.log('\nVerifying orders table schema...');
  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `;

  console.log('Orders table columns:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });

  console.log('\nDone!');
}

fixSchema().catch(console.error);
