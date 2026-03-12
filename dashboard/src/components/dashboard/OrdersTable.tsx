"use client";

/**
 * Orders Table Component
 *
 * Displays list of orders with actions to process/fulfill
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface Order {
  id: string;
  customerEmail: string;
  customerName: string | null;
  subtotal: string;
  discount: string;
  total: string;
  currency: string;
  status: "pending" | "completed" | "cancelled" | "refunded";
  fulfillmentStatus: "pending" | "processing" | "delivered" | "failed";
  items: OrderItem[];
  createdAt: string;
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (statusFilter) params.set("status", statusFilter);

        const response = await fetch(`/api/orders?${params}`);
        const result = await response.json();

        if (result.success) {
          setOrders(result.data);
          setTotalPages(result.pagination.totalPages);
        } else {
          setError(result.error || "Failed to load orders");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [page, statusFilter]);

  const handleFulfillOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill" }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh orders
        window.location.reload();
      } else {
        alert(result.error || "Failed to fulfill order");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount || "0"));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-950 text-yellow-400 border border-yellow-900";
      case "completed":
        return "bg-green-950 text-green-400 border border-green-900";
      case "cancelled":
        return "bg-red-950 text-red-400 border border-red-900";
      case "refunded":
        return "bg-slate-800 text-slate-400 border border-slate-700";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getFulfillmentColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-950 text-yellow-400 border border-yellow-900";
      case "processing":
        return "bg-blue-950 text-blue-400 border border-blue-900";
      case "delivered":
        return "bg-green-950 text-green-400 border border-green-900";
      case "failed":
        return "bg-red-950 text-red-400 border border-red-900";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-800">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading orders: {error}
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
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Fulfillment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-800">
                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                  {order.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-white">
                      {order.customerName || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">{order.customerEmail}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {order.items.length} item(s)
                </td>
                <td className="px-6 py-4 font-medium text-white">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${getFulfillmentColor(
                      order.fulfillmentStatus
                    )}`}
                  >
                    {order.fulfillmentStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </Link>
                    {order.status === "pending" &&
                      order.fulfillmentStatus !== "delivered" && (
                        <button
                          onClick={() => handleFulfillOrder(order.id)}
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Fulfill
                        </button>
                      )}
                  </div>
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
