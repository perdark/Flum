"use client";

/**
 * Orders Table Component
 *
 * Displays list of orders with simplified pending order fulfillment
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
  deliveredInventoryIds: string[] | null;
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
  claimedBy: string | null;
  claimedAt: string | null;
  claimExpiresAt: string | null;
  claimantName: string | null;
  processedBy: string | null;
  isClaimedByMe: boolean;
  isClaimExpired: boolean;
  items: OrderItem[];
  createdAt: string;
}

interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean";
  label: string;
  required: boolean;
}

interface ProductInfo {
  id: string;
  name: string;
  inventoryTemplateId: string | null;
  templateFields?: TemplateField[];
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Processing modal state
  const [processingModal, setProcessingModal] = useState<{
    show: boolean;
    order: Order | null;
  }>({ show: false, order: null });
  // State for field values: Record<productId, Record<fieldName, string>>
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [submittingProcessing, setSubmittingProcessing] = useState(false);
  const [newCost, setNewCost] = useState("");
  const [showCostField, setShowCostField] = useState(false);
  const [eachLineIsProduct, setEachLineIsProduct] = useState(false);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [deletingOrders, setDeletingOrders] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'unknown'>('unknown');

  // Fetch orders function - defined outside useEffect so it can be called elsewhere
  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchTemplates();
  }, [page, statusFilter]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.success && data.data?.user?.role) {
          setUserRole(data.data.user.role);
        }
      } catch (err) {
        console.error("Error fetching current user", err);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/summary?limit=100");
      const data = await res.json();
      if (data.success) {
        // Get template fields for each product
        const productsWithTemplates = await Promise.all(
          data.data.map(async (p: any) => {
            if (p.inventoryTemplateId) {
              const templateRes = await fetch("/api/inventory/templates");
              const templateData = await templateRes.json();
              if (templateData.success) {
                const template = templateData.data.find((t: any) => t.id === p.inventoryTemplateId);
                return {
                  ...p,
                  templateFields: template?.fieldsSchema || [],
                };
              }
            }
            return { ...p, templateFields: [] };
          })
        );
        setProducts(productsWithTemplates);
      }
    } catch (err) {
      console.error("Failed to load products");
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/inventory/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error("Failed to load templates");
    }
  };

  const handleUpdateOrder = async (orderId: string, action: string, status?: string, fulfillmentStatus?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, status, fulfillmentStatus }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || "Failed to update order");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingOrders[orderId]) {
      return;
    }

    setDeletingOrders((prev) => ({ ...prev, [orderId]: true }));

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.status === 403) {
        alert("You are not authorized to delete this order.");
        return;
      }

      const result = await response.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || "Failed to delete order");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setDeletingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Get parsed lines for a specific field of a product
  const getParsedLines = (productId: string, fieldName: string): string[] => {
    const values = fieldValues[productId]?.[fieldName] || "";
    return values
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
  };

  // Get count for each field of a product
  const getFieldCounts = (productId: string): Record<string, number> => {
    const product = products.find(p => p.id === productId);
    const templateFields = product?.templateFields || [];
    const counts: Record<string, number> = {};
    templateFields.forEach((field) => {
      counts[field.name] = getParsedLines(productId, field.name).length;
    });
    return counts;
  };

  // Calculate total items for a product (min of all field counts)
  const getTotalItems = (productId: string): number => {
    const counts = Object.values(getFieldCounts(productId));
    return counts.length > 0 ? Math.min(...counts) : 0;
  };

  const handleProcessingClick = async (order: Order) => {
    // First, claim the order if not already claimed by me
    let updatedOrder = order;
    if (!order.isClaimedByMe || order.isClaimExpired) {
      try {
        setClaimingOrderId(order.id);
        const response = await fetch("/api/orders/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        const result = await response.json();

        if (!result.success) {
          alert(result.error || "Failed to claim order. It may be claimed by another staff member.");
          setClaimingOrderId(null);
          return;
        }

        // Update the order object with the new status
        updatedOrder = { ...order, fulfillmentStatus: "processing", isClaimedByMe: true, isClaimExpired: false };

        // Refresh orders list to show updated status
        try {
          await fetchOrders();
        } catch (err) {
          console.error('Failed to refresh orders after claim', err);
        }
      } catch (err) {
        alert("Failed to claim order");
        setClaimingOrderId(null);
        return;
      }
    }

    setClaimingOrderId(null);
    setProcessingModal({ show: true, order: updatedOrder });
    // Initialize empty field values for products with pending items
    const initialFields: Record<string, Record<string, string>> = {};
    updatedOrder.items.forEach(item => {
      const delivered = (item.deliveredInventoryIds || []).length;
      const pending = item.quantity - delivered;
      if (pending > 0 && !initialFields[item.productId]) {
        initialFields[item.productId] = {};
      }
    });
    setFieldValues(initialFields);
  };

  // Update field value for a product
  const updateFieldValue = (productId: string, fieldName: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [fieldName]: value
      }
    }));
  };

  const handleAddInventoryAndComplete = async () => {
    if (!processingModal.order) return;

    const order = processingModal.order;
    const inventoryItems: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];

    // Parse inventory items for each product
    for (const item of order.items) {
      const delivered = (item.deliveredInventoryIds || []).length;
      const pending = item.quantity - delivered;

      if (pending <= 0) continue;

      const product = products.find(p => p.id === item.productId);
      const templateFields = product?.templateFields || [];
      const totalItems = getTotalItems(item.productId);

      if (totalItems === 0) continue;

      // Build items by combining values row by row
      for (let i = 0; i < totalItems; i++) {
        const itemObj: Record<string, string | number | boolean> = {};
        templateFields.forEach((field) => {
          const lines = getParsedLines(item.productId, field.name);
          const value = lines[i] || "";

          if (field.type === "number") {
            itemObj[field.name] = parseFloat(value) || 0;
          } else if (field.type === "boolean") {
            itemObj[field.name] = value.toLowerCase() === "true" || value === "1";
          } else {
            itemObj[field.name] = value;
          }
        });
        inventoryItems.push({ productId: item.productId, values: itemObj });
      }
    }

    if (inventoryItems.length === 0) {
      alert("Please add at least one inventory item");
      return;
    }

    setSubmittingProcessing(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/fulfill-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItems,
          newCost: showCostField && newCost ? parseFloat(newCost) : undefined,
          eachLineIsProduct,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.allFulfilled) {
          window.location.reload();
        } else {
          alert("Some items still pending. " + result.data.message);
          window.location.reload();
        }
      } else {
        alert(result.error || "Failed to add inventory");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmittingProcessing(false);
    }
  };

  const getTemplateFieldsForProduct = (productId: string): TemplateField[] => {
    const product = products.find(p => p.id === productId);
    return product?.templateFields || [];
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
      case "processing":
        return "bg-blue-950 text-blue-400 border border-blue-900";
      case "delivered":
        return "bg-green-950 text-green-400 border border-green-900";
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

  const getDisplayStatus = (order: Order): string => {
    if (["completed", "cancelled", "refunded"].includes(order.status)) {
      return order.status;
    }
    if (order.fulfillmentStatus === "processing" || order.fulfillmentStatus === "delivered") {
      return order.fulfillmentStatus;
    }
    return "pending";
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "refunded":
        return "Refunded";
      case "processing":
        return "Processing";
      case "delivered":
        return "Delivered";
      case "pending":
        return "Pending";
      default:
        return "Pending";
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
    <>
      <div className="bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-800">
        {/* Filters */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex gap-4 flex-wrap">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Sold By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((order) => {
                const isClaimedByMe = order.isClaimedByMe && !order.isClaimExpired;
                const isClaimedByOther = order.claimedBy && !order.isClaimedByMe && !order.isClaimExpired;
                const isExpired = order.isClaimExpired;
                const hasPendingItems = order.items.some(item => {
                  const delivered = (item.deliveredInventoryIds || []).length;
                  return delivered < item.quantity;
                });

                // Calculate total pending items
                const pendingCount = order.items.reduce((sum, item) => {
                  const delivered = (item.deliveredInventoryIds || []).length;
                  return sum + (item.quantity - delivered);
                }, 0);

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-800 ${
                      isClaimedByMe ? "bg-blue-900/10" : isClaimedByOther ? "bg-orange-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-4 text-sm text-slate-400 font-mono">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-white">
                          {order.customerName || "N/A"}
                        </p>
                        <p className="text-sm text-slate-500">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {order.items.length} item(s)
                      {hasPendingItems ? (
                        <span className="ml-2 text-yellow-400">({pendingCount} pending)</span>
                      ) : (
                        <span className="ml-2 text-green-400">(all delivered)</span>
                      )}
                      {process.env.NODE_ENV !== 'production' && (
                        <span className="ml-2 text-slate-600 text-xs">
                          [{order.items.map(i => `${(i.deliveredInventoryIds || []).length}/${i.quantity}`).join(', ')}]
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const displayStatus = getDisplayStatus(order);
                        return (
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(displayStatus)}`}>
                            {getStatusLabel(displayStatus)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      {order.claimedBy && !isExpired ? (
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            isClaimedByMe
                              ? "bg-blue-900/50 text-blue-400 border border-blue-800"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {order.claimantName || order.claimedBy?.slice(0, 8)}
                          {isClaimedByMe && " (You)"}
                        </span>
                      ) : order.processedBy ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-900/50 text-green-400 border border-green-800">
                          {order.processedBy}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/manual-sell/${order.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View
                        </Link>

                        {/* Show who's working on this order if claimed by someone else */}
                        {hasPendingItems && order.claimedBy && !isClaimedByMe && !isExpired && (
                          <span className="text-slate-500 text-xs italic">
                            {order.claimantName || "Someone"} working on it
                          </span>
                        )}

                        {/* Fulfill Pending button - shows for ANY order with pending items */}
                        {hasPendingItems && (
                          <button
                            onClick={() => handleProcessingClick(order)}
                            disabled={claimingOrderId === order.id || Boolean(order.claimedBy && !isClaimedByMe && !isExpired)}
                            className="text-yellow-400 hover:text-yellow-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {claimingOrderId === order.id ? "Claiming..." : `Fulfill Pending (${pendingCount})`}
                          </button>
                        )}

                        {/* Complete button - when no pending items */}
                        {!hasPendingItems && order.status !== "completed" && order.status !== "cancelled" && isClaimedByMe && (
                          <button
                            onClick={() => handleUpdateOrder(order.id, "update_status", "completed", "delivered")}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Complete
                          </button>
                        )}

                        {/* Cancel button - only for claimant */}
                        {isClaimedByMe && order.status === "pending" && (
                          <button
                            onClick={() => {
                              if (confirm("Cancel this order?")) {
                                handleUpdateOrder(order.id, "cancel");
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Delete button - restricted by role / order status */}
                        {((userRole === 'admin') || ['pending', 'cancelled'].includes(order.status)) && (
                          <button
                            onClick={() => {
                              if (deletingOrders[order.id]) return;
                              if (confirm("Are you sure you want to DELETE this order? This cannot be undone.")) {
                                handleDeleteOrder(order.id);
                              }
                            }}
                            disabled={deletingOrders[order.id]}
                            className="text-red-600 hover:text-red-500 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingOrders[order.id] ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Processing Modal - Add Items to Pending Order */}
      {processingModal.show && processingModal.order && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Fulfill Pending Order</h2>
                <button
                  onClick={() => setProcessingModal({ show: false, order: null })}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order info */}
              <div className="p-3 bg-slate-900 rounded">
                <p className="text-slate-400 text-sm">Order ID: <span className="text-white font-mono">{processingModal.order.id.slice(0, 8)}...</span></p>
                <p className="text-slate-400 text-sm">Customer: <span className="text-white">{processingModal.order.customerName || processingModal.order.customerEmail}</span></p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-white font-medium mb-4">Add Inventory to Fulfill Pending Items</h3>
              <p className="text-slate-400 text-sm mb-4">
                Enter values for each field (one value per line). Items will be created by combining values in order.
              </p>
              <div className="space-y-6">
                {processingModal.order.items.map((item) => {
                  const delivered = (item.deliveredInventoryIds || []).length;
                  const pending = item.quantity - delivered;

                  if (pending <= 0) return null;

                  const templateFields = getTemplateFieldsForProduct(item.productId);
                  const fieldCounts = getFieldCounts(item.productId);
                  const totalItems = getTotalItems(item.productId);
                  const counts = Object.values(fieldCounts);
                  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
                  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
                  const hasMismatch = minCount > 0 && maxCount > minCount;

                  return (
                    <div key={item.id} className="p-4 bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-white font-medium">{item.productName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-400 text-sm">Need: {pending}</span>
                          {totalItems > 0 && (
                            <span className="text-green-400 text-sm">Will add: {totalItems}</span>
                          )}
                        </div>
                      </div>

                      {templateFields.length === 0 ? (
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-slate-400 text-sm">
                          No template fields configured for this product.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templateFields.map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                {field.label || field.name}
                                {field.required && <span className="text-red-400"> *</span>}
                                <span className="text-slate-500 font-normal ml-2">
                                  ({fieldCounts[field.name]} {fieldCounts[field.name] === 1 ? 'line' : 'lines'})
                                </span>
                              </label>
                              <textarea
                                value={fieldValues[item.productId]?.[field.name] || ""}
                                onChange={(e) => updateFieldValue(item.productId, field.name, e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                rows={5}
                                placeholder={`Enter one value per line\nExample:\nABC\nFVB`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warning for mismatched counts */}
                      {hasMismatch && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-yellow-200 text-sm">
                            Only the first <strong>{minCount}</strong> items will be created (some fields have fewer values).
                          </p>
                        </div>
                      )}

                      {/* Preview */}
                      {totalItems > 0 && templateFields.length > 0 && (
                        <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                          <p className="text-xs text-slate-400 mb-2">Preview (first 3 items):</p>
                          <div className="space-y-1">
                            {Array.from({ length: Math.min(3, totalItems) }).map((_, i) => (
                              <div key={i} className="text-xs font-mono text-slate-300">
                                {templateFields.map((f) => {
                                  const lines = getParsedLines(item.productId, f.name);
                                  return lines[i] || "-";
                                }).join(" → ")}
                              </div>
                            ))}
                            {totalItems > 3 && (
                              <div className="text-xs text-slate-500 italic">
                                ... and {totalItems - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700">
              {/* Options */}
              <div className="flex gap-6 mb-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCostField}
                    onChange={(e) => setShowCostField(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-400">Set new cost for this fulfillment</span>
                </label>
                {showCostField && (
                  <input
                    type="number"
                    step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cost per item"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eachLineIsProduct}
                    onChange={(e) => setEachLineIsProduct(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-400">Each line is a separate product</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setProcessingModal({ show: false, order: null })}
                  disabled={submittingProcessing}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleAddInventoryAndComplete}
                  disabled={submittingProcessing}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {submittingProcessing ? "Adding..." : "Add Items & Fulfill Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
