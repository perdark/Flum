/**
 * Drizzle ORM Schema for Digital Product Store Dashboard
 *
 * This schema implements:
 * - User authentication with RBAC (Admin/Staff roles)
 * - Digital product management with dynamic inventory templates
 * - Order processing with auto-delivery
 * - Coupon system with usage tracking
 * - Review system with one-per-user validation
 * - Activity logging for audit trails
 * - Soft deletes throughout
 */

import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================================================
// AUTH & USER MANAGEMENT
// ============================================================================

/**
 * Users table - stores admin and staff accounts
 * Role-based access control: 'admin' or 'staff'
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  })
);

// Sessions table for secure authentication
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: index("sessions_token_idx").on(table.token),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  })
);

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

/**
 * Products table - core digital products (games, accounts, gift cards, etc.)
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    // Links to dynamic inventory template
    inventoryTemplateId: uuid("inventory_template_id").references(
      () => inventoryTemplates.id,
      { onDelete: "restrict" }
    ),
    isActive: boolean("is_active").notNull().default(true),
    stockCount: integer("stock_count").notNull().default(0), // Cached count
    totalSold: integer("total_sold").notNull().default(0),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (table) => ({
    slugIdx: index("products_slug_idx").on(table.slug),
    isActiveIdx: index("products_is_active_idx").on(table.isActive),
    templateIdx: index("products_template_idx").on(table.inventoryTemplateId),
  })
);

/**
 * Product platforms - defines which platforms a product supports
 * Examples: Steam, Epic Games, PlayStation, Xbox, etc.
 */
export const productPlatforms = pgTable(
  "product_platforms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Steam", "Epic Games"
    region: varchar("region", { length: 10 }), // e.g., "Global", "EU", "US"
  },
  (table) => ({
    productIdx: index("product_platforms_product_idx").on(table.productId),
  })
);

/**
 * Product images - supports multiple images per product
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 500 }).notNull(),
    alt: varchar("alt", { length: 255 }),
    order: integer("order").notNull().default(0),
  },
  (table) => ({
    productIdx: index("product_images_product_idx").on(table.productId),
  })
);

// ============================================================================
// DYNAMIC INVENTORY TEMPLATE SYSTEM
// ============================================================================

/**
 * Inventory Templates - defines the structure for different inventory types
 *
 * Examples:
 * - Game Key: fields = ["key"]
 * - Account: fields = ["email", "password", "notes"]
 * - Gift Card: fields = ["code", "region", "value"]
 */
export const inventoryTemplates = pgTable(
  "inventory_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(), // e.g., "Game Key", "Account", "Gift Card"
    description: text("description"),
    // JSON schema defining required fields
    // Example: [{"name": "key", "type": "string", "required": true, "label": "Activation Key"}]
    fieldsSchema: jsonb("fields_schema").notNull().$type<
      Array<{
        name: string;
        type: "string" | "number" | "boolean";
        required: boolean;
        label: string;
      }>
    >(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    nameIdx: index("inventory_templates_name_idx").on(table.name),
  })
);

/**
 * Inventory Items - stores actual inventory items with dynamic values
 *
 * Each item stores its field values as JSONB, allowing flexible structures
 * Example for Game Key: { "key": "XXXXX-XXXXX-XXXXX" }
 * Example for Account: { "email": "user@example.com", "password": "secret123" }
 */
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => inventoryTemplates.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Dynamic field values based on template schema
    values: jsonb("values").notNull(),
    status: varchar("status", {
      enum: ["available", "reserved", "sold", "expired"],
    }).notNull().default("available"),
    // Linked when sold, for order fulfillment
    orderItemId: uuid("order_item_id"),
    reservedUntil: timestamp("reserved_until"), // For temporary reservation during checkout
    purchasedAt: timestamp("purchased_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    templateIdx: index("inventory_items_template_idx").on(table.templateId),
    productIdx: index("inventory_items_product_idx").on(table.productId),
    statusIdx: index("inventory_items_status_idx").on(table.status),
    orderItemIdx: index("inventory_items_order_item_idx").on(table.orderItemId),
    // Composite index for finding available items efficiently
    availableIdx: index("inventory_items_available_idx").on(
      table.productId,
      table.status
    ),
  })
);

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * Orders table - main order records
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Customer information (not logged in users)
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }),
    // Order details
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    // Coupon applied
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    // Status tracking
    status: varchar("status", {
      enum: ["pending", "completed", "cancelled", "refunded"],
    }).notNull().default("pending"),
    // Auto-delivery tracking
    fulfillmentStatus: varchar("fulfillment_status", {
      enum: ["pending", "processing", "delivered", "failed"],
    }).notNull().default("pending"),
    deliveredAt: timestamp("delivered_at"),
    // Staff who processed the order
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    customerEmailIdx: index("orders_customer_email_idx").on(table.customerEmail),
    statusIdx: index("orders_status_idx").on(table.status),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
    couponIdx: index("orders_coupon_idx").on(table.couponId),
  })
);

