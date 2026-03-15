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
  name: varchar('name', { length: 255 }), // For admin users
  avatar: varchar('avatar', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  role: varchar('role', { length: 20 }), // 'admin', 'staff', or null for customers
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: timestamp('email_verified'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
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

// ============================================================================
// PLATFORMS (Hierarchical/Tree Structure)
// ============================================================================

export const platforms = pgTable('platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  icon: varchar('icon', { length: 500 }),
  banner: varchar('banner', { length: 500 }),
  parentId: uuid('parent_id').references((): any => platforms.id, { onDelete: 'restrict' }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  parentIdx: index('platforms_parent_idx').on(table.parentId),
  slugIdx: index('platforms_slug_idx').on(table.slug),
  uniqueParentName: index('platforms_unique_parent_name_idx').on(table.parentId, table.name),
}));

// ============================================================================
// CATEGORIES
// ============================================================================

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  icon: varchar('icon', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('categories_slug_idx').on(table.slug),
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
// INVENTORY TEMPLATES (for dynamic inventory fields)
// ============================================================================

export const inventoryTemplates = pgTable('inventory_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  fieldsSchema: jsonb('fields_schema').notNull().$type<Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    label: string;
  }>>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  nameIdx: index('inventory_templates_name_idx').on(table.name),
}));

// Inventory Batches - track inventory imports
export const inventoryBatches = pgTable('inventory_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  source: varchar('source', { length: 100 }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  createdByIdx: index('inventory_batches_created_by_idx').on(table.createdBy),
}));

// Inventory Items - actual inventory with dynamic values
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => inventoryTemplates.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => inventoryBatches.id, { onDelete: 'set null' }),
  values: jsonb('values').notNull(),
  status: varchar('status', { length: 20 }).default('available').notNull(), // available, reserved, sold, expired
  orderItemId: uuid('order_item_id'),
  reservedUntil: timestamp('reserved_until'),
  purchasedAt: timestamp('purchased_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  templateIdx: index('inventory_items_template_idx').on(table.templateId),
  productIdx: index('inventory_items_product_idx').on(table.productId),
  batchIdx: index('inventory_items_batch_idx').on(table.batchId),
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
  categoryId: uuid('category_id').references(() => categories.id),
  deliveryType: varchar('delivery_type', { length: 50 }).notNull(), // auto_key, auto_account, manual, contact
  inventoryTemplateId: uuid('inventory_template_id').references(() => inventoryTemplates.id),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isNew: boolean('is_new').default(false).notNull(),
  pointsReward: integer('points_reward').default(0),
  maxQuantity: integer('max_quantity').default(999),
  stockCount: integer('stock_count').default(0),
  totalSold: integer('total_sold').default(0),
  currentStock: integer('current_stock').default(-1), // -1 for unlimited
  videoUrl: varchar('video_url', { length: 500 }),
  videoThumbnail: varchar('video_thumbnail', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  views: integer('views').default(0).notNull(),
  salesCount: integer('sales_count').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: index('products_slug_idx').on(table.slug),
  categoryIdx: index('products_category_idx').on(table.categoryId),
  activeIdx: index('products_active_idx').on(table.isActive),
  featuredIdx: index('products_featured_idx').on(table.isFeatured),
  ratingIdx: index('products_rating_idx').on(table.averageRating),
  templateIdx: index('products_template_idx').on(table.inventoryTemplateId),
}));

// Product-Platform Relationship (Many-to-Many)
export const productPlatforms = pgTable('product_platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id').notNull().references(() => platforms.id, { onDelete: 'cascade' }),
  platformPrice: decimal('platform_price', { precision: 10, scale: 2 }),
  platformSku: varchar('platform_sku', { length: 100 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.platformId] }),
  productIdx: index('product_platforms_product_idx').on(table.productId),
  platformIdx: index('product_platforms_platform_idx').on(table.platformId),
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
  platformId: uuid('platform_id').references(() => platforms.id),
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
  email: varchar('email', { length: 255 }), // Deprecated, use customerEmail
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, processing, delivered, cancelled
  fulfillmentStatus: varchar('fulfillment_status', { length: 50 }).default('pending').notNull(), // pending, processing, delivered, partial, failed
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  currencyId: uuid('currency_id').references(() => currencies.id),
  currency: varchar('currency', { length: 3 }).default('USD'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  pointsUsed: integer('points_used').default(0),
  pointsEarned: integer('points_earned').default(0),
  couponId: uuid('coupon_id').references(() => coupons.id),
  notes: text('notes'),
  processedBy: uuid('processed_by').references(() => users.id),
  claimedBy: uuid('claimed_by').references(() => users.id),
  claimedAt: timestamp('claimed_at'),
  claimExpiresAt: timestamp('claim_expires_at'),
  deliveredAt: timestamp('delivered_at'),
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
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  platformId: uuid('platform_id').references(() => platforms.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productSlug: varchar('product_slug', { length: 255 }).notNull(),
  platformName: varchar('platform_name', { length: 255 }),
  deliveryType: varchar('delivery_type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryData: jsonb('delivery_data').$type<Record<string, unknown>>(),
  deliveredInventoryIds: jsonb('delivered_inventory_ids').$type<string[]>(),
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
      productId: string;
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
  platformId: uuid('platform_id').references(() => platforms.id),
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
  platformId: uuid('platform_id').references(() => platforms.id),
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
  appliesTo: varchar('applies_to', { length: 50 }).default('all'),
  appliesToId: uuid('applies_to_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('offers_slug_idx').on(table.slug),
  activeIdx: index('offers_active_idx').on(table.isActive),
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
