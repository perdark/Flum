/**
 * TypeScript Type Definitions for Digital Product Store
 *
 * Central type definitions used across the application
 */

import { users, products, orders, inventoryItems, coupons, reviews } from "@/db/schema";

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = "admin" | "staff" | "merchant" | null;

// Customer Types
export type CustomerType = "retail" | "merchant";
export type CustomerStatus = "active" | "suspended" | "pending";

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  type: CustomerType;
  businessName?: string;
  taxId?: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Field Visibility Context
export type VisibilityContext = "admin" | "merchant" | "customer";

/** Staff-only: which dashboard areas this user may access (see STAFF_SCOPE_PERMISSIONS). */
export type StaffAccessScope = "full" | "inventory" | "inventory_orders";

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  /** Set for staff users; ignored for admin */
  staffAccessScope?: StaffAccessScope | null;
}

// Permission definitions for RBAC
export const PERMISSIONS = {
  // Admin only permissions
  MANAGE_STAFF: "manage_staff",
  MANAGE_COUPONS: "manage_coupons",
  MANAGE_OFFERS: "manage_offers",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_ANALYTICS: "view_analytics",
  VIEW_ACTIVITY_LOGS: "view_activity_logs",

  // Shared permissions (Admin + Staff)
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_INVENTORY: "manage_inventory",
  VIEW_PRODUCTS: "view_products",
  PROCESS_ORDERS: "process_orders",
  VIEW_ORDERS: "view_orders",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.MANAGE_OFFERS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.PROCESS_ORDERS,
    PERMISSIONS.VIEW_ORDERS,
  ],
  staff: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.PROCESS_ORDERS,
  ],
  merchant: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_ORDERS,
  ],
};

/** Effective permissions for staff accounts (admin uses ROLE_PERMISSIONS.admin). */
export const STAFF_SCOPE_PERMISSIONS: Record<StaffAccessScope, Permission[]> = {
  /** Overview, analytics, catalog (view), inventory, orders, manual sell */
  full: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.PROCESS_ORDERS,
  ],
  /** Inventory, costs, templates — no orders or overview analytics */
  inventory: [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.MANAGE_INVENTORY],
  /** Inventory plus orders and manual sell — no overview/analytics */
  inventory_orders: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.PROCESS_ORDERS,
  ],
};

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export type InventoryFieldDefinition = {
  name: string;
  type: "string" | "number" | "boolean" | "group" | "multiline";
  required: boolean;
  label: string;
  isVisibleToAdmin: boolean;
  isVisibleToMerchant: boolean;
  isVisibleToCustomer: boolean;
  repeatable: boolean;
  eachLineIsProduct: boolean;
  linkedTo: string | null;
  linkGroup: string | null;
  parentId: string | null;
  displayOrder: number;
};

export interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean" | "group" | "multiline";
  required: boolean;
  label: string;
  isVisibleToAdmin: boolean;
  isVisibleToMerchant: boolean;
  isVisibleToCustomer: boolean;
  repeatable?: boolean;
  eachLineIsProduct?: boolean;
  linkedTo?: string | null;
  linkGroup?: string | null;
  parentId?: string | null;
  displayOrder?: number;
}

export type InventoryTemplate = {
  id: string;
  name: string;
  description: string | null;
  fieldsSchema: InventoryFieldDefinition[];
  isActive: boolean;
};

export type ProductWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  inventoryTemplateId: string | null;
  isActive: boolean;
  stockCount: number;
  totalSold: number;
  averageRating: string | null;
  reviewCount: number;
  categories?: Array<{ id: string; name: string; parentId: string | null }>;
  images?: Array<{ url: string; alt: string | null; order: number }>;
};

// ============================================================================
// STOCK TYPE ENUMS
// ============================================================================

export type SaleType = "inventory_stock" | "product_auto" | "product_manual";

// ============================================================================
// STOCK MISMATCH ALERT TYPES
// ============================================================================

export interface StockMismatchField {
  fieldName: string;
  fieldLabel: string;
  totalCount: number;
  linkedFieldName: string | null;
  linkedFieldTotalCount: number | null;
  unmatchedCount: number;
}

export interface StockMismatchAlert {
  templateId: string;
  templateName: string;
  stockTypeName: string | null;
  productId: string | null;
  productName: string | null;
  fields: StockMismatchField[];
  sellableQuantity: number;
  totalAvailable: number;
  severity: "info" | "warning" | "error";
}

