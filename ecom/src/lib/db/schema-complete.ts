/**
 * Fulmen Empire - Production Database Architecture
 *
 * Complete schema design for scalable digital products e-commerce store
 *
 * @author Fulmen Empire Backend Team
 * @version 1.0.0
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  smallint,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
  unique,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';

// ============================================================================
// TABLE DEFINITIONS
// ============================================================================

// ┌─────────────────────────────────────────────────────────────────────┐
// │ USERS & AUTHENTICATION                                                  │
// └─────────────────────────────────────────────────────────────────────┘

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  countryCode: varchar('country_code', { length: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  role: varchar('role', { length: 20 }).default('customer').notNull(),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  metadata: jsonb('metadata').$type<any>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  activeIdx: index('users_active_idx').on(table.isActive),
  roleIdx: index('users_role_idx').on(table.role),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ PLATFORMS (Hierarchical Tree)                                         │
// └─────────────────────────────────────────────────────────────────────┘

export const platforms = pgTable('platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  icon: varchar('icon', { length: 500 }),
  banner: varchar('banner', { length: 500 }),
  logo: varchar('logo', { length: 500 }),
  parentId: uuid('parent_id').references((): any => platforms.id, { onDelete: 'set null' }),
  level: smallint('level').default(0).notNull(),
  path: varchar('path', { length: 500 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  metadata: jsonb('metadata').$type<any>(),
  productCount: integer('product_count').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('platforms_slug_idx').on(table.slug),
  parentIdx: index('platforms_parent_idx').on(table.parentId),
  activeIdx: index('platforms_active_idx').on(table.isActive),
  pathIdx: index('platforms_path_idx').on(table.path),
  levelIdx: index('platforms_level_idx').on(table.level),
  featuredIdx: index('platforms_featured_idx').on(table.isFeatured),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ CATEGORIES                                                               │
// └─────────────────────────────────────────────────────────────────────┘

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  icon: varchar('icon', { length: 500 }),
  image: varchar('image', { length: 500 }),
  parentId: uuid('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<any>(),
  productCount: integer('product_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('categories_slug_idx').on(table.slug),
  parentIdx: index('categories_parent_idx').on(table.parentId),
  activeIdx: index('categories_active_idx').on(table.isActive),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ CURRENCIES                                                               │
// └─────────────────────────────────────────────────────────────────────┘

export const currencies = pgTable('currencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 3 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  symbolPosition: varchar('symbol_position', { length: 10 }).default('before'),
  exchangeRate: decimal('exchange_rate', { precision: 12, scale: 6 }).default('1.000000').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  decimals: smallint('decimals').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('currencies_code_idx').on(table.code),
  activeIdx: index('currencies_active_idx').on(table.isActive),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ PRODUCTS                                                                 │
// └─────────────────────────────────────────────────────────────────────┘

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 100 }).unique(),
  barcode: varchar('barcode', { length: 100 }),

  name: varchar('name', { length: 500 }).notNull(),
  nameAr: varchar('name_ar', { length: 500 }),
  slug: varchar('slug', { length: 500 }).unique().notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  shortDescription: varchar('short_description', { length: 500 }),
  shortDescriptionAr: varchar('short_description_ar', { length: 500 }),

  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),

  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  deliveryType: varchar('delivery_type', { length: 50 }).notNull(),
  deliveryConfig: jsonb('delivery_config').$type<any>(),

  maxQuantityPerOrder: integer('max_quantity_per_order').default(999).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  isNew: boolean('is_new').default(false).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isDigital: boolean('is_digital').default(true).notNull(),

  pointsReward: integer('points_reward').default(0).notNull(),
  pointsMultiplier: decimal('points_multiplier', { precision: 3, scale: 2 }).default('1.00'),

  image: varchar('image', { length: 500 }),
  images: jsonb('images').$type<string[]>(),
  videoUrl: varchar('video_url', { length: 500 }),
  videoThumbnail: varchar('video_thumbnail', { length: 500 }),

  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: varchar('meta_description', { length: 500 }),

  views: integer('views').default(0).notNull(),
  salesCount: integer('sales_count').default(0).notNull(),
  wishlistCount: integer('wishlist_count').default(0).notNull(),
  ratingAverage: decimal('rating_average', { precision: 3, scale: 2 }).default('0.00'),
  ratingCount: integer('rating_count').default(0).notNull(),

  metadata: jsonb('metadata').$type<any>(),

  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: unique('products_slug_idx').on(table.slug),
  skuIdx: unique('products_sku_idx').on(table.sku),
  categoryIdx: index('products_category_idx').on(table.categoryId),
  activeIdx: index('products_active_idx').on(table.isActive),
  featuredIdx: index('products_featured_idx').on(table.isFeatured),
  newIdx: index('products_new_idx').on(table.isNew),
  ratingIdx: index('products_rating_idx').on(table.ratingAverage),
  salesIdx: index('products_sales_idx').on(table.salesCount),
  priceIdx: index('products_price_idx').on(table.basePrice),
  deliveryTypeIdx: index('products_delivery_type_idx').on(table.deliveryType),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ PRODUCT-PLATFORM (Many-to-Many)                                       │
// └─────────────────────────────────────────────────────────────────────┘

export const productPlatforms = pgTable('product_platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id').notNull().references(() => platforms.id, { onDelete: 'cascade' }),

  platformPrice: decimal('platform_price', { precision: 10, scale: 2 }),
  platformSku: varchar('platform_sku', { length: 100 }),
  platformProductId: varchar('platform_product_id', { length: 255 }),

  isPrimary: boolean('is_primary').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.platformId] }),
  productIdx: index('product_platforms_product_idx').on(table.productId),
  platformIdx: index('product_platforms_platform_idx').on(table.platformId),
  primaryIdx: index('product_platforms_primary_idx').on(table.isPrimary),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ PRODUCT MEDIA                                                            │
// └─────────────────────────────────────────────────────────────────────┘

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  alt: varchar('alt', { length: 255 }),
  altAr: varchar('alt_ar', { length: 255 }),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productId),
  sortIdx: index('product_images_sort_idx').on(table.sortOrder),
}));

export const productVideos = pgTable('product_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  title: varchar('title', { length: 255 }),
  titleAr: varchar('title_ar', { length: 255 }),
  duration: integer('duration'),
  platform: varchar('platform', { length: 50 }),
  platformVideoId: varchar('platform_video_id', { length: 100 }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_videos_product_idx').on(table.productId),
  sortIdx: index('product_videos_sort_idx').on(table.sortOrder),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ CART                                                                     │
// └─────────────────────────────────────────────────────────────────────┘

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  currencyId: uuid('currency_id').references(() => currencies.id),
  metadata: jsonb('metadata').$type<any>(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('carts_user_idx').on(table.userId),
  sessionIdx: index('carts_session_idx').on(table.sessionId),
  expiresAtIdx: index('carts_expires_at_idx').on(table.expiresAt),
}));

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id').references(() => platforms.id),

  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),

  productName: varchar('product_name', { length: 500 }).notNull(),
  productSlug: varchar('product_slug', { length: 500 }).notNull(),
  productImage: varchar('product_image', { length: 500 }),
  platformName: varchar('platform_name', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cartIdx: index('cart_items_cart_idx').on(table.cartId),
  productIdx: index('cart_items_product_idx').on(table.productId),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ ORDERS                                                                   │
// └─────────────────────────────────────────────────────────────────────┘

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),

  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phoneNumber: varchar('phone_number', { length: 20 }),

  status: varchar('status', { length: 50 }).default('pending').notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentId: varchar('payment_id', { length: 255 }),

  currencyId: uuid('currency_id').references(() => currencies.id),
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).default('0.00').notNull(),
  shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0.00').notNull(),
  discount: decimal('discount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),

  pointsUsed: integer('points_used').default(0).notNull(),
  pointsEarned: integer('points_earned').default(0).notNull(),

  customerNotes: text('customer_notes'),
  adminNotes: text('admin_notes'),

  trackingNumber: varchar('tracking_number', { length: 255 }),
  estimatedDeliveryAt: timestamp('estimated_delivery_at'),
  deliveredAt: timestamp('delivered_at'),

  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<any>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  refundedAt: timestamp('refunded_at'),
}, (table) => ({
  userIdx: index('orders_user_idx').on(table.userId),
  emailIdx: index('orders_email_idx').on(table.email),
  orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
  statusIdx: index('orders_status_idx').on(table.status),
  paymentStatusIdx: index('orders_payment_status_idx').on(table.paymentStatus),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'set null' }),
  platformId: uuid('platform_id').references(() => platforms.id, { onDelete: 'set null' }),

  productName: varchar('product_name', { length: 500 }).notNull(),
  productNameAr: varchar('product_name_ar', { length: 500 }),
  productSlug: varchar('product_slug', { length: 500 }).notNull(),
  productImage: varchar('product_image', { length: 500 }),
  platformName: varchar('platform_name', { length: 255 }),
  platformNameAr: varchar('platform_name_ar', { length: 255 }),

  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0.00'),

  pointsEarned: integer('points_earned').default(0).notNull(),

  deliveryType: varchar('delivery_type', { length: 50 }).notNull(),
  deliveryStatus: varchar('delivery_status', { length: 50 }).default('pending').notNull(),
  deliveryData: jsonb('delivery_data').$type<any>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  productIdx: index('order_items_product_idx').on(table.productId),
  deliveryStatusIdx: index('order_items_delivery_status_idx').on(table.deliveryStatus),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ DELIVERIES                                                               │
// └─────────────────────────────────────────────────────────────────────┘

export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),

  type: varchar('type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),

  sentAt: timestamp('sent_at'),
  claimedAt: timestamp('claimed_at'),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0).notNull(),

  emailSentAt: timestamp('email_sent_at'),
  emailClickCount: integer('email_click_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orderItemIdx: index('deliveries_order_item_idx').on(table.orderItemId),
  statusIdx: index('deliveries_status_idx').on(table.status),
  expiresAtIdx: index('deliveries_expires_at_idx').on(table.expiresAt),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ WISHLIST                                                                 │
// └─────────────────────────────────────────────────────────────────────┘

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id').references(() => platforms.id, { onDelete: 'set null' }),

  priceAlert: decimal('price_alert', { precision: 10, scale: 2 }),
  priceAlertEnabled: boolean('price_alert_enabled').default(true).notNull(),

  notifiedAt: timestamp('notified_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProductUnique: index('wishlists_user_product_unique').on(table.userId, table.productId),
  userIdx: index('wishlists_user_idx').on(table.userId),
  productIdx: index('wishlists_product_idx').on(table.productId),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REVIEWS                                                                  │
// └─────────────────────────────────────────────────────────────────────┘

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  orderItemId: uuid('order_item_id').references(() => orderItems.id),

  rating: smallint('rating').notNull(),
  title: varchar('title', { length: 255 }),
  comment: text('comment'),

  isApproved: boolean('is_approved').default(false).notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),

  adminResponse: text('admin_response'),
  adminRespondedAt: timestamp('admin_responded_at'),
  adminResponderId: uuid('admin_responder_id').references(() => users.id),

  helpfulCount: integer('helpful_count').default(0).notNull(),

  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProductUnique: index('reviews_user_product_unique').on(table.userId, table.productId),
  userIdx: index('reviews_user_idx').on(table.userId),
  productIdx: index('reviews_product_idx').on(table.productId),
  approvalIdx: index('reviews_approval_idx').on(table.isApproved),
  ratingIdx: index('reviews_rating_idx').on(table.rating),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ POINTS SYSTEM                                                            │
// └─────────────────────────────────────────────────────────────────────┘

export const pointsTransactions = pgTable('points_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id),
  offerId: uuid('offer_id').references(() => offers.id),

  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),

  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),

  expiresAt: timestamp('expires_at'),
  isExpired: boolean('is_expired').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('points_transactions_user_idx').on(table.userId),
  orderIdx: index('points_transactions_order_idx').on(table.orderId),
  typeIdx: index('points_transactions_type_idx').on(table.type),
  expiresAtIdx: index('points_transactions_expires_at_idx').on(table.expiresAt),
}));

export const userBalances = pgTable('user_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  availablePoints: integer('available_points').default(0).notNull(),
  pendingPoints: integer('pending_points').default(0).notNull(),
  expiredPoints: integer('expired_points').default(0).notNull(),

  totalEarned: integer('total_earned').default(0).notNull(),
  totalRedeemed: integer('total_redeemed').default(0).notNull(),

  lastTransactionId: uuid('last_transaction_id'),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('user_balances_user_unique_idx').on(table.userId),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ OFFERS                                                                   │
// └─────────────────────────────────────────────────────────────────────┘

export const offers = pgTable('offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),

  type: varchar('type', { length: 50 }).notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  valueType: varchar('value_type', { length: 20 }).default('percentage'),

  minPurchase: decimal('min_purchase', { precision: 10, scale: 2 }).default('0.00'),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  applicableCategories: jsonb('applicable_categories').$type<string[]>(),
  applicablePlatforms: jsonb('applicable_platforms').$type<string[]>(),
  applicableProducts: jsonb('applicable_products').$type<string[]>(),

  pointsMultiplier: decimal('points_multiplier', { precision: 3, scale: 2 }),

  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  maxUses: integer('max_uses'),
  maxUsesPerUser: integer('max_uses_per_user'),
  currentUses: integer('current_uses').default(0).notNull(),

  banner: varchar('banner', { length: 500 }),
  badge: varchar('badge', { length: 100 }),
  badgeColor: varchar('badge_color', { length: 20 }),

  priority: integer('priority').default(0).notNull(),
  metadata: jsonb('metadata').$type<any>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('offers_slug_idx').on(table.slug),
  activeIdx: index('offers_active_idx').on(table.isActive),
  dateRangeIdx: index('offers_date_range_idx').on(table.startDate, table.endDate),
  priorityIdx: index('offers_priority_idx').on(table.priority),
}));

export const productOffers = pgTable('product_offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  offerId: uuid('offer_id').notNull().references(() => offers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),

  originalPrice: decimal('original_price', { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal('discounted_price', { precision: 10, scale: 2 }).notNull(),
  discountPercentage: integer('discount_percentage').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.offerId, table.productId] }),
  productIdx: index('product_offers_product_idx').on(table.productId),
  offerIdx: index('product_offers_offer_idx').on(table.offerId),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ RECOMMENDATIONS                                                           │
// └─────────────────────────────────────────────────────────────────────┘

export const recommendations = pgTable('recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  relatedProductId: uuid('related_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),

  relationType: varchar('relation_type', { length: 50 }).notNull(),
  source: varchar('source', { length: 50 }),

  score: integer('score').default(0).notNull(),
  metadata: jsonb('metadata').$type<any>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('recommendations_product_idx').on(table.productId),
  typeIdx: index('recommendations_type_idx').on(table.relationType),
  scoreIdx: index('recommendations_score_idx').on(table.score),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ RECENTLY VIEWED                                                          │
// └─────────────────────────────────────────────────────────────────────┘

export const recentlyViewed = pgTable('recently_viewed', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  platformId: uuid('platform_id').references(() => platforms.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userIdx: index('recently_viewed_user_idx').on(table.userId),
  sessionIdx: index('recently_viewed_session_idx').on(table.sessionId),
  productIdx: index('recently_viewed_product_idx').on(table.productId),
  expiresAtIdx: index('recently_viewed_expires_at_idx').on(table.expiresAt),
}));

// ┌─────────────────────────────────────────────────────────────────────┐
// │ AUDIT LOG                                                                │
// └─────────────────────────────────────────────────────────────────────┘

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),

  changes: jsonb('changes').$type<any>(),
  oldValues: jsonb('old_values').$type<any>(),
  newValues: jsonb('new_values').$type<any>(),

  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
  entityIdIdx: index('audit_logs_entity_id_idx').on(table.entityId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type Platform = typeof platforms.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPlatform = typeof productPlatforms.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVideo = typeof productVideos.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type UserBalance = typeof userBalances.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type ProductOffer = typeof productOffers.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
