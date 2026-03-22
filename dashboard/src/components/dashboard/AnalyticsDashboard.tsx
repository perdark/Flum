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
      } catch (err) {
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
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
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

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          trend="+12.5%"
          trendUp={true}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Orders" value={data.orders.total.toString()} />
        <StatCard
          title="Today's Orders"
          value={data.orders.today.toString()}
        />
        <StatCard
          title="Pending Orders"
          value={data.orders.pending.toString()}
          highlight={true}
        />
        <StatCard
          title="Completed Orders"
          value={data.orders.completed.toString()}
        />
      </div>

      {/* Products Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {data.products.topSellers.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div>
                  <p className="font-medium text-slate-300">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.sold} sold</p>
                </div>
                <p className="font-semibold text-white">
                  {formatCurrency(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Low Stock Products
          </h3>
          <div className="space-y-3">
            {data.products.lowStock > 0 ? (
              <p className="text-slate-300">
                <span className="px-2 py-1 bg-red-950 text-red-400 border border-red-900 text-sm rounded">
                  {data.products.lowStock}
                </span>{" "}
                products are low on stock
              </p>
            ) : (
              <p className="text-slate-500">All products are well stocked!</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Sales Trend</h3>
        <div className="h-64 flex items-end gap-1">
          {data.salesChart.map((day, index) => {
            const maxRevenue = Math.max(
              ...data.salesChart.map((d) => parseFloat(d.revenue))
            );
            const height = (parseFloat(day.revenue) / maxRevenue) * 100;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center group"
              >
                <div className="relative w-full">
                  <div
                    className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <div className="hidden group-hover:block absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {formatCurrency(day.revenue)}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            );
          })}
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
  highlight = false,
}: {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6 ${
        highlight ? "ring-2 ring-orange-500" : ""
      }`}
    >
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && (
        <p
          className={`text-sm mt-1 ${trendUp ? "text-green-400" : "text-red-400"}`}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
