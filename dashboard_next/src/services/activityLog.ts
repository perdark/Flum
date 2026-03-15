/**
 * Activity Logging Service
 *
 * Provides centralized logging for all admin/staff actions
 * Creates an audit trail for security and compliance
 */

import { getDb } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { ActivityAction } from "@/types";
import { headers } from "next/headers";

// ============================================================================
// ACTIVITY LOGGING SERVICE
// ============================================================================()

export interface LogActivityOptions {
  userId: string | null;
  action: ActivityAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the database
 *
 * @param options - Activity details
 */
export async function logActivity(options: LogActivityOptions): Promise<void> {
  const db = getDb();

  // Get IP and User Agent from headers if not provided
  let ipAddress = options.ipAddress;
  let userAgent = options.userAgent;

  if (!ipAddress || !userAgent) {
    try {
      const headersList = await headers();
      ipAddress = ipAddress || headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;
      userAgent = userAgent || headersList.get("user-agent") || undefined;
    } catch {
      // Headers might not be available in all contexts
    }
  }

  await db.insert(activityLogs).values({
    userId: options.userId,
    action: options.action,
    entity: options.entity,
    entityId: options.entityId,
    metadata: options.metadata || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
}

/**
 * Get recent activity logs with user details
 */
export async function getRecentActivity(limit: number = 50) {
  const db = getDb();

  const logs = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      action: activityLogs.action,
      entity: activityLogs.entity,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      ipAddress: activityLogs.ipAddress,
      createdAt: activityLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    action: log.action as ActivityAction,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
    user: log.userName
      ? {
          name: log.userName,
          email: log.userEmail || "",
          role: log.userRole as "admin" | "staff",
        }
      : null,
  }));
}

/**
 * Get activity logs for a specific entity
 */
export async function getActivityForEntity(
  entity: string,
  entityId: string,
  limit: number = 20
) {
  const db = getDb();

  return db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.entity, entity),
        eq(activityLogs.entityId, entityId)
      )
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

/**
 * Get activity logs for a specific user
 */
export async function getActivityForUser(
  userId: string,
  limit: number = 50
) {
  const db = getDb();

  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON ACTIONS
// ============================================================================()

export async function logProductCreated(
  userId: string | null,
  productId: string,
  productName: string
) {
  return logActivity({
    userId,
    action: "product_created",
    entity: "product",
    entityId: productId,
    metadata: { productName },
  });
}

export async function logProductUpdated(
  userId: string | null,
  productId: string,
  changes: Record<string, unknown>
) {
  return logActivity({
    userId,
    action: "product_updated",
    entity: "product",
    entityId: productId,
    metadata: { changes },
  });
}

export async function logProductDeleted(
  userId: string | null,
  productId: string,
  productName: string
) {
  return logActivity({
    userId,
    action: "product_deleted",
    entity: "product",
    entityId: productId,
    metadata: { productName },
  });
}

export async function logInventoryAdded(
  userId: string | null,
  inventoryId: string,
  productId: string,
  quantity: number
) {
  return logActivity({
    userId,
    action: "inventory_added",
    entity: "inventory",
    entityId: inventoryId,
    metadata: { productId, quantity },
  });
}

export async function logInventorySold(
  userId: string | null,
  inventoryId: string,
  orderId: string
) {
  return logActivity({
    userId,
    action: "inventory_sold",
    entity: "inventory",
    entityId: inventoryId,
    metadata: { orderId },
  });
}

export async function logOrderCompleted(
  userId: string | null,
  orderId: string,
  total: string
) {
  return logActivity({
    userId,
    action: "order_completed",
    entity: "order",
    entityId: orderId,
    metadata: { total },
  });
}

export async function logOrderCancelled(
  userId: string | null,
  orderId: string,
  reason?: string
) {
  return logActivity({
    userId,
    action: "order_cancelled",
    entity: "order",
    entityId: orderId,
    metadata: { reason },
  });
}

export async function logCouponCreated(
  userId: string | null,
  couponId: string,
  code: string
) {
  return logActivity({
    userId,
    action: "coupon_created",
    entity: "coupon",
    entityId: couponId,
    metadata: { code },
  });
}

export async function logStaffCreated(
  userId: string | null,
  newStaffId: string,
  newStaffEmail: string,
  role: string
) {
  return logActivity({
    userId,
    action: "staff_created",
    entity: "user",
    entityId: newStaffId,
    metadata: { email: newStaffEmail, role },
  });
}

export async function logLogin(userId: string, email: string) {
  return logActivity({
    userId,
    action: "login",
    entity: "user",
    entityId: userId,
    metadata: { email },
  });
}

export async function logLogout(userId: string) {
  return logActivity({
    userId,
    action: "logout",
    entity: "user",
    entityId: userId,
  });
}

// ============================================================================
// PLATFORM LOGGING
// ============================================================================

export async function logPlatformCreated(
  userId: string | null,
  platformId: string,
  name: string
) {
  return logActivity({
    userId,
    action: "platform_created",
    entity: "platform",
    entityId: platformId,
    metadata: { name },
  });
}

export async function logPlatformUpdated(
  userId: string | null,
  platformId: string,
  changes: Record<string, unknown>
) {
  return logActivity({
    userId,
    action: "platform_updated",
    entity: "platform",
    entityId: platformId,
    metadata: { changes },
  });
}

export async function logPlatformDeleted(
  userId: string | null,
  platformId: string,
  name: string
) {
  return logActivity({
    userId,
    action: "platform_deleted",
    entity: "platform",
    entityId: platformId,
    metadata: { name },
  });
}

// ============================================================================
// BATCH LOGGING
// ============================================================================

export async function logBatchCreated(
  userId: string | null,
  batchId: string,
  name: string
) {
  return logActivity({
    userId,
    action: "batch_created",
    entity: "inventory_batch",
    entityId: batchId,
    metadata: { name },
  });
}

export async function logBatchRolledBack(
  userId: string | null,
  batchId: string,
  itemCount: number
) {
  return logActivity({
    userId,
    action: "batch_rolled_back",
    entity: "inventory_batch",
    entityId: batchId,
    metadata: { itemCount },
  });
}

// ============================================================================
// ORDER CLAIM LOGGING
// ============================================================================

export async function logOrderClaimed(
  userId: string,
  orderId: string
) {
  return logActivity({
    userId,
    action: "order_claimed",
    entity: "order",
    entityId: orderId,
  });
}

export async function logOrderReleased(
  userId: string,
  orderId: string
) {
  return logActivity({
    userId,
    action: "order_released",
    entity: "order",
    entityId: orderId,
  });
}

// ============================================================================
// MANUAL SELL LOGGING
// ============================================================================

export async function logManualSell(
  userId: string,
  orderId: string,
  itemCount: number
) {
  return logActivity({
    userId,
    action: "manual_sell",
    entity: "order",
    entityId: orderId,
    metadata: { itemCount },
  });
}
