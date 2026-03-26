"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  deliveredInventoryIds: string[] | null;
  templateFieldsSchema: any[] | null;
}

interface Order {
  id: string;
  orderNumber: string;
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
  type: "string" | "number" | "boolean" | "group" | "multiline";
  label: string;
  required: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [orderNumberSearch, setOrderNumberSearch] = useState("");
  const [debouncedOrderNumberSearch, setDebouncedOrderNumberSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [templateFieldsByProductId, setTemplateFieldsByProductId] = useState<Record<string, TemplateField[]>>({});
  const [pageInput, setPageInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const orderNumberDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [processingModal, setProcessingModal] = useState<{
    show: boolean;
    order: Order | null;
  }>({ show: false, order: null });
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [submittingProcessing, setSubmittingProcessing] = useState(false);
  const [newCost, setNewCost] = useState("");
  const [showCostField, setShowCostField] = useState(false);
  const [eachLineIsProduct, setEachLineIsProduct] = useState(false);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [deletingOrders, setDeletingOrders] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<"admin" | "staff" | "unknown">("unknown");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (claimStatus) params.set("claimStatus", claimStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (debouncedCustomerSearch) params.set("customerSearch", debouncedCustomerSearch);
      if (debouncedOrderNumberSearch) params.set("orderNumber", debouncedOrderNumberSearch);

      const response = await fetch(`/api/orders?${params}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
        const map: Record<string, TemplateField[]> = {};
        for (const order of result.data as Order[]) {
          for (const item of order.items) {
            if (!map[item.productId] && item.templateFieldsSchema) {
              map[item.productId] = item.templateFieldsSchema as TemplateField[];
            }
          }
        }
        setTemplateFieldsByProductId(map);
      } else {
        setError(result.error || "Failed to load orders");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, claimStatus, dateFrom, dateTo, debouncedCustomerSearch, debouncedOrderNumberSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.data?.user?.role) {
          setUserRole(data.data.user.role);
        }
      } catch {
        console.error("Error fetching current user");
      }
    };
    fetchCurrentUser();
  }, []);

  const debouncedSetCustomerSearch = useCallback((value: string) => {
    setCustomerSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedCustomerSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const debouncedSetOrderNumberSearch = useCallback((value: string) => {
    setOrderNumberSearch(value);
    if (orderNumberDebounceRef.current) clearTimeout(orderNumberDebounceRef.current);
    orderNumberDebounceRef.current = setTimeout(() => {
      setDebouncedOrderNumberSearch(value);
      setPage(1);
    }, 300);
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setClaimStatus("");
    setDateFrom("");
    setDateTo("");
    setCustomerSearch("");
    setDebouncedCustomerSearch("");
    setOrderNumberSearch("");
    setDebouncedOrderNumberSearch("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return <span className="ml-1 text-muted-foreground/40">&uarr;&darr;</span>;
    return <span className="ml-1 text-primary">{sortOrder === "asc" ? "&uarr;" : "&darr;"}</span>;
  };

  const hasActiveFilters = statusFilter || claimStatus || dateFrom || dateTo || debouncedCustomerSearch || debouncedOrderNumberSearch;

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
        toast.error(result.error || "Failed to update order");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingOrders[orderId]) return;
    setDeletingOrders((prev) => ({ ...prev, [orderId]: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (response.status === 403) {
        toast.error("You are not authorized to delete this order.");
        return;
      }
      const result = await response.json();
      if (result.success) {
        toast.success("Order deleted");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete order");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const getParsedLines = (productId: string, fieldName: string): string[] => {
    const values = fieldValues[productId]?.[fieldName] || "";
    return values.split("\n").map((line) => line.trim()).filter((line) => line);
  };

  const getFieldCounts = (productId: string): Record<string, number> => {
    const templateFields = getTemplateFieldsForProduct(productId);
    const counts: Record<string, number> = {};
    templateFields.forEach((field) => {
      counts[field.name] = getParsedLines(productId, field.name).length;
    });
    return counts;
  };

  const getTotalItems = (productId: string): number => {
    const counts = Object.values(getFieldCounts(productId));
    return counts.length > 0 ? Math.min(...counts) : 0;
  };

  const handleProcessingClick = async (order: Order) => {
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
          toast.error(result.error || "Failed to claim order. It may be claimed by another staff member.");
          setClaimingOrderId(null);
          return;
        }
        updatedOrder = { ...order, fulfillmentStatus: "processing", isClaimedByMe: true, isClaimExpired: false };
        try { await fetchOrders(); } catch { /* silent */ }
      } catch {
        toast.error("Failed to claim order");
        setClaimingOrderId(null);
        return;
      }
    }
    setClaimingOrderId(null);
    setProcessingModal({ show: true, order: updatedOrder });
    const initialFields: Record<string, Record<string, string>> = {};
    updatedOrder.items.forEach((item) => {
      const delivered = (item.deliveredInventoryIds || []).length;
      const pending = item.quantity - delivered;
      if (pending > 0 && !initialFields[item.productId]) {
        initialFields[item.productId] = {};
      }
    });
    setFieldValues(initialFields);
  };

  const updateFieldValue = (productId: string, fieldName: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [fieldName]: value },
    }));
  };

  const handleAddInventoryAndComplete = async () => {
    if (!processingModal.order) return;
    const order = processingModal.order;
    const inventoryItems: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];

    for (const item of order.items) {
      const delivered = (item.deliveredInventoryIds || []).length;
      const pending = item.quantity - delivered;
      if (pending <= 0) continue;

      const templateFields = getTemplateFieldsForProduct(item.productId);
      const totalItems = getTotalItems(item.productId);
      if (totalItems === 0) continue;

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
      toast.error("Please add at least one inventory item");
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
          toast.success("Order fulfilled successfully");
          window.location.reload();
        } else {
          toast.warning("Some items still pending. " + result.data.message);
          window.location.reload();
        }
      } else {
        toast.error(result.error || "Failed to add inventory");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingProcessing(false);
    }
  };

  const getTemplateFieldsForProduct = (productId: string): TemplateField[] => {
    return templateFieldsByProductId[productId] || [];
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(amount || "0"));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/20 text-warning border border-warning/30";
      case "processing": return "bg-info/20 text-info border border-info/30";
      case "delivered": return "bg-success/20 text-success border border-success/30";
      case "completed": return "bg-success/20 text-success border border-success/30";
      case "cancelled": return "bg-error/20 text-error border border-error/30";
      case "refunded": return "bg-secondary text-muted-foreground border border-border";
      default: return "bg-secondary text-muted-foreground border border-border";
    }
  };

  const getDisplayStatus = (order: Order): string => {
    if (["completed", "cancelled", "refunded"].includes(order.status)) return order.status;
    if (order.fulfillmentStatus === "processing" || order.fulfillmentStatus === "delivered") return order.fulfillmentStatus;
    return "pending";
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      case "refunded": return "Refunded";
      case "processing": return "Processing";
      case "delivered": return "Delivered";
      default: return "Pending";
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg">
        Error loading orders: {error}
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
        {/* Filters */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={claimStatus}
              onChange={(e) => { setClaimStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Claims</option>
              <option value="unclaimed">Unclaimed</option>
              <option value="mine">Claimed by Me</option>
              <option value="others">Claimed by Others</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              title="To date"
            />
            <input
              type="text"
              placeholder="Customer name/email..."
              value={customerSearch}
              onChange={(e) => debouncedSetCustomerSearch(e.target.value)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
            />
            <input
              type="text"
              placeholder="Order number..."
              value={orderNumberSearch}
              onChange={(e) => debouncedSetOrderNumberSearch(e.target.value)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
            />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{total} order{total !== 1 ? "s" : ""} total</span>
            <div className="flex items-center gap-2">
              <label>Per page:</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-muted border border-input rounded text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Items</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort("total")}
                >
                  Total{sortIndicator("total")}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort("status")}
                >
                  Status{sortIndicator("status")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sold By</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  Date{sortIndicator("createdAt")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isClaimedByMe = order.isClaimedByMe && !order.isClaimExpired;
                  const isClaimedByOther = order.claimedBy && !order.isClaimedByMe && !order.isClaimExpired;
                  const hasPendingItems = order.items.some((item) => {
                    const delivered = (item.deliveredInventoryIds || []).length;
                    return delivered < item.quantity;
                  });
                  const pendingCount = order.items.reduce((sum, item) => {
                    const delivered = (item.deliveredInventoryIds || []).length;
                    return sum + (item.quantity - delivered);
                  }, 0);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-muted/50 transition-colors ${
                        isClaimedByMe ? "bg-info/5" : isClaimedByOther ? "bg-warning/5" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-sm text-muted-foreground font-mono">
                        {order.orderNumber || order.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">{order.customerName || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {order.items.length} item(s)
                        {hasPendingItems ? (
                          <span className="ml-2 text-warning">({pendingCount} pending)</span>
                        ) : (
                          <span className="ml-2 text-success">(all delivered)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-foreground">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(getDisplayStatus(order))}`}>
                          {getStatusLabel(getDisplayStatus(order))}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {order.claimedBy && !order.isClaimExpired ? (
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              isClaimedByMe
                                ? "bg-info/20 text-info border border-info/30"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {order.claimantName || order.claimedBy?.slice(0, 8)}
                            {isClaimedByMe && " (You)"}
                          </span>
                        ) : order.processedBy ? (
                          <span className="px-2 py-1 rounded text-xs bg-success/20 text-success border border-success/30">
                            {order.processedBy}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/manual-sell/${order.id}`}
                            className="text-primary hover:text-primary/80 text-sm"
                          >
                            View
                          </Link>

                          {hasPendingItems && order.claimedBy && !isClaimedByMe && !order.isClaimExpired && (
                            <span className="text-muted-foreground text-xs italic">
                              {order.claimantName || "Someone"} working on it
                            </span>
                          )}

                          {hasPendingItems && (
                            <button
                              onClick={() => handleProcessingClick(order)}
                              disabled={claimingOrderId === order.id || Boolean(order.claimedBy && !isClaimedByMe && !order.isClaimExpired)}
                              className="text-warning hover:text-warning/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {claimingOrderId === order.id ? "Claiming..." : `Fulfill (${pendingCount})`}
                            </button>
                          )}

                          {!hasPendingItems && order.status !== "completed" && order.status !== "cancelled" && isClaimedByMe && (
                            <button
                              onClick={() => handleUpdateOrder(order.id, "update_status", "completed", "delivered")}
                              className="text-success hover:text-success/80 text-sm"
                            >
                              Complete
                            </button>
                          )}

                          {isClaimedByMe && order.status === "pending" && (
                            <button
                              onClick={() => {
                                if (confirm("Cancel this order?")) {
                                  handleUpdateOrder(order.id, "cancel");
                                }
                              }}
                              className="text-destructive hover:text-destructive/80 text-sm"
                            >
                              Cancel
                            </button>
                          )}

                          {((userRole === "admin") || ["pending", "cancelled"].includes(order.status)) && (
                            <button
                              onClick={() => {
                                if (deletingOrders[order.id]) return;
                                if (confirm("Are you sure you want to DELETE this order? This cannot be undone.")) {
                                  handleDeleteOrder(order.id);
                                }
                              }}
                              disabled={deletingOrders[order.id]}
                              className="text-destructive hover:text-destructive/80 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingOrders[order.id] ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Numbered Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border text-muted-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                &laquo;
              </button>
              {getPageNumbers().map((p, i) =>
                p === "ellipsis" ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-border text-muted-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
              >
                &raquo;
              </button>
              <div className="ml-3 flex items-center gap-1 text-sm">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/\D/, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const num = parseInt(pageInput);
                      if (num >= 1 && num <= totalPages) setPage(num);
                      setPageInput("");
                    }
                  }}
                  placeholder="#"
                  className="w-12 px-2 py-1 bg-muted border border-input rounded text-foreground text-center text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    const num = parseInt(pageInput);
                    if (num >= 1 && num <= totalPages) setPage(num);
                    setPageInput("");
                  }}
                  className="px-2 py-1 text-xs text-primary hover:text-primary/80"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Modal */}
      {processingModal.show && processingModal.order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-card-foreground">Fulfill Pending Order</h2>
                <button
                  onClick={() => setProcessingModal({ show: false, order: null })}
                  className="p-1 text-muted-foreground hover:text-card-foreground"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-muted-foreground text-sm">
                  Order: <span className="text-foreground font-mono">{processingModal.order.orderNumber || processingModal.order.id.slice(0, 8)}...</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  Customer: <span className="text-foreground">{processingModal.order.customerName || processingModal.order.customerEmail}</span>
                </p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-foreground font-medium mb-4">Add Inventory to Fulfill Pending Items</h3>
              <p className="text-muted-foreground text-sm mb-4">
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
                    <div key={item.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-foreground font-medium">{item.productName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-warning text-sm">Need: {pending}</span>
                          {totalItems > 0 && <span className="text-success text-sm">Will add: {totalItems}</span>}
                        </div>
                      </div>

                      {templateFields.length === 0 ? (
                        <div className="p-3 bg-card rounded border border-border text-muted-foreground text-sm">
                          No template fields configured for this product.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templateFields.map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                {field.label || field.name}
                                {field.required && <span className="text-destructive"> *</span>}
                                <span className="text-muted-foreground font-normal ml-2">
                                  ({fieldCounts[field.name]} {fieldCounts[field.name] === 1 ? "line" : "lines"})
                                </span>
                              </label>
                              <textarea
                                value={fieldValues[item.productId]?.[field.name] || ""}
                                onChange={(e) => updateFieldValue(item.productId, field.name, e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                                rows={5}
                                placeholder={`Enter one value per line\nExample:\nABC\nFVB`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {hasMismatch && (
                        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                          <p className="text-warning text-sm">
                            Only the first <strong>{minCount}</strong> items will be created (some fields have fewer values).
                          </p>
                        </div>
                      )}

                      {totalItems > 0 && templateFields.length > 0 && (
                        <div className="mt-4 p-3 bg-card rounded border border-border">
                          <p className="text-xs text-muted-foreground mb-2">Preview (first 3 items):</p>
                          <div className="space-y-1">
                            {Array.from({ length: Math.min(3, totalItems) }).map((_, i) => (
                              <div key={i} className="text-xs font-mono text-foreground">
                                {templateFields.map((f) => {
                                  const lines = getParsedLines(item.productId, f.name);
                                  return lines[i] || "-";
                                }).join(" → ")}
                              </div>
                            ))}
                            {totalItems > 3 && (
                              <div className="text-xs text-muted-foreground italic">... and {totalItems - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-border">
              <div className="flex gap-6 mb-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCostField}
                    onChange={(e) => setShowCostField(e.target.checked)}
                    className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">Set new cost for this fulfillment</span>
                </label>
                {showCostField && (
                  <input
                    type="number"
                    step="0.01"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="px-3 py-1 bg-muted border border-input rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cost per item"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eachLineIsProduct}
                    onChange={(e) => setEachLineIsProduct(e.target.checked)}
                    className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">Each line is a separate product</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setProcessingModal({ show: false, order: null })}
                  disabled={submittingProcessing}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleAddInventoryAndComplete}
                  disabled={submittingProcessing}
                  className="px-6 py-2 bg-success hover:bg-success/90 text-foreground rounded-lg transition-colors font-medium disabled:opacity-50"
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
