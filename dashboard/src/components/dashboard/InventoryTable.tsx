"use client";

/**
 * Inventory Table Component
 *
 * Displays list of inventory items with filtering
 */

import { useEffect, useState } from "react";

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  values: Record<string, string | number | boolean>;
  status: "available" | "reserved" | "sold" | "expired";
  createdAt: string;
}

export function InventoryTable() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
        });
        if (statusFilter) params.set("status", statusFilter);

        const response = await fetch(`/api/inventory?${params}`);
        const result = await response.json();

        if (result.success) {
          setItems(result.data);
          setTotalPages(result.pagination.totalPages);
        } else {
          setError(result.error || "Failed to load inventory");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, [page, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-950 text-green-400 border border-green-900";
      case "reserved":
        return "bg-yellow-950 text-yellow-400 border border-yellow-900";
      case "sold":
        return "bg-slate-800 text-slate-400 border border-slate-700";
      case "expired":
        return "bg-red-950 text-red-400 border border-red-900";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const displayValues = (values: Record<string, string | number | boolean>) => {
    // Get first 2 key-value pairs for display
    const entries = Object.entries(values).slice(0, 2);
    return entries.map(([key, value]) => (
      <span key={key} className="text-xs text-slate-500">
        {key}: {String(value)}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-800">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading inventory: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-800">
      {/* Filters */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Values
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800">
                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                  {item.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-white">
                    {item.productName}
                  </p>
                  <p className="text-sm text-slate-500">{item.productSlug}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {displayValues(item.values)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
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
