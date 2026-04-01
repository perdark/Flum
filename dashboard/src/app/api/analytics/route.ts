/**
 * Analytics API Routes
 *
 * GET /api/analytics - Get dashboard analytics data
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, products, inventoryItems } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { sql, and, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.VIEW_ANALYTICS);

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const db = getDb();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = new Date(today.getTime() - period * 24 * 60 * 60 * 1000);

    // ---- Revenue ----
    const [totalRevenue] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(and(sql`status = 'completed'`, sql`deleted_at IS NULL`));

    const [todayRevenue] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(and(sql`status = 'completed'`, gte(orders.createdAt, today), sql`deleted_at IS NULL`));

    const [weekRevenue] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(and(sql`status = 'completed'`, gte(orders.createdAt, weekAgo), sql`deleted_at IS NULL`));

    const [lastWeekRevenue] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(
        and(
          sql`status = 'completed'`,
          gte(orders.createdAt, twoWeeksAgo),
          sql`created_at < ${weekAgo}`,
          sql`deleted_at IS NULL`
        )
      );

    const [monthRevenue] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(and(sql`status = 'completed'`, gte(orders.createdAt, monthAgo), sql`deleted_at IS NULL`));

    // Revenue trend: this week vs last week
    const thisWeekVal = parseFloat(totalRevenue.revenue) > 0 ? parseFloat(weekRevenue.revenue) : 0;
    const lastWeekVal = parseFloat(lastWeekRevenue.revenue);
    let revenueTrend = "0%";
    if (lastWeekVal > 0) {
      const pct = ((thisWeekVal - lastWeekVal) / lastWeekVal) * 100;
      revenueTrend = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    } else if (thisWeekVal > 0) {
      revenueTrend = "+100%";
    }

    // ---- Orders ----
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
      .where(and(sql`status = 'pending'`, sql`deleted_at IS NULL`));

    const [processingOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(sql`status = 'processing'`, sql`deleted_at IS NULL`));

    const [completedOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(sql`status = 'completed'`, sql`deleted_at IS NULL`));

    // Pending order value
    const [pendingValue] = await db
      .select({ total: sql<string>`COALESCE(SUM(total), '0')` })
      .from(orders)
      .where(and(sql`status = 'pending'`, sql`deleted_at IS NULL`));

    const [manualInventoryOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(sql`metadata->>'saleSource' = 'manual_inventory'`, sql`deleted_at IS NULL`));

    const [manualProductOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(sql`metadata->>'saleSource' = 'manual_product'`, sql`deleted_at IS NULL`));

    // ---- Products ----
    const [totalProducts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(sql`deleted_at IS NULL`);

    const [activeProducts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(sql`is_active = true`, sql`deleted_at IS NULL`));

    const lowStockItems = await db
      .select({
        id: products.id,
        name: products.name,
        stockCount: products.stockCount,
      })
      .from(products)
      .where(and(sql`stock_count < 5`, sql`is_active = true`, sql`deleted_at IS NULL`))
      .orderBy(products.stockCount)
      .limit(10);

    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        totalSold: products.totalSold,
        revenue: sql<string>`COALESCE((
          SELECT SUM((oi.subtotal)::numeric)
          FROM order_items oi
          INNER JOIN orders o2 ON o2.id = oi.order_id
          WHERE oi.product_id = products.id
            AND o2.status = 'completed'
            AND o2.deleted_at IS NULL
        ), 0)`,
      })
      .from(products)
      .where(and(sql`is_active = true`, sql`deleted_at IS NULL`))
      .orderBy(sql`total_sold DESC`)
      .limit(5);

    // ---- Stock usage ----
    const [stockTotal] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(sql`deleted_at IS NULL`);

    const [stockAvailable] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(and(sql`status = 'available'`, sql`deleted_at IS NULL`));

    const [stockSoldPeriod] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(and(sql`status = 'sold'`, gte(inventoryItems.purchasedAt, periodStart), sql`deleted_at IS NULL`));

    // ---- Sales chart: single grouped query ----
    const salesChartData = await db.execute(sql`
      SELECT
        date_trunc('day', created_at)::date AS date,
        COALESCE(SUM(total), '0') AS revenue,
        count(*)::int AS orders
      FROM orders
      WHERE status = 'completed'
        AND deleted_at IS NULL
        AND created_at >= ${periodStart}
      GROUP BY date_trunc('day', created_at)
      ORDER BY date ASC
    `);

    // Fill in missing days with zeroes
    const chartByDate = new Map<string, { revenue: string; orders: number }>();
    for (const row of salesChartData.rows as Array<{ date: string; revenue: string; orders: number }>) {
      const d = typeof row.date === "string" ? row.date : String(row.date);
      chartByDate.set(d.split("T")[0], { revenue: String(row.revenue), orders: row.orders });
    }
    const filledChart: Array<{ date: string; revenue: string; orders: number }> = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      filledChart.push({ date: key, ...(chartByDate.get(key) || { revenue: "0", orders: 0 }) });
    }

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue.revenue,
          today: todayRevenue.revenue,
          thisWeek: weekRevenue.revenue,
          thisMonth: monthRevenue.revenue,
          trend: revenueTrend,
        },
        orders: {
          total: totalOrders.count,
          today: todayOrders.count,
          pending: pendingOrders.count,
          processing: processingOrders.count,
          completed: completedOrders.count,
          manualInventory: manualInventoryOrders.count,
          manualProduct: manualProductOrders.count,
          pendingValue: pendingValue.total,
        },
        products: {
          total: totalProducts.count,
          active: activeProducts.count,
          lowStock: lowStockItems.length,
          lowStockItems,
          topSellers: topProducts.map((p) => ({
            id: p.id,
            name: p.name,
            sold: p.totalSold,
            revenue: String(p.revenue ?? "0"),
          })),
        },
        stock: {
          totalItems: stockTotal.count,
          availableItems: stockAvailable.count,
          soldInPeriod: stockSoldPeriod.count,
        },
        salesChart: filledChart,
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
