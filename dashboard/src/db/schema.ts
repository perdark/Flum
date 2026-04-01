/**
 * Unified Database Schema for Fulmen Empire Digital Store
 *
 * This schema supports both:
 * - Storefront (ecom): Shopping, cart, checkout, user profiles
 * - Admin Dashboard (dashboard_next): Product management, orders, inventory, reviews
 *
 * Both projects connect to the same Neon PostgreSQL database.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  name: varchar('name', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  role: varchar('role', { length: 20 }),
  customerId: uuid('customer_id').references(() => customers.id),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: timestamp('email_verified'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  customerIdx: index('users_customer_idx').on(table.customerId),
}));

// Sessions for admin authentication
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('sessions_token_idx').on(table.token),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// Customers - B2B/B2C customer records
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  type: varchar('type', { length: 20 }).default('retail').notNull(),
  businessName: varchar('business_name', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: index('customers_email_idx').on(table.email),
  typeIdx: index('customers_type_idx').on(table.type),
}));

// ============================================================================
// CATEGORIES (Hierarchical/Tree Structure)
// ============================================================================
// Formerly 'platforms' - now unified categories with hierarchical support

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  icon: varchar('icon', { length: 500 }),
  banner: varchar('banner', { length: 500 }),
  parentId: uuid('parent_id').references((): any => categories.id, { onDelete: 'restrict' }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  parentIdx: index('categories_parent_idx').on(table.parentId),
  slugIdx: index('categories_slug_idx').on(table.slug),
  uniqueParentName: index('categories_unique_parent_name_idx').on(table.parentId, table.name),
}));

// ============================================================================
// CURRENCIES
// ============================================================================

export const currencies = pgTable('currencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 3 }).unique().notNull(), // USD, EUR, etc.
  name: varchar('name', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 10 }).notNull(), // $, €, etc.
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1.0000'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// STORE SETTINGS
// ============================================================================

export const storeSettings = pgTable('store_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeName: varchar('store_name', { length: 255 }).default('Fulmen Empire').notNull(),
  description: text('description'),
  storeUrl: varchar('store_url', { length: 500 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  faviconUrl: varchar('favicon_url', { length: 500 }),
  defaultCurrencyId: uuid('default_currency_id').references(() => currencies.id),
  defaultLanguage: varchar('default_language', { length: 10 }).default('en').notNull(),
  contactEmail: varchar('contact_email', { length: 255 }),
  supportEmail: varchar('support_email', { length: 255 }),
  supportPhone: varchar('support_phone', { length: 50 }),
  maintenanceMode: boolean('maintenance_mode').default(false).notNull(),
  maintenanceMessage: text('maintenance_message'),
  allowGuestCheckout: boolean('allow_guest_checkout').default(true).notNull(),
  requireEmailVerification: boolean('require_email_verification').default(false).notNull(),
  enableReviews: boolean('enable_reviews').default(true).notNull(),
  autoApproveReviews: boolean('auto_approve_reviews').default(false).notNull(),
  // Global low stock alert threshold (applies to all stock)
  lowStockThreshold: integer('low_stock_threshold').default(10).notNull(),
  // Semi-auto delivery: minutes before auto-approving orders (0 = disabled)
  autoApproveTimeoutMinutes: integer('auto_approve_timeout_minutes').default(30).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  dateFormat: varchar('date_format', { length: 20 }).default('MM/DD/YYYY').notNull(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  googleAnalyticsId: varchar('google_analytics_id', { length: 50 }),
  facebookPixelId: varchar('facebook_pixel_id', { length: 50 }),
  pointsPerDollar: integer('points_per_dollar').default(10).notNull(),
  maxPointsRedemption: integer('max_points_redemption').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Single row constraint - enforce only one settings record
  singleRow: index('store_settings_single_row').on(table.id),
}));

// ============================================================================
// INVENTORY TEMPLATES (for dynamic inventory fields)
// ============================================================================
// Stock types removed — templates are the single source of field definitions.

export const inventoryTemplates = pgTable('inventory_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  fieldsSchema: jsonb('fields_schema').notNull().$type<Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'group' | 'multiline';
    required: boolean;
    label: string;
    // Field visibility options
    isVisibleToAdmin: boolean;
    isVisibleToMerchant: boolean;
    isVisibleToCustomer: boolean;
    // Bundle field options
    repeatable: boolean;
    eachLineIsProduct: boolean;
    // Linked pair options
    linkedTo: string | null;
    linkGroup: string | null;
    parentId: string | null;
    displayOrder: number;
  }>>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  nameIdx: index('inventory_templates_name_idx').on(table.name),
}));

// Inventory Items - actual inventory with dynamic values
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => inventoryTemplates.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id'),
  values: jsonb('values').notNull(),
  // Cost per stock item (what you paid for this stock)
  cost: decimal('cost', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('available').notNull(), // available, reserved, sold, expired, in_cooldown
  // Multi-sell per stock line (replaces product-level multi-sell)
  multiSellEnabled: boolean('multi_sell_enabled').default(false).notNull(),
  multiSellMax: integer('multi_sell_max').default(5).notNull(),
  multiSellSaleCount: integer('multi_sell_sale_count').default(0).notNull(),
  cooldownEnabled: boolean('cooldown_enabled').default(false).notNull(),
  cooldownUntil: timestamp('cooldown_until'),
  cooldownDurationHours: integer('cooldown_duration_hours').default(12).notNull(),
  orderItemId: uuid('order_item_id'),
  reservedUntil: timestamp('reserved_until'),
  purchasedAt: timestamp('purchased_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  templateIdx: index('inventory_items_template_idx').on(table.templateId),
  productIdx: index('inventory_items_product_idx').on(table.productId),
  statusIdx: index('inventory_items_status_idx').on(table.status),
  orderItemIdx: index('inventory_items_order_item_idx').on(table.orderItemId),
  availableIdx: index('inventory_items_available_idx').on(table.productId, table.status),
}));

// ============================================================================
// PRODUCTS
// ============================================================================

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  sku: varchar('sku', { length: 100 }).unique(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  deliveryType: varchar('delivery_type', { length: 50 }).notNull(),
  inventoryTemplateId: uuid('inventory_template_id').references(() => inventoryTemplates.id),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isNew: boolean('is_new').default(false).notNull(),
  maxQuantity: integer('max_quantity').default(999),
  stockCount: integer('stock_count').default(0),
  totalSold: integer('total_sold').default(0),
  currentStock: integer('current_stock').default(-1),
  videoUrl: varchar('video_url', { length: 500 }),
  videoThumbnail: varchar('video_thumbnail', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  views: integer('views').default(0).notNull(),
  salesCount: integer('sales_count').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  // Multi-sell fields
  multiSellEnabled: boolean('multi_sell_enabled').default(false).notNull(),
  multiSellFactor: integer('multi_sell_factor').default(5),
  cooldownEnabled: boolean('cooldown_enabled').default(false).notNull(),
  cooldownDurationHours: integer('cooldown_duration_hours').default(12),
  // Bundle fields
  isBundle: boolean('is_bundle').default(false).notNull(),
  bundleTemplateId: uuid('bundle_template_id').references(() => inventoryTemplates.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: index('products_slug_idx').on(table.slug),
  activeIdx: index('products_active_idx').on(table.isActive),
  featuredIdx: index('products_featured_idx').on(table.isFeatured),
  ratingIdx: index('products_rating_idx').on(table.averageRating),
  templateIdx: index('products_template_idx').on(table.inventoryTemplateId),
  bundleTemplateIdx: index('products_bundle_template_idx').on(table.bundleTemplateId),
}));

// Product-Category Relationship (Many-to-Many)
// Formerly 'product_platforms'
export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  categoryPrice: decimal('category_price', { precision: 10, scale: 2 }),
  categorySku: varchar('category_sku', { length: 100 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.categoryId] }),
  productIdx: index('product_categories_product_idx').on(table.productId),
  categoryIdx: index('product_categories_category_idx').on(table.categoryId),
}));

// Product Images
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  alt: varchar('alt', { length: 255 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productId),
}));

// Product Pricing - Tiered pricing per product (B2B/B2C)
export const productPricing = pgTable('product_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customerType: varchar('customer_type', { length: 20 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  wholesalePrice: decimal('wholesale_price', { precision: 10, scale: 2 }),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  minQuantity: integer('min_quantity'),
  creditEligible: boolean('credit_eligible').default(false).notNull(),
  creditTermsDays: integer('credit_terms_days'),
  validFrom: timestamp('valid_from').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_pricing_product_idx').on(table.productId),
  customerTypeIdx: index('product_pricing_customer_type_idx').on(table.customerType),
  uniqueProductCustomer: index('product_pricing_unique_idx').on(table.productId, table.customerType),
}));

// ============================================================================
// PRODUCT VARIANTS (e-commerce style option system)
// ============================================================================

// Option groups define axes like "Platform", "Region"
export const productOptionGroups = pgTable('product_option_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_option_groups_product_idx').on(table.productId),
}));

// Option values are the choices within each group (e.g. "Steam", "Epic" under "Platform")
export const productOptionValues = pgTable('product_option_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  optionGroupId: uuid('option_group_id').notNull().references(() => productOptionGroups.id, { onDelete: 'cascade' }),
  value: varchar('value', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  groupIdx: index('product_option_values_group_idx').on(table.optionGroupId),
}));

// Each variant is one sellable combination (e.g. "Steam + US") with its own price & stock
export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  // JSONB map of groupName → value, e.g. {"platform":"Steam","region":"US"}
  optionCombination: jsonb('option_combination').$type<Record<string, string>>().default({}).notNull(),
  sku: varchar('sku', { length: 100 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  stockCount: integer('stock_count').default(0).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_variants_product_idx').on(table.productId),
  defaultIdx: index('product_variants_default_idx').on(table.productId, table.isDefault),
}));

// Bundle Items - Items within a bundle product
export const bundleItems = pgTable('bundle_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleProductId: uuid('bundle_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  templateFieldId: varchar('template_field_id', { length: 255 }).notNull(),
  lineIndex: integer('line_index').default(0).notNull(),
  productId: uuid('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  priceOverride: decimal('price_override', { precision: 10, scale: 2 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  bundleProductIdx: index('bundle_items_bundle_product_idx').on(table.bundleProductId),
  productIdx: index('bundle_items_product_idx').on(table.productId),
}));

// ============================================================================
// CART
// ============================================================================

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  currencyId: uuid('currency_id').references(() => currencies.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  categoryId: uuid('category_id').references(() => categories.id),
  quantity: integer('quantity').default(1).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  cartIdx: index('cart_items_cart_idx').on(table.cartId),
  productIdx: index('cart_items_product_idx').on(table.productId),
}));

// ============================================================================
// ORDERS
// ============================================================================

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),
  userId: uuid('user_id').references(() => users.id),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  fulfillmentStatus: varchar('fulfillment_status', { length: 50 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  currencyId: uuid('currency_id').references(() => currencies.id),
  currency: varchar('currency', { length: 3 }).default('USD'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  couponId: uuid('coupon_id').references(() => coupons.id),
  notes: text('notes'),
  processedBy: uuid('processed_by').references(() => users.id),
  claimedBy: uuid('claimed_by').references(() => users.id),
  claimedAt: timestamp('claimed_at'),
  claimExpiresAt: timestamp('claim_expires_at'),
  deliveredAt: timestamp('delivered_at'),
  // B2B fields
  customerId: uuid('customer_id').references(() => customers.id),
  customerType: varchar('customer_type', { length: 20 }),
  pricingTierUsed: varchar('pricing_tier_used', { length: 50 }),
  isAdjusted: boolean('is_adjusted').default(false).notNull(),
  originalTotal: decimal('original_total', { precision: 10, scale: 2 }),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  userIdx: index('orders_user_idx').on(table.userId),
  orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
  statusIdx: index('orders_status_idx').on(table.status),
  fulfillmentStatusIdx: index('orders_fulfillment_status_idx').on(table.fulfillmentStatus),
  couponIdx: index('orders_coupon_idx').on(table.couponId),
  customerEmailIdx: index('orders_customer_email_idx').on(table.customerEmail),
  claimedByIdx: index('orders_claimed_by_idx').on(table.claimedBy),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  customerIdx: index('orders_customer_idx').on(table.customerId),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productSlug: varchar('product_slug', { length: 255 }).notNull(),
  deliveryType: varchar('delivery_type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  deliveryData: jsonb('delivery_data').$type<Record<string, unknown>>(),
  deliveredInventoryIds: jsonb('delivered_inventory_ids').$type<string[]>(),
  // Bundle fields
  bundlePath: varchar('bundle_path', { length: 500 }),
  fulfilledQuantity: integer('fulfilled_quantity').default(0),
  variantId: uuid('variant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  productIdx: index('order_items_product_idx').on(table.productId),
}));

// Order Delivery Snapshots
export const orderDeliverySnapshots = pgTable('order_delivery_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull().$type<{
    items: Array<{
      productId: string | null;
      productName: string;
      quantity: number;
      items: Array<{
        inventoryId: string;
        values: Record<string, string | number | boolean>;
      }>;
    }>;
  }>(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('order_delivery_snapshots_order_idx').on(table.orderId),
  createdByIdx: index('order_delivery_snapshots_created_by_idx').on(table.createdBy),
}));

// ============================================================================
// DELIVERIES
// ============================================================================

export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id),
  type: varchar('type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  claimedAt: timestamp('claimed_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderItemIdx: index('deliveries_order_item_idx').on(table.orderItemId),
}));

// ============================================================================
// WISHLIST
// ============================================================================

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id),
  priceAlert: decimal('price_alert', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userProductUnique: index('wishlists_user_product_unique').on(table.userId, table.productId),
  userIdx: index('wishlists_user_idx').on(table.userId),
}));

// ============================================================================
// REVIEWS
// ============================================================================

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customerEmail: varchar('customer_email', { length: 255 }),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 255 }),
  comment: text('comment'),
  isApproved: boolean('is_approved').default(false).notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  productIdx: index('reviews_product_idx').on(table.productId),
  userIdx: index('reviews_user_idx').on(table.userId),
  approvalIdx: index('reviews_approval_idx').on(table.isApproved),
  uniqueProductCustomer: index('reviews_unique_idx').on(table.productId, table.customerEmail),
}));

// ============================================================================
// POINTS TRANSACTIONS
// ============================================================================

export const pointsTransactions = pgTable('points_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('points_transactions_user_idx').on(table.userId),
  orderIdx: index('points_transactions_order_idx').on(table.orderId),
}));

// ============================================================================
// RECENTLY VIEWED
// ============================================================================

export const recentlyViewed = pgTable('recently_viewed', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('recently_viewed_user_idx').on(table.userId),
  sessionIdx: index('recently_viewed_session_idx').on(table.sessionId),
}));

// ============================================================================
// PRODUCT RELATIONSHIPS
// ============================================================================

export const productRelations = pgTable('product_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  relatedProductId: uuid('related_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  relationType: varchar('relation_type', { length: 50 }).notNull(),
  score: integer('score').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_relations_product_idx').on(table.productId),
  uniqueRelation: index('product_relations_unique').on(table.productId, table.relatedProductId, table.relationType),
}));

// ============================================================================
// SPECIAL OFFERS
// ============================================================================

export const offers = pgTable('offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  type: varchar('type', { length: 50 }).notNull(), // percentage, fixed, buy_x_get_y
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal('min_purchase', { precision: 10, scale: 2 }).default('0'),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  banner: varchar('banner', { length: 500 }),
  appliesTo: varchar('applies_to', { length: 50 }).default('all'), // all, categories, products
  appliesToId: uuid('applies_to_id'),
  // Display settings
  displayType: varchar('display_type', { length: 20 }).default('banner').notNull(), // banner, hero, card, modal
  displayPosition: integer('display_position').default(0), // Order for hero carousel
  backgroundColor: varchar('background_color', { length: 20 }), // Hex color
  textColor: varchar('text_color', { length: 20 }).default('#FFFFFF'), // Hex color
  showCountdown: boolean('show_countdown').default(false).notNull(),
  ctaText: varchar('cta_text', { length: 100 }),
  ctaTextAr: varchar('cta_text_ar', { length: 100 }),
  ctaLink: varchar('cta_link', { length: 500 }),
  featuredImage: varchar('featured_image', { length: 500 }), // Hero/card image
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: index('offers_slug_idx').on(table.slug),
  activeIdx: index('offers_active_idx').on(table.isActive),
  displayTypeIdx: index('offers_display_type_idx').on(table.displayType),
  displayPositionIdx: index('offers_display_position_idx').on(table.displayPosition),
}));

export const productOffers = pgTable('product_offers', {
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  offerId: uuid('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  discountedPrice: decimal('discounted_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.offerId] }),
  productIdx: index('product_offers_product_idx').on(table.productId),
  offerIdx: index('product_offers_offer_idx').on(table.offerId),
}));

// ============================================================================
// COUPONS
// ============================================================================

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percentage, fixed
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal('min_purchase', { precision: 10, scale: 2 }).default('0'),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').default(0).notNull(),
  userLimit: integer('user_limit').default(1),
  validFrom: timestamp('valid_from').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true).notNull(),
  applicableProductIds: jsonb('applicable_product_ids').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  codeIdx: index('coupons_code_idx').on(table.code),
  isActiveIdx: index('coupons_is_active_idx').on(table.isActive),
}));

export const couponUsage = pgTable('coupon_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
}, (table) => ({
  couponIdx: index('coupon_usage_coupon_idx').on(table.couponId),
  orderIdx: index('coupon_usage_order_idx').on(table.orderId),
  customerIdx: index('coupon_usage_customer_idx').on(table.customerEmail),
  uniqueCouponCustomer: index('coupon_usage_unique_idx').on(table.couponId, table.customerEmail),
}));

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('activity_logs_user_idx').on(table.userId),
  actionIdx: index('activity_logs_action_idx').on(table.action),
  entityIdx: index('activity_logs_entity_idx').on(table.entity),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// DAILY ANALYTICS
// ============================================================================

export const dailyAnalytics = pgTable('daily_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').unique().notNull(),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0').notNull(),
  ordersCount: integer('orders_count').default(0).notNull(),
  itemsSold: integer('items_sold').default(0).notNull(),
  uniqueCustomers: integer('unique_customers').default(0).notNull(),
  averageOrderValue: decimal('average_order_value', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dateIdx: index('daily_analytics_date_idx').on(table.date),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;

export type StoreSettings = typeof storeSettings.$inferSelect;
export type NewStoreSettings = typeof storeSettings.$inferInsert;

export type InventoryTemplate = typeof inventoryTemplates.$inferSelect;
export type NewInventoryTemplate = typeof inventoryTemplates.$inferInsert;


export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type OrderDeliverySnapshot = typeof orderDeliverySnapshots.$inferSelect;
export type NewOrderDeliverySnapshot = typeof orderDeliverySnapshots.$inferInsert;

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type NewPointsTransaction = typeof pointsTransactions.$inferInsert;

export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type NewRecentlyViewed = typeof recentlyViewed.$inferInsert;

export type ProductRelation = typeof productRelations.$inferSelect;
export type NewProductRelation = typeof productRelations.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

export type ProductOffer = typeof productOffers.$inferSelect;
export type NewProductOffer = typeof productOffers.$inferInsert;

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;

export type CouponUsage = typeof couponUsage.$inferSelect;
export type NewCouponUsage = typeof couponUsage.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type DailyAnalytics = typeof dailyAnalytics.$inferSelect;
export type NewDailyAnalytics = typeof dailyAnalytics.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;



export type ProductPricing = typeof productPricing.$inferSelect;
export type NewProductPricing = typeof productPricing.$inferInsert;

export type BundleItem = typeof bundleItems.$inferSelect;
export type NewBundleItem = typeof bundleItems.$inferInsert;

export type ProductOptionGroup = typeof productOptionGroups.$inferSelect;
export type NewProductOptionGroup = typeof productOptionGroups.$inferInsert;

export type ProductOptionValue = typeof productOptionValues.$inferSelect;
export type NewProductOptionValue = typeof productOptionValues.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
