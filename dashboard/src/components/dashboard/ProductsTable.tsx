"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  isActive: boolean;
  stockCount: number;
  totalSold: number;
  averageRating: string | null;
  reviewCount: number;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

function flattenCategories(categories: Category[], prefix = ""): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: prefix + cat.name });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, prefix + "  "));
    }
  }
  return result;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageInput, setPageInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    fetch("/api/categories?asTree=true&isActive=true")
      .then((r) => r.json())
      .then((r) => r.success && setCategories(r.data || []))
      .catch(() => {});
  }, []);

  const debouncedSetSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          sortBy,
          sortOrder,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (categoryId) params.set("categoryId", categoryId);
        if (statusFilter) params.set("isActive", statusFilter);

        const response = await fetch(`/api/products?${params}`);
        const result = await response.json();

        if (result.success) {
          setProducts(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotal(result.pagination.total);
        } else {
          setError(result.error || "Failed to load products");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [page, pageSize, debouncedSearch, categoryId, statusFilter, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} product(s)? This action cannot be undone.`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      const result = await response.json();

      if (result.success) {
        const actionLabel = action === "delete" ? "deleted" : `${action}d`;
        toast.success(`${selectedIds.size} product(s) ${actionLabel} successfully`);
        setSelectedIds(new Set());
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          sortBy,
          sortOrder,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (categoryId) params.set("categoryId", categoryId);
        if (statusFilter) params.set("isActive", statusFilter);
        const refetch = await fetch(`/api/products?${params}`);
        const refetchResult = await refetch.json();
        if (refetchResult.success) {
          setProducts(refetchResult.data);
          setTotalPages(refetchResult.pagination.totalPages);
          setTotal(refetchResult.pagination.total);
        }
      } else {
        toast.error(result.error || `Failed to ${action} products`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBulkLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId("");
    setStatusFilter("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount || "0"));
  };

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return <span className="ml-1 text-muted-foreground/40">&uarr;&darr;</span>;
    return <span className="ml-1 text-primary">{sortOrder === "asc" ? "&uarr;" : "&darr;"}</span>;
  };

  const hasActiveFilters = debouncedSearch || categoryId || statusFilter;

  const flattenedCategories = flattenCategories(categories);

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
        Error loading products: {error}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
      {/* Filters Bar */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => debouncedSetSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground text-sm"
          />
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {flattenedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} product{total !== 1 ? "s" : ""} total</span>
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

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-3">
          <span className="text-sm text-foreground font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => handleBulkAction("activate")}
            disabled={bulkLoading}
            className="px-3 py-1 text-xs bg-success/20 text-success border border-success/30 rounded-lg hover:bg-success/30 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkAction("deactivate")}
            disabled={bulkLoading}
            className="px-3 py-1 text-xs bg-warning/20 text-warning border border-warning/30 rounded-lg hover:bg-warning/30 disabled:opacity-50"
          >
            Deactivate
          </button>
          <button
            onClick={() => handleBulkAction("delete")}
            disabled={bulkLoading}
            className="px-3 py-1 text-xs bg-error/20 text-error border border-error/30 rounded-lg hover:bg-error/30 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedIds.size === products.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("name")}
              >
                Product{sortIndicator("name")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("basePrice")}
              >
                Price{sortIndicator("basePrice")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("stockCount")}
              >
                Stock{sortIndicator("stockCount")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("totalSold")}
              >
                Sold{sortIndicator("totalSold")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("averageRating")}
              >
                Rating{sortIndicator("averageRating")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort("createdAt")}
              >
                Created{sortIndicator("createdAt")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-muted/50 transition-colors ${selectedIds.has(product.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatCurrency(product.basePrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        product.stockCount < 5
                          ? "bg-error/20 text-error border border-error/30"
                          : "bg-success/20 text-success border border-success/30"
                      }`}
                    >
                      {product.stockCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {product.totalSold}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {product.averageRating ? (
                      <span>
                        {parseFloat(product.averageRating).toFixed(1)}
                        <span className="text-muted-foreground">
                          ({product.reviewCount})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No reviews</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        product.isActive
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="text-primary hover:text-primary/80 text-sm"
                    >
                      Edit
                    </Link>
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
  );
}
