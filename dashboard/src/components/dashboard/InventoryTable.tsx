"use client";

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

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function InventoryTable() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          sortBy,
          sortOrder,
        });
        if (statusFilter) params.set("status", statusFilter);

        const response = await fetch(`/api/inventory?${params}`);
        const result = await response.json();

        if (result.success) {
          setItems(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotal(result.pagination.total);
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
  }, [page, statusFilter, pageSize, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return <span className="ml-1 text-muted-foreground/40">&uarr;&darr;</span>;
    return <span className="ml-1 text-primary">{sortOrder === "asc" ? "&uarr;" : "&darr;"}</span>;
  };

  const clearFilters = () => {
    setStatusFilter("available");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success/20 text-success border border-success/30";
      case "reserved":
        return "bg-warning/20 text-warning border border-warning/30";
      case "sold":
        return "bg-secondary text-muted-foreground border border-border";
      case "expired":
        return "bg-destructive/20 text-destructive border border-destructive/30";
      default:
        return "bg-secondary text-muted-foreground border border-border";
    }
  };

  const displayValues = (values: Record<string, string | number | boolean>) => {
    const entries = Object.entries(values).filter(([key]) => !key.startsWith("_")).slice(0, 2);
    return entries.map(([key, value]) => (
      <span key={key} className="text-xs text-muted-foreground">
        {key}: {String(value)}
      </span>
    ));
  };

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg">
        Error loading inventory: {error}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
      {/* Filters Bar */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="expired">Expired</option>
          </select>
          {statusFilter && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} item{total !== 1 ? "s" : ""} total</span>
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
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("id")}
              >
                ID{sortIndicator("id")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("productName")}
              >
                Product{sortIndicator("productName")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Values
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("status")}
              >
                Status{sortIndicator("status")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("createdAt")}
              >
                Created{sortIndicator("createdAt")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No inventory items found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {item.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{item.productName || "Unlinked"}</p>
                    {item.productSlug && (
                      <p className="text-sm text-muted-foreground">{item.productSlug}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {displayValues(item.values)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Numbered Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
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
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
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
          </div>
        </div>
      )}
    </div>
  );
}