/**
 * Order Items - individual products within an order
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    // Delivered inventory items (linked after fulfillment)
    deliveredInventoryIds: jsonb("delivered_inventory_ids").$type<string[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    productIdx: index("order_items_product_idx").on(table.productId),
  })
);

// ============================================================================
// COUPON SYSTEM
// ============================================================================

/**
 * Coupons table - discount codes
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    // Discount type: percentage (e.g., 20%) or fixed (e.g., $10)
    discountType: varchar("discount_type", {
      enum: ["percentage", "fixed"],
    }).notNull(),
    discountValue: decimal("discount_value", {
      precision: 10,
      scale: 2,
    }).notNull(),
    // Constraints
    minPurchase: decimal("min_purchase", { precision: 10, scale: 2 }).default("0"),
    maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // For percentage discounts
    // Usage limits
    usageLimit: integer("usage_limit"), // null = unlimited
    usageCount: integer("usage_count").notNull().default(0),
    // User-specific limits (uses per customer)
    userLimit: integer("user_limit").default(1),
    // Validity period
    validFrom: timestamp("valid_from").notNull().defaultNow(),
    validUntil: timestamp("valid_until"),
    isActive: boolean("is_active").notNull().default(true),
    // Applicable to specific products or all products
    applicableProductIds: jsonb("applicable_product_ids").$type<string[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    codeIdx: index("coupons_code_idx").on(table.code),
    isActiveIdx: index("coupons_is_active_idx").on(table.isActive),
  })
);

/**
 * Coupon Usage - tracks which customers used which coupons
 */
export const couponUsage = pgTable(
  "coupon_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    discountAmount: decimal("discount_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    usedAt: timestamp("used_at").notNull().defaultNow(),
  },
  (table) => ({
    couponIdx: index("coupon_usage_coupon_idx").on(table.couponId),
    orderIdx: index("coupon_usage_order_idx").on(table.orderId),
    customerIdx: index("coupon_usage_customer_idx").on(table.customerEmail),
    // Prevent duplicate usage: same coupon + same customer
    uniqueCouponCustomer: index("coupon_usage_unique_idx").on(table.couponId, table.customerEmail),
  })
);

// ============================================================================
// REVIEW SYSTEM
// ============================================================================

/**
 * Reviews table - customer product reviews
 * Enforces: one review per customer per product
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    productIdx: index("reviews_product_idx").on(table.productId),
    // Unique constraint: one review per customer per product
    uniqueProductCustomer: index("reviews_unique_idx").on(
      table.productId,
      table.customerEmail
    ),
  })
);

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Activity Logs - audit trail for all admin/staff actions
 *
 * Logged actions include:
 * - product_created, product_updated, product_deleted
 * - inventory_added, inventory_sold
 * - order_created, order_completed, order_cancelled
 * - coupon_created, coupon_updated, coupon_deleted
 * - staff_created, staff_updated, staff_deleted
 * - review_approved, review_deleted
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // Action: e.g., "product_created", "order_fulfilled"
    action: varchar("action", { length: 100 }).notNull(),
    // Entity: e.g., "product", "order", "coupon"
    entity: varchar("entity", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    // Additional context (JSON)
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("activity_logs_user_idx").on(table.userId),
    actionIdx: index("activity_logs_action_idx").on(table.action),
    entityIdx: index("activity_logs_entity_idx").on(table.entity),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  })
);

// ============================================================================
// ANALYTICS AGGREGATION (Optional for performance)
// ============================================================================

/**
 * Daily Analytics - pre-aggregated statistics for faster dashboard loading
 * Updated via scheduled jobs or triggers
 */
export const dailyAnalytics = pgTable(
  "daily_analytics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull().unique(),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
    ordersCount: integer("orders_count").notNull().default(0),
    itemsSold: integer("items_sold").notNull().default(0),
    uniqueCustomers: integer("unique_customers").notNull().default(0),
    averageOrderValue: decimal("average_order_value", {
      precision: 10,
      scale: 2,
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dateIdx: index("daily_analytics_date_idx").on(table.date),
  })
);
