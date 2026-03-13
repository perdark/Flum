/**
 * Database Schema Push & Admin User Creation Script
 *
 * This script:
 * 1. Pushes the schema to the database
 * 2. Creates an initial admin user
 */

import "dotenv/config";
import { neon, neonConfig } from "@neondatabase/serverless";
import { hashPassword } from "../utils/security";
// @ts-ignore - ws module doesn't have type definitions
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("🔧 Setting up database...\n");

  // Drop existing tables in correct order (respecting foreign keys)
  console.log("  Cleaning up old tables if present...");
  const tables = [
    "daily_analytics",
    "activity_logs",
    "order_delivery_snapshots",
    "reviews",
    "coupon_usage",
    "coupons",
    "order_items",
    "orders",
    "inventory_items",
    "inventory_batches",
    "product_platform_links",
    "platforms",
    "product_images",
    "product_platforms",
    "products",
    "inventory_templates",
    "sessions",
    "users",
  ];

  // First drop all constraints and indexes
  for (const table of tables) {
    try {
      await sql.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    } catch (e) {
      // Ignore errors
    }
  }
  console.log("  ✓ Cleanup done\n");

  console.log("📊 Creating tables...\n");

  // Users table
  await sql.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ users table");

  await sql.query(`CREATE INDEX users_email_idx ON users(email)`);
  await sql.query(`CREATE INDEX users_role_idx ON users(role)`);

  // Sessions table
  await sql.query(`
    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ sessions table");

  await sql.query(`CREATE INDEX sessions_token_idx ON sessions(token)`);
  await sql.query(`CREATE INDEX sessions_user_id_idx ON sessions(user_id)`);

  // Inventory Templates table
  await sql.query(`
    CREATE TABLE inventory_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      fields_schema JSONB NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ inventory_templates table");

  await sql.query(`CREATE INDEX inventory_templates_name_idx ON inventory_templates(name)`);

  // Products table
  await sql.query(`
    CREATE TABLE products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      inventory_template_id UUID,
      is_active BOOLEAN NOT NULL DEFAULT true,
      stock_count INTEGER NOT NULL DEFAULT 0,
      total_sold INTEGER NOT NULL DEFAULT 0,
      average_rating DECIMAL(3, 2),
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP,
      FOREIGN KEY (inventory_template_id) REFERENCES inventory_templates(id) ON DELETE RESTRICT
    )
  `);
  console.log("  ✓ products table");

  await sql.query(`CREATE INDEX products_slug_idx ON products(slug)`);
  await sql.query(`CREATE INDEX products_is_active_idx ON products(is_active)`);
  await sql.query(`CREATE INDEX products_template_idx ON products(inventory_template_id)`);

  // Product Platforms table
  await sql.query(`
    CREATE TABLE product_platforms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      region VARCHAR(10)
    )
  `);
  console.log("  ✓ product_platforms table");

  await sql.query(`CREATE INDEX product_platforms_product_idx ON product_platforms(product_id)`);

  // Product Images table
  await sql.query(`
    CREATE TABLE product_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url VARCHAR(500) NOT NULL,
      alt VARCHAR(255),
      "order" INTEGER NOT NULL DEFAULT 0
    )
  `);
  console.log("  ✓ product_images table");

  await sql.query(`CREATE INDEX product_images_product_idx ON product_images(product_id)`);

  // Inventory Items table
  await sql.query(`
    CREATE TABLE inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      values JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'expired')),
      order_item_id UUID,
      reserved_until TIMESTAMP,
      purchased_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES inventory_templates(id) ON DELETE RESTRICT
    )
  `);
  console.log("  ✓ inventory_items table");

  await sql.query(`CREATE INDEX inventory_items_template_idx ON inventory_items(template_id)`);
  await sql.query(`CREATE INDEX inventory_items_product_idx ON inventory_items(product_id)`);
  await sql.query(`CREATE INDEX inventory_items_status_idx ON inventory_items(status)`);
  await sql.query(`CREATE INDEX inventory_items_order_item_idx ON inventory_items(order_item_id)`);
  await sql.query(`CREATE INDEX inventory_items_available_idx ON inventory_items(product_id, status)`);

  // GIN index for JSONB text search (global inventory search)
  await sql.query(`CREATE INDEX IF NOT EXISTS inventory_items_values_gin_idx ON inventory_items USING GIN (values)`);

  // Platforms table
  await sql.query(`
    CREATE TABLE platforms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      parent_id UUID REFERENCES platforms(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ platforms table");

  await sql.query(`CREATE INDEX platforms_parent_idx ON platforms(parent_id)`);
  await sql.query(`CREATE INDEX platforms_name_idx ON platforms(name)`);
  await sql.query(`CREATE INDEX platforms_is_active_idx ON platforms(is_active)`);
  await sql.query(`CREATE INDEX platforms_unique_parent_name_idx ON platforms(parent_id, name)`);

  // Product Platform Links table
  await sql.query(`
    CREATE TABLE product_platform_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(product_id, platform_id)
    )
  `);
  console.log("  ✓ product_platform_links table");

  await sql.query(`CREATE INDEX product_platform_links_product_idx ON product_platform_links(product_id)`);
  await sql.query(`CREATE INDEX product_platform_links_platform_idx ON product_platform_links(platform_id)`);

  // Inventory Batches table
  await sql.query(`
    CREATE TABLE inventory_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      source VARCHAR(100),
      notes TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ inventory_batches table");

  await sql.query(`CREATE INDEX inventory_batches_created_by_idx ON inventory_batches(created_by)`);
  await sql.query(`CREATE INDEX inventory_batches_created_at_idx ON inventory_batches(created_at)`);

  // Add batch_id column to inventory_items
  await sql.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL`);
  await sql.query(`CREATE INDEX IF NOT EXISTS inventory_items_batch_idx ON inventory_items(batch_id)`);

  // Orders table
  await sql.query(`
    CREATE TABLE orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(255),
      subtotal DECIMAL(10, 2) NOT NULL,
      discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      coupon_id UUID,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
      fulfillment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'delivered', 'failed')),
      delivered_at TIMESTAMP,
      processed_by UUID,
      claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      claimed_at TIMESTAMP,
      claim_expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log("  ✓ orders table");

  await sql.query(`CREATE INDEX orders_customer_email_idx ON orders(customer_email)`);
  await sql.query(`CREATE INDEX orders_status_idx ON orders(status)`);
  await sql.query(`CREATE INDEX orders_fulfillment_status_idx ON orders(fulfillment_status)`);
  await sql.query(`CREATE INDEX orders_claimed_by_idx ON orders(claimed_by)`);
  await sql.query(`CREATE INDEX orders_created_at_idx ON orders(created_at)`);

  // Order Items table
  await sql.query(`
    CREATE TABLE order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      delivered_inventory_ids JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ order_items table");

  await sql.query(`CREATE INDEX order_items_order_idx ON order_items(order_id)`);
  await sql.query(`CREATE INDEX order_items_product_idx ON order_items(product_id)`);

  // Order Delivery Snapshots table
  await sql.query(`
    CREATE TABLE order_delivery_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ order_delivery_snapshots table");

  await sql.query(`CREATE INDEX order_delivery_snapshots_order_idx ON order_delivery_snapshots(order_id)`);
  await sql.query(`CREATE INDEX order_delivery_snapshots_created_by_idx ON order_delivery_snapshots(created_by)`);

  // Coupons table
  await sql.query(`
    CREATE TABLE coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value DECIMAL(10, 2) NOT NULL,
      min_purchase DECIMAL(10, 2) DEFAULT 0,
      max_discount DECIMAL(10, 2),
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      user_limit INTEGER DEFAULT 1,
      valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
      valid_until TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT true,
      applicable_product_ids JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ coupons table");

  await sql.query(`CREATE INDEX coupons_code_idx ON coupons(code)`);
  await sql.query(`CREATE INDEX coupons_is_active_idx ON coupons(is_active)`);

  // Coupon Usage table
  await sql.query(`
    CREATE TABLE coupon_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_email VARCHAR(255) NOT NULL,
      discount_amount DECIMAL(10, 2) NOT NULL,
      used_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ coupon_usage table");

  await sql.query(`CREATE INDEX coupon_usage_coupon_idx ON coupon_usage(coupon_id)`);
  await sql.query(`CREATE INDEX coupon_usage_order_idx ON coupon_usage(order_id)`);
  await sql.query(`CREATE INDEX coupon_usage_customer_idx ON coupon_usage(customer_email)`);
  await sql.query(`CREATE INDEX coupon_usage_unique_idx ON coupon_usage(coupon_id, customer_email)`);

  // Reviews table
  await sql.query(`
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_email VARCHAR(255) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);
  console.log("  ✓ reviews table");

  await sql.query(`CREATE INDEX reviews_product_idx ON reviews(product_id)`);
  await sql.query(`CREATE INDEX reviews_unique_idx ON reviews(product_id, customer_email)`);

  // Activity Logs table
  await sql.query(`
    CREATE TABLE activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      metadata JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ activity_logs table");

  await sql.query(`CREATE INDEX activity_logs_user_idx ON activity_logs(user_id)`);
  await sql.query(`CREATE INDEX activity_logs_action_idx ON activity_logs(action)`);
  await sql.query(`CREATE INDEX activity_logs_entity_idx ON activity_logs(entity)`);
  await sql.query(`CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at)`);

  // Daily Analytics table
  await sql.query(`
    CREATE TABLE daily_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL UNIQUE,
      revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      items_sold INTEGER NOT NULL DEFAULT 0,
      unique_customers INTEGER NOT NULL DEFAULT 0,
      average_order_value DECIMAL(10, 2),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✓ daily_analytics table");

  await sql.query(`CREATE INDEX daily_analytics_date_idx ON daily_analytics(date)`);

  console.log("\n✅ Database schema created successfully!\n");

  // Create admin user
  console.log("👤 Creating admin user...");

  const passwordHash = await hashPassword("Admin123");
  const adminEmail = "admin@dashboard.com";
  const adminName = "Admin";

  await sql.query(
    `INSERT INTO users (email, name, password_hash, role, is_active) VALUES ($1, $2, $3, 'admin', true)`,
    [adminEmail, adminName, passwordHash]
  );

  console.log("\n✅ Admin user created successfully!");
  console.log("\n   Email:    admin@dashboard.com");
  console.log("   Password: Admin123");
  console.log("\n⚠️  Please change the password after first login!\n");

  console.log("🎉 Setup complete!\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
