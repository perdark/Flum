/**
 * Analytics API Routes
 *
 * GET /api/analytics - Get dashboard analytics data
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, products, orderItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { sql, and, gte, lte } from "drizzle-orm";

// ============================================================================
// GET /api/analytics - Get analytics data
// ============================================================================()

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_ANALYTICS);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    const db = getDb();

    // Calculate date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total revenue (all time)
    const [totalRevenue] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(total), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          sql`deleted_at IS NULL`
        )
      );

    // Get today's revenue
    const [todayRevenue] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(total), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          gte(orders.createdAt, today),
          sql`deleted_at IS NULL`
        )
      );

    // Get this week's revenue
    const [weekRevenue] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(total), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          gte(orders.createdAt, weekAgo),
          sql`deleted_at IS NULL`
        )
      );

    // Get this month's revenue
    const [monthRevenue] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(total), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          gte(orders.createdAt, monthAgo),
          sql`deleted_at IS NULL`
        )
      );

    // Get order counts
    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`deleted_at IS NULL`);

    const [todayOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(gte(orders.createdAt, today), sql`deleted_at IS NULL`));

    const [pendingOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          sql`status = 'pending'`,
          sql`deleted_at IS NULL`
        )
      );

    const [completedOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          sql`deleted_at IS NULL`
        )
      );

    // Get product stats
    const [totalProducts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(sql`deleted_at IS NULL`);

    const [activeProducts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          sql`is_active = true`,
          sql`deleted_at IS NULL`
        )
      );

    // Get low stock products (less than 5 items)
    const lowStockProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stockCount: products.stockCount,
      })
      .from(products)
      .where(
        and(
          sql`stock_count < 5`,
          sql`is_active = true`,
          sql`deleted_at IS NULL`
        )
      )
      .orderBy(products.stockCount)
      .limit(10);

    // Get top selling products
    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        totalSold: products.totalSold,
        revenue: sql<number>`(total_sold * price)::numeric`,
      })
      .from(products)
      .where(
        and(
          sql`is_active = true`,
          sql`deleted_at IS NULL`
        )
      )
      .orderBy(sql`total_sold DESC`)
      .limit(5);

    // Get sales chart data (daily for the period)
    const daysInPeriod = parseInt(period);
    const salesChartData = [];

    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const [dayStats] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(total), '0')`,
          orders: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            sql`created_at < ${endDate}`,
            sql`status = 'completed'`,
            sql`deleted_at IS NULL`
          )
        );

      salesChartData.push({
        date: date.toISOString().split("T")[0],
        revenue: dayStats.revenue,
        orders: dayStats.orders,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue?.revenue?.toString() || "0",
          today: todayRevenue?.revenue?.toString() || "0",
          thisWeek: weekRevenue?.revenue?.toString() || "0",
          thisMonth: monthRevenue?.revenue?.toString() || "0",
        },
        orders: {
          total: totalOrders?.count || 0,
          today: todayOrders?.count || 0,
          pending: pendingOrders?.count || 0,
          completed: completedOrders?.count || 0,
        },
        products: {
          total: totalProducts?.count || 0,
          active: activeProducts?.count || 0,
          lowStock: lowStockProducts,
          topSellers: topProducts,
        },
        salesChart: salesChartData,
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

    console.error("Get analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
