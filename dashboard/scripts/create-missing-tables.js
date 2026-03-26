/**
 * Create missing tables
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createTables() {
  console.log('Creating missing tables...');

  // Create inventory_units table
  console.log('\nCreating inventory_units table...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS inventory_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      physical_unit_id VARCHAR(100) NOT NULL,
      sale_count INTEGER DEFAULT 0 NOT NULL,
      max_sales INTEGER DEFAULT 5 NOT NULL,
      cooldown_until TIMESTAMP,
      cooldown_duration_hours INTEGER DEFAULT 12 NOT NULL,
      status VARCHAR(20) DEFAULT 'available' NOT NULL,
      last_sale_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✓ Created inventory_units table');

  await sql.query('CREATE INDEX IF NOT EXISTS inventory_units_product_idx ON inventory_units(product_id)');
  await sql.query('CREATE INDEX IF NOT EXISTS inventory_units_physical_unit_idx ON inventory_units(physical_unit_id)');
  await sql.query('CREATE INDEX IF NOT EXISTS inventory_units_status_idx ON inventory_units(status)');
  await sql.query('CREATE INDEX IF NOT EXISTS inventory_units_cooldown_idx ON inventory_units(cooldown_until)');
  await sql.query('CREATE INDEX IF NOT EXISTS inventory_units_available_idx ON inventory_units(product_id, status)');

  // Create bundle_items table
  console.log('\nCreating bundle_items table...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS bundle_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      template_field_id VARCHAR(255) NOT NULL,
      line_index INTEGER DEFAULT 0 NOT NULL,
      product_id UUID REFERENCES products(id),
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER DEFAULT 1 NOT NULL,
      price_override DECIMAL(10, 2),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✓ Created bundle_items table');

  await sql.query('CREATE INDEX IF NOT EXISTS bundle_items_bundle_product_idx ON bundle_items(bundle_product_id)');
  await sql.query('CREATE INDEX IF NOT EXISTS bundle_items_product_idx ON bundle_items(product_id)');

  // Create product_pricing table
  console.log('\nCreating product_pricing table...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS product_pricing (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_type VARCHAR(20) NOT NULL,
      cost DECIMAL(10, 2),
      wholesale_price DECIMAL(10, 2),
      retail_price DECIMAL(10, 2),
      currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
      min_quantity INTEGER,
      credit_eligible BOOLEAN DEFAULT false NOT NULL,
      credit_terms_days INTEGER,
      valid_from TIMESTAMP DEFAULT NOW() NOT NULL,
      valid_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('✓ Created product_pricing table');

  await sql.query('CREATE INDEX IF NOT EXISTS product_pricing_product_idx ON product_pricing(product_id)');
  await sql.query('CREATE INDEX IF NOT EXISTS product_pricing_customer_type_idx ON product_pricing(customer_type)');
  await sql.query('CREATE INDEX IF NOT EXISTS product_pricing_unique_idx ON product_pricing(product_id, customer_type)');

  // Create customers table
  console.log('\nCreating customers table...');
  await sql.query(`
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
  `);
  console.log('✓ Created customers table');

  await sql.query('CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email)');
  await sql.query('CREATE INDEX IF NOT EXISTS customers_type_idx ON customers(type)');

  console.log('\n✅ All tables created successfully!');
}

createTables().catch(console.error);
