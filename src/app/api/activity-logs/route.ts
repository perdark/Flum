/**
 * Activity Logs API Routes
 *
 * GET /api/activity-logs - Get activity logs with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { eq, and, sql, desc, like, type SQL } from "drizzle-orm";
import { getRecentActivity } from "@/services/activityLog";

// ============================================================================
// GET /api/activity-logs - Get activity logs
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions: SQL[] = [];

    if (action) {
      conditions.push(eq(activityLogs.action, action));
    }

    if (entity) {
      conditions.push(eq(activityLogs.entity, entity));
    }

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogs);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const countResult = await countQuery;

    const total = countResult[0]?.count || 0;

    // Get logs with user details
    const logsQuery = db
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
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      logsQuery.where(and(...conditions));
    }

    const logs = await logsQuery;

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    console.error("Get activity logs error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
