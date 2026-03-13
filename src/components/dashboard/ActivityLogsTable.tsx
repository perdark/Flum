"use client";

/**
 * Activity Logs Table Component
 *
 * Displays audit trail of all admin/staff actions
 */

import { useEffect, useState } from "react";

interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: "admin" | "staff";
  } | null;
}

export function ActivityLogsTable() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
        });
        if (actionFilter) params.set("action", actionFilter);

        const response = await fetch(`/api/activity-logs?${params}`);
        const result = await response.json();

        if (result.success) {
          setLogs(result.data);
          setTotalPages(result.pagination.totalPages);
        } else {
          setError(result.error || "Failed to load activity logs");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [page, actionFilter]);

  const getActionColor = (action: string) => {
    if (action.includes("created") || action.includes("added"))
      return "text-green-400";
    if (action.includes("deleted") || action.includes("cancelled"))
      return "text-red-400";
    if (action.includes("updated")) return "text-blue-400";
    return "text-slate-400";
  };

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatEntity = (entity: string) => {
    return entity.charAt(0).toUpperCase() + entity.slice(1);
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading activity logs: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex gap-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="product_created">Product Created</option>
            <option value="product_updated">Product Updated</option>
            <option value="product_deleted">Product Deleted</option>
            <option value="order_completed">Order Completed</option>
            <option value="inventory_added">Inventory Added</option>
            <option value="coupon_created">Coupon Created</option>
            <option value="staff_created">Staff Created</option>
            <option value="login">Login</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800">
                <td className="px-6 py-4">
                  <span className={`font-medium ${getActionColor(log.action)}`}>
                    {formatAction(log.action)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  <div>
                    <span className="font-medium text-white">{formatEntity(log.entity)}</span>
                    <span className="text-slate-500 ml-1 font-mono text-xs">
                      ({log.entityId.slice(0, 8)}...)
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {log.user ? (
                    <div>
                      <p className="font-medium text-white">
                        {log.user.name}
                      </p>
                      <p className="text-sm text-slate-500">{log.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-slate-500">System</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                  {log.ipAddress || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
