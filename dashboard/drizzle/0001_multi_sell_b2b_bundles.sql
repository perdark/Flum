-- Migration: Advanced E-Commerce Features (Multi-Sell, B2B/B2C, Bundles)
-- Run this migration to apply the schema changes
--
-- NOTE: This migration:
-- 1. Removes points/rewards fields (points_per_dollar, max_points_redemption, points_reward, points_used, points_earned)
-- 2. Adds multi-sell inventory system
-- 3. Adds B2B/B2C customer and pricing tables
-- 4. Adds bundle support

-- ============================================================================
-- 1. EXTEND inventory_templates WITH FIELD VISIBILITY OPTIONS
-- ============================================================================

-- Update fields_schema structure (requires data migration if existing data exists)
-- The new fields_schema structure includes:
-- - isVisibleToAdmin (boolean)
-- - isVisibleToMerchant (boolean)
-- - isVisibleToCustomer (boolean)
-- - repeatable (boolean)
-- - eachLineIsProduct (boolean)
-- - parentId (string | null)
-- - displayOrder (number)

-- For existing records, set default values
UPDATE inventory_templates
SET fields_schema = jsonb_agg(
    jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(
                            jsonb_set(field, '{isVisibleToAdmin}', 'true'),
                            '{isVisibleToMerchant}', 'false'
                        ),
                        '{isVisibleToCustomer}', 'false'
                    ),
                    '{repeatable}', 'false'
                ),
                '{eachLineIsProduct}', 'false'
            ),
            '{parentId}', 'null'
        ),
        '{displayOrder}', '0'
    )
)
WHERE fields_schema IS NOT NULL;

-- ============================================================================
-- 2. CREATE inventory_units TABLE (Multi-Sell Cooldown System)
-- ============================================================================

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
);

CREATE INDEX IF NOT EXISTS inventory_units_product_idx ON inventory_units(product_id);
CREATE INDEX IF NOT EXISTS inventory_units_physical_unit_idx ON inventory_units(physical_unit_id);
CREATE INDEX IF NOT EXISTS inventory_units_status_idx ON inventory_units(status);
CREATE INDEX IF NOT EXISTS inventory_units_cooldown_idx ON inventory_units(cooldown_until);
CREATE INDEX IF NOT EXISTS inventory_units_available_idx ON inventory_units(product_id, status);

-- ============================================================================
-- 3. CREATE customers TABLE (B2B/B2C)
-- ============================================================================

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
);

CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_type_idx ON customers(type);

-- ============================================================================
-- 4. CREATE product_pricing TABLE (Tiered Pricing)
-- ============================================================================

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
);

CREATE INDEX IF NOT EXISTS product_pricing_product_idx ON product_pricing(product_id);
CREATE INDEX IF NOT EXISTS product_pricing_customer_type_idx ON product_pricing(customer_type);
CREATE INDEX IF NOT EXISTS product_pricing_unique_idx ON product_pricing(product_id, customer_type);

-- ============================================================================
-- 5. CREATE bundle_items TABLE (Bundle Support)
-- ============================================================================

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
);

CREATE INDEX IF NOT EXISTS bundle_items_bundle_product_idx ON bundle_items(bundle_product_id);
CREATE INDEX IF NOT EXISTS bundle_items_product_idx ON bundle_items(product_id);

-- ============================================================================
-- 6. ALTER products TABLE - Add Multi-Sell and Bundle Fields
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS multi_sell_enabled BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS multi_sell_factor INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cooldown_enabled BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cooldown_duration_hours INTEGER DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_template_id UUID REFERENCES inventory_templates(id);

CREATE INDEX IF NOT EXISTS products_bundle_template_idx ON products(bundle_template_id);

-- ============================================================================
-- 7. ALTER users TABLE - Add Merchant Support
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS users_customer_idx ON users(customer_id);

-- ============================================================================
-- 8. ALTER orders TABLE - Add B2B Fields
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_tier_used VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_adjusted BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_total DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);

-- ============================================================================
-- 9. ALTER order_items TABLE - Add Bundle Support
-- ============================================================================

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS bundle_path VARCHAR(500);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS fulfilled_quantity INTEGER DEFAULT 0;

-- ============================================================================
-- 10. REMOVE POINTS/REWARDS FIELDS
-- ============================================================================

-- Remove from store_settings
ALTER TABLE store_settings DROP COLUMN IF EXISTS points_per_dollar;
ALTER TABLE store_settings DROP COLUMN IF EXISTS max_points_redemption;

-- Remove from products
ALTER TABLE products DROP COLUMN IF EXISTS points_reward;

-- Remove from orders
ALTER TABLE orders DROP COLUMN IF EXISTS points_used;
ALTER TABLE orders DROP COLUMN IF EXISTS points_earned;

-- ============================================================================
-- 11. MIGRATE EXISTING DATA - Create default retail pricing for products
-- ============================================================================

-- Create retail pricing entries for existing products using their base_price
INSERT INTO product_pricing (product_id, customer_type, retail_price, currency, created_at, updated_at)
SELECT id, 'retail', base_price, 'USD', NOW(), NOW()
FROM products
WHERE NOT EXISTS (
    SELECT 1 FROM product_pricing WHERE product_pricing.product_id = products.id
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
