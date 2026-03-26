/**
 * Create customers table and add remaining columns
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createCustomersTable() {
  console.log('Creating customers table...');

  // First create the customers table
  const createCustomers = `
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      type VARCHAR(20) DEFAULT 'retail' NOT NULL,
      business_name VARCHAR(255),
      tax_id VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active' NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP
    )
  `;

  try {
    await sql.query(createCustomers);
    console.log('✓ Created customers table');
  } catch (err) {
    console.log('⊘ customers table:', err.message);
  }

  // Create indexes
  try {
    await sql.query('CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email)');
    await sql.query('CREATE INDEX IF NOT EXISTS customers_type_idx ON customers(type)');
    console.log('✓ Created customers indexes');
  } catch (err) {
    console.log('⊘ indexes:', err.message);
  }

  // Now add customer_id to orders (without foreign key constraint for now)
  console.log('\nAdding customer_id to orders table...');
  try {
    await sql.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID');
    console.log('✓ Added customer_id column');
  } catch (err) {
    console.log('⊘ customer_id:', err.message);
  }

  // Create index without foreign key
  try {
    await sql.query('CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)');
    console.log('✓ Created orders_customer_idx');
  } catch (err) {
    console.log('⊘ orders_customer_idx:', err.message);
  }

  // Remove points_used column
  console.log('\nRemoving points_used column...');
  try {
    await sql.query('ALTER TABLE orders DROP COLUMN IF EXISTS points_used');
    console.log('✓ Removed points_used');
  } catch (err) {
    console.log('⊘ points_used:', err.message);
  }

  // Remove points_earned if exists
  try {
    await sql.query('ALTER TABLE orders DROP COLUMN IF EXISTS points_earned');
    console.log('✓ Removed points_earned');
  } catch (err) {
    console.log('⊘ points_earned:', err.message);
  }

  console.log('\nDone! Refresh your dashboard.');
}

createCustomersTable().catch(console.error);
