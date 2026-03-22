"use client";

/**
 * Orders Table Component
 *
 * Displays list of orders with claim functionality and actions
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
  const [claimFilter, setClaimFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  // Processing modal state
  const [processingModal, setProcessingModal] = useState<{
    show: boolean;
    order: Order | null;
  }>({ show: false, order: null });
  const [inventoryToAdd, setInventoryToAdd] = useState<Record<string, string>>({});
  const [submittingProcessing, setSubmittingProcessing] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (statusFilter) params.set("status", statusFilter);
        if (claimFilter) params.set("claimStatus", claimFilter);

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
    fetchProducts();
    fetchTemplates();
  }, [page, statusFilter, claimFilter]);

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

  const handleClaimNext = async () => {
    try {
      setClaimingOrderId("next");
      const response = await fetch("/api/orders/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimNext: true }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || "Failed to claim order");
        setClaimingOrderId(null);
      }
    } catch (err) {
      alert("Network error");
      setClaimingOrderId(null);
    }
  };

  const handleClaimOrder = async (orderId: string) => {
    try {
      setClaimingOrderId(orderId);
      const response = await fetch("/api/orders/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || "Failed to claim order");
        setClaimingOrderId(null);
      }
    } catch (err) {
      alert("Network error");
      setClaimingOrderId(null);
    }
  };

  const handleReleaseOrder = async (orderId: string) => {
    try {
      const response = await fetch("/api/orders/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || "Failed to release order");
      }
    } catch (err) {
      alert("Network error");
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

  const handleProcessingClick = (order: Order) => {
    setProcessingModal({ show: true, order });
    // Initialize inventory to add with empty strings
    const initialInventory: Record<string, string> = {};
    order.items.forEach(item => {
      const delivered = (item.deliveredInventoryIds || []).length;
      const pending = item.quantity - delivered;
      if (pending > 0) {
        initialInventory[item.productId] = "";
      }
    });
    setInventoryToAdd(initialInventory);
  };

  const handleAddInventoryAndComplete = async () => {
    if (!processingModal.order) return;

    const order = processingModal.order;
    const inventoryItems: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];

    // Parse inventory items
    for (const item of order.items) {
      const itemsText = inventoryToAdd[item.productId];
      if (!itemsText || itemsText.trim().length === 0) continue;

      const product = products.find(p => p.id === item.productId);
      const templateFields = product?.templateFields || [];
      const lines = itemsText.trim().split("\n").map(l => l.trim()).filter(l => l);

      for (const line of lines) {
        const values = line.split(",").map(v => v.trim());
        const itemObj: Record<string, string | number | boolean> = {};
        templateFields.forEach((field, index) => {
          const value = values[index] || "";
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
        body: JSON.stringify({ inventoryItems }),
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
            <select
              value={claimFilter}
              onChange={(e) => {
                setClaimFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Claims</option>
              <option value="unclaimed">Unclaimed</option>
              <option value="mine">Claimed by me</option>
              <option value="others">Claimed by others</option>
            </select>
            <button
              onClick={handleClaimNext}
              disabled={claimingOrderId !== null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {claimingOrderId === "next" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Claim Next
                </>
              )}
            </button>
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
                  Claim
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

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-800 ${
                      isClaimedByMe ? "bg-blue-900/10" : isClaimedByOther ? "bg-slate-800/50" : ""
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
                      {hasPendingItems && (
                        <span className="ml-2 text-yellow-400">(pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-4">
                      {/* Show single status tag - use fulfillmentStatus for pending orders */}
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          order.status === "pending"
                            ? getFulfillmentColor(order.fulfillmentStatus)
                            : getStatusColor(order.status)
                        }`}
                      >
                        {order.status === "pending"
                          ? (order.fulfillmentStatus === "processing" ? "Processing" : "Pending")
                          : order.status
                        }
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {order.claimedBy && !isExpired ? (
                        <div className="flex items-center gap-2">
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
                          {(isClaimedByMe || isExpired) && (
                            <button
                              onClick={() => handleReleaseOrder(order.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Release
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimOrder(order.id)}
                          disabled={claimingOrderId === order.id}
                          className="text-slate-400 hover:text-white text-xs disabled:opacity-50"
                        >
                          {claimingOrderId === order.id ? "..." : "Claim"}
                        </button>
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

                        {/* Toggle Processing button - toggles between pending and processing */}
                        {isClaimedByMe && order.status === "pending" && (
                          <button
                            onClick={() => {
                              const newFulfillmentStatus = order.fulfillmentStatus === "pending" ? "processing" : "pending";
                              handleUpdateOrder(order.id, "update_status", undefined, newFulfillmentStatus);
                            }}
                            className={order.fulfillmentStatus === "pending"
                              ? "text-yellow-400 hover:text-yellow-300 text-sm"
                              : "text-blue-400 hover:text-blue-300 text-sm"
                            }
                          >
                            {order.fulfillmentStatus === "pending" ? "Processing" : "Pending"}
                          </button>
                        )}

                        {/* Add Items button - only shows when fulfillmentStatus is processing and has pending items */}
                        {isClaimedByMe && order.fulfillmentStatus === "processing" && hasPendingItems && (
                          <button
                            onClick={() => handleProcessingClick(order)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Add Items
                          </button>
                        )}

                        {/* Complete button - when processing but no pending items */}
                        {isClaimedByMe && order.fulfillmentStatus === "processing" && !hasPendingItems && (
                          <button
                            onClick={() => handleUpdateOrder(order.id, "update_status", "completed", "delivered")}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Complete
                          </button>
                        )}

                        {/* Cancel button */}
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
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Add Items to Pending Order</h2>
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
              <h3 className="text-white font-medium mb-4">Pending Items</h3>
              <div className="space-y-4">
                {processingModal.order.items.map((item) => {
                  const delivered = (item.deliveredInventoryIds || []).length;
                  const pending = item.quantity - delivered;

                  if (pending <= 0) return null;

                  const templateFields = getTemplateFieldsForProduct(item.productId);

                  return (
                    <div key={item.id} className="p-4 bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{item.productName}</span>
                        <span className="text-yellow-400 text-sm">{pending} pending</span>
                      </div>

                      {/* Template fields info */}
                      {templateFields.length > 0 && (
                        <div className="mb-2 p-2 bg-slate-800 rounded text-xs">
                          <span className="text-slate-400">Fields: </span>
                          {templateFields.map((f, i) => (
                            <span key={f.name} className="inline-block mr-2">
                              <span className="text-blue-400">{f.name}</span>
                              {f.required && <span className="text-red-400">*</span>}
                              {i < templateFields.length - 1 && <span className="text-slate-500">, </span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={inventoryToAdd[item.productId] || ""}
                        onChange={(e) => setInventoryToAdd(prev => ({
                          ...prev,
                          [item.productId]: e.target.value
                        }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        rows={4}
                        placeholder={`Enter items to add (one per line)&#10;Example: ${templateFields.map(f => f.name).join(", ")}&#10;${templateFields.map(() => "XXX").join(", ")}`}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Add items to fulfill this order. Any extra items will remain in inventory for future sales.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3">
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
                {submittingProcessing ? "Adding..." : "Add Items & Complete Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
