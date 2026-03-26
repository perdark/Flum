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
      return "text-success";
    if (action.includes("deleted") || action.includes("cancelled"))
      return "text-destructive";
    if (action.includes("updated")) return "text-primary";
    return "text-muted-foreground";
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
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-lg">
        Error loading activity logs: {error}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted">
                <td className="px-6 py-4">
                  <span className={`font-medium ${getActionColor(log.action)}`}>
                    {formatAction(log.action)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <div>
                    <span className="font-medium text-foreground">{formatEntity(log.entity)}</span>
                    <span className="text-muted-foreground ml-1 font-mono text-xs">
                      ({log.entityId.slice(0, 8)}...)
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {log.user ? (
                    <div>
                      <p className="font-medium text-foreground">
                        {log.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{log.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                  {log.ipAddress || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-input text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-input text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
