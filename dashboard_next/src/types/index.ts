/**
 * TypeScript Type Definitions for Digital Product Store
 *
 * Central type definitions used across the application
 */

import { users, products, orders, inventoryItems, coupons, reviews } from "@/db/schema";

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = "admin" | "staff";

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
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
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
  type: "string" | "number" | "boolean";
  required: boolean;
  label: string;
};

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
  platforms?: Array<{ name: string; region: string | null }>;
  images?: Array<{ url: string; alt: string | null; order: number }>;
};

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export type InventoryStatus = "available" | "reserved" | "sold" | "expired";

export type InventoryItem = {
  id: string;
  templateId: string;
  productId: string;
  values: Record<string, string | number | boolean>;
  status: InventoryStatus;
  orderItemId: string | null;
  reservedUntil: Date | null;
  purchasedAt: Date | null;
};

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderStatus = "pending" | "completed" | "cancelled" | "refunded";
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
  | "platform_created"
  | "platform_updated"
  | "platform_deleted"
  | "batch_created"
  | "batch_rolled_back"
  | "manual_sell"
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
  };
  orders: {
    total: number;
    today: number;
    pending: number;
    completed: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    topSellers: Array<{
      id: string;
      name: string;
      sold: number;
      revenue: string;
    }>;
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
