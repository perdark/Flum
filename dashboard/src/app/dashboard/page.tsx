/**
 * Dashboard Overview Page
 *
 * Displays key statistics for Fulmen Empire store
 */

import { getDb } from "@/db";
import { orders, products, reviews, users } from "@/db/schema";
import { eq, and, count, gte, sql } from "drizzle-orm";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Star,
  DollarSign,
  Users,
} from "lucide-react";

async function getOverviewStats() {
  const db = getDb();

  // Get total orders
  const [totalOrdersResult] = await db
    .select({ count: count() })
    .from(orders);
  const totalOrders = Number(totalOrdersResult?.count || 0);

  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayOrdersResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(gte(orders.createdAt, today));
  const todayOrders = Number(todayOrdersResult?.count || 0);

  // Get pending orders
  const [pendingOrdersResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, "pending"));
  const pendingOrders = Number(pendingOrdersResult?.count || 0);

  // Get total revenue (sum of all completed orders)
  const [revenueResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders);
  const totalRevenue = Number(revenueResult?.total || 0);

  // Get active products
  const [activeProductsResult] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.isActive, true));
  const activeProducts = Number(activeProductsResult?.count || 0);

  // Get total products
  const [totalProductsResult] = await db
    .select({ count: count() })
    .from(products);
  const totalProducts = Number(totalProductsResult?.count || 0);

  // Get pending reviews
  const [pendingReviewsResult] = await db
    .select({ count: count() })
    .from(reviews)
    .where(eq(reviews.isApproved, false));
  const pendingReviews = Number(pendingReviewsResult?.count || 0);

  // Get total staff/admin users
  const [staffResult] = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.role} IS NOT NULL`);
  const totalStaff = Number(staffResult?.count || 0);

  // Get recent orders (last 5)
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(orders.createdAt)
    .limit(5);

  return {
    totalOrders,
    todayOrders,
    pendingOrders,
    totalRevenue,
    activeProducts,
    totalProducts,
    pendingReviews,
    totalStaff,
    recentOrders,
  };
}

export default async function DashboardPage() {
  const stats = await getOverviewStats();

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      change: `+${stats.todayOrders} today`,
      icon: ShoppingCart,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      change: "Lifetime",
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Active Products",
      value: stats.activeProducts.toString(),
      change: `of ${stats.totalProducts} total`,
      icon: Package,
      color: "from-violet-500 to-purple-500",
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews.toString(),
      change: "Awaiting approval",
      icon: Star,
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Fulmen Empire Admin Dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-card rounded-xl p-6 border border-border hover:shadow-lg hover:shadow-black/[0.04] transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Users className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Staff Members</p>
              <p className="text-lg font-semibold text-foreground">{stats.totalStaff}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Orders</p>
              <p className="text-lg font-semibold text-foreground">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today's Orders</p>
              <p className="text-lg font-semibold text-foreground">{stats.todayOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
          <a
            href="/dashboard/orders"
            className="text-sm text-brand hover:text-amber-300 transition-colors"
          >
            View All
          </a>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p>No orders yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {order.customerName || order.customerEmail}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        order.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : order.status === "cancelled"
                            ? "bg-destructive/10 text-destructive border border-destructive/30"
                            : "bg-amber-500/10 text-brand border border-amber-500/20"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