export interface StockVariantAvailabilitySlice {
  variantId: string | null;
  sellableQuantity: number;
  fieldCounts: Record<string, number>;
  linkedGroups: Record<string, { fields: string[]; minCount: number }>;
  hasMismatch: boolean;
  mismatches: StockMismatchField[];
}

export interface StockAvailability {
  templateId: string;
  productId: string | null;
  fieldCounts: Record<string, number>;
  linkedGroups: Record<string, { fields: string[]; minCount: number }>;
  sellableQuantity: number;
  hasMismatch: boolean;
  mismatches: StockMismatchField[];
  /** Present when the product has multiple variants — stock analysed per variant pool. */
  variantBreakdown?: StockVariantAvailabilitySlice[];
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export type InventoryStatus = "available" | "reserved" | "sold" | "expired";

export type InventoryItem = {
  id: string;
  templateId: string | null;
  productId: string;
  values: Record<string, string | number | boolean>;
  cost?: string | null;
  status: InventoryStatus;
  orderItemId: string | null;
  reservedUntil: Date | null;
  reservedBy?: string | null;
  purchasedAt: Date | null;
};

// Multi-Sell Inventory Unit
export interface InventoryUnit {
  id: string;
  productId: string;
  physicalUnitId: string;
  saleCount: number;
  maxSales: number;
  cooldownUntil: Date | null;
  cooldownDurationHours: number;
  status: "available" | "in_cooldown" | "exhausted";
  lastSaleAt: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Product Pricing Tier
export interface ProductPricing {
  id: string;
  productId: string;
  customerType: "retail" | "merchant" | "admin";
  cost?: string;
  wholesalePrice?: string;
  retailPrice?: string;
  currency: string;
  minQuantity?: number;
  creditEligible: boolean;
  creditTermsDays?: number;
  validFrom: Date;
  validUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Bundle Item
export interface BundleItem {
  id: string;
  bundleProductId: string;
  templateFieldId: string;
  lineIndex: number;
  productId?: string;
  variantId?: string | null;
  productName: string;
  quantity: number;
  priceOverride?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded";
export type FulfillmentStatus = "pending" | "processing" | "delivered" | "failed";

export interface CreateOrderInput {
  customerEmail: string;
  customerName?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  couponCode?: string;
}

export interface OrderWithItems {
  id: string;
  customerEmail: string;
  customerName: string | null;
  subtotal: string;
  discount: string;
  total: string;
  currency: string;
  couponId: string | null;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  deliveredAt: Date | null;
  processedBy: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    product?: {
      name: string;
      slug: string;
    };
  }>;
}

// ============================================================================
// COUPON TYPES
// ============================================================================

export type CouponDiscountType = "percentage" | "fixed";

export interface CouponValidation {
  valid: boolean;
  coupon?: typeof coupons.$inferSelect;
  error?: string;
  discountAmount?: string;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export interface CreateReviewInput {
  productId: string;
  customerEmail: string;
  rating: number;
  comment?: string;
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

export type ActivityAction =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "inventory_added"
  | "inventory_sold"
  | "inventory_deleted"
  | "manual_template_sell"
  | "order_created"
  | "order_completed"
  | "order_cancelled"
  | "order_refunded"
  | "order_claimed"
  | "order_released"
  | "coupon_created"
  | "coupon_updated"
  | "coupon_deleted"
  | "staff_created"
  | "staff_updated"
  | "staff_deleted"
  | "review_approved"
  | "review_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "currency_created"
  | "currency_updated"
  | "currency_deleted"
  | "settings_updated"
  | "manual_sell"
  | "cost_entry_created"
  | "cost_entry_updated"
  | "login"
  | "logout";

export interface ActivityLogEntry {
  id: string;
  userId: string | null;
  action: ActivityAction;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
  user?: {
    name: string;
    email: string;
    role: UserRole;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AnalyticsDashboard {
  revenue: {
    total: string;
    today: string;
    thisMonth: string;
    thisWeek: string;
    trend: string;
  };
  orders: {
    total: number;
    today: number;
    pending: number;
    processing: number;
    completed: number;
    manualInventory: number;
    manualProduct: number;
    pendingValue: string;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    lowStockItems: Array<{ id: string; name: string; stockCount: number }>;
    topSellers: Array<{
      id: string;
      name: string;
      sold: number;
      revenue: string;
    }>;
  };
  stock: {
    totalItems: number;
    availableItems: number;
    soldInPeriod: number;
  };
  salesChart: Array<{
    date: string;
    revenue: string;
    orders: number;
  }>;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
