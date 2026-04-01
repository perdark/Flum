"use client";

/**
 * Analytics Dashboard Component
 *
 * Client component that fetches and displays analytics data
 */

import { useEffect, useState } from "react";
import type { AnalyticsDashboard as AnalyticsData } from "@/types";

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics");
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load analytics");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-lg">
        Error loading analytics: {error || "Unknown error"}
      </div>
    );
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount || "0"));
  };

  const trendIsUp = !data.revenue.trend.startsWith("-");

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          trend={data.revenue.trend}
          trendUp={trendIsUp}
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data.revenue.today)}
        />
        <StatCard
          title="This Week"
          value={formatCurrency(data.revenue.thisWeek)}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(data.revenue.thisMonth)}
        />
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Total Orders" value={data.orders.total.toString()} />
        <StatCard title="Today" value={data.orders.today.toString()} />
        <StatCard
          title="Pending"
          value={data.orders.pending.toString()}
          subtitle={parseFloat(data.orders.pendingValue) > 0 ? formatCurrency(data.orders.pendingValue) : undefined}
          highlight={data.orders.pending > 0}
        />
        <StatCard
          title="Processing"
          value={data.orders.processing.toString()}
        />
        <StatCard title="Completed" value={data.orders.completed.toString()} />
        <StatCard
          title="Manual (stock/product)"
          value={`${data.orders.manualInventory} / ${data.orders.manualProduct}`}
        />
      </div>

      {/* Stock Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Stock Items" value={data.stock.totalItems.toString()} />
        <StatCard
          title="Available"
          value={data.stock.availableItems.toString()}
          highlight={data.stock.availableItems < 10}
        />
        <StatCard title="Sold (period)" value={data.stock.soldInPeriod.toString()} />
      </div>

      {/* Products & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {data.products.topSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              data.products.topSellers.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Low Stock Products
          </h3>
          <div className="space-y-2">
            {data.products.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well stocked</p>
            ) : (
              data.products.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className={`text-sm font-medium ${item.stockCount === 0 ? "text-destructive" : "text-warning"}`}>
                    {item.stockCount} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Sales Trend</h3>
        <div className="h-64 flex items-end gap-1">
          {data.salesChart.length === 0 ? (
            <p className="text-sm text-muted-foreground m-auto">No sales data for this period</p>
          ) : (
            data.salesChart.map((day, index) => {
              const maxRevenue = Math.max(...data.salesChart.map((d) => parseFloat(d.revenue)), 1);
              const height = (parseFloat(day.revenue) / maxRevenue) * 100;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div className="relative w-full">
                    <div
                      className="bg-primary hover:bg-primary/90 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="hidden group-hover:block absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary text-foreground text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {formatCurrency(day.revenue)} ({day.orders} orders)
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  trendUp,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-lg shadow-sm p-6 ${
        highlight ? "ring-2 ring-orange-500" : ""
      }`}
    >
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p
          className={`text-sm mt-1 ${trendUp ? "text-success" : "text-destructive"}`}
        >
          {trend} vs last week
        </p>
      )}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
