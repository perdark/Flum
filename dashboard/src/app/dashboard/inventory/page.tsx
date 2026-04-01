"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  depth?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  templateName: string | null;
  categories: Category[];
  fieldsSchema?: any[] | null;
}

interface InventoryItem {
  id: string;
  values: Record<string, string | number | boolean>;
  status: string;
  createdAt: string;
  purchasedAt: string | null;
  cost?: string | null;
  productId?: string | null;
  productName?: string | null;
}

interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean";
  label: string;
  required: boolean;
  multiSell?: boolean;
  multiSellMax?: number;
  cooldownEnabled?: boolean;
  cooldownDurationHours?: number;
  wholeFieldIsOneItem?: boolean;
}

interface StandaloneCustomFieldRow {
  name: string;
  value: string;
  type: string;
  required: boolean;
  multiSell: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
  wholeFieldIsOneItem: boolean;
  linkedTo: string;
  isMainStockField: boolean;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productIdParam);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(50);
  const [pageInput, setPageInput] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStandaloneStockModal, setShowStandaloneStockModal] = useState(false);
  const [showUnlinkedModal, setShowUnlinkedModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, categoryFilter]);

  useEffect(() => {
    if (selectedProductId) {
      fetchInventory();
    } else {
      setTemplateFields([]);
      fetchUnlinkedInventory();
    }
  }, [selectedProductId, statusFilter, page, inventoryPageSize, sortBy, sortOrder]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryFilter) params.set("categoryId", categoryFilter);

      const res = await fetch(`/api/products/summary?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories?asTree=true");
      const data = await res.json();
      if (data.success) {
        const flat = flattenCategories(data.data);
        setCategories(flat);
      }
    } catch {
      console.error("Failed to load categories");
    }
  };

  const flattenCategories = (nodes: any[], prefix = "", depth = 0): Category[] => {
    const result: Category[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, name: prefix + node.name, parentId: null, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenCategories(node.children, prefix + node.name + " / ", depth + 1));
      }
    }
    return result;
  };

  const fetchInventory = async () => {
    if (!selectedProductId) return;
    setInventoryLoading(true);
    try {
      const params = new URLSearchParams({
        productId: selectedProductId,
        page: page.toString(),
        limit: inventoryPageSize.toString(),
        sortBy,
        sortOrder,
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();

      if (data.success) {
        setInventoryItems(data.data);
        setTotalPages(data.pagination?.totalPages || 1);

        const product = products.find((p) => p.id === selectedProductId);
        if (product?.templateName) {
          const templateRes = await fetch(`/api/inventory/templates`);
          const templateData = await templateRes.json();
          if (templateData.success) {
            const template = templateData.data.find((t: any) => t.name === product.templateName);
            if (template?.fieldsSchema) {
              setTemplateFields(template.fieldsSchema);
            }
          }
        } else if (product?.fieldsSchema) {
          setTemplateFields(product.fieldsSchema as TemplateField[]);
        }
      }
    } catch {
      console.error("Failed to load inventory");
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchUnlinkedInventory = async () => {
    setInventoryLoading(true);
    try {
      const params = new URLSearchParams({
        unlinked: "true",
        page: page.toString(),
        limit: inventoryPageSize.toString(),
        sortBy,
        sortOrder,
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();

      if (data.success) {
        setInventoryItems(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      console.error("Failed to load unlinked inventory");
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setPage(1);
    router.push(`/dashboard/inventory?productId=${productId}`);
  };

  const handleExport = async (format: "tsv" | "csv") => {
    if (!selectedProductId) return;
    try {
      const res = await fetch(`/api/inventory/export?productId=${selectedProductId}&format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported as ${format.toUpperCase()}`);
      }
    } catch {
      toast.error("Export failed");
    }
  };

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

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const fieldNames = new Set<string>();
  inventoryItems.forEach((item) => {
    if (item.values) {
      Object.keys(item.values).forEach((k) => {
        if (k !== "_metadata") fieldNames.add(k);
      });
    }
  });
  const fields = Array.from(fieldNames);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-success/20 text-success";
      case "reserved": return "bg-warning/20 text-warning";
      case "sold": return "bg-info/20 text-info";
      default: return "bg-error/20 text-error";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 staff-card-elevated p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
              Pick a product for its lines, or leave none selected to work <strong className="text-foreground font-semibold">unlinked stock</strong>. Use search & templates for speed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="shadow-md shadow-primary/20" onClick={() => setShowStandaloneStockModal(true)}>
              + Add stock
            </Button>
            <Button variant="secondary" onClick={() => setShowUnlinkedModal(true)}>
              Link stock
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/inventory/search">Global search</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/inventory/templates">Templates</a>
            </Button>
            {selectedProductId && (
              <>
                <Button variant="outline" onClick={() => handleExport("tsv")}>
                  Export TSV
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  Add to product
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products List - Virtualized */}
        <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border overflow-hidden staff-card-elevated">
            <div className="p-4 border-b border-border space-y-3 bg-muted/20">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((p) => (
                  <option key={p.id} value={p.id}>
                    {"\u00A0".repeat((p.depth || 0) * 2) + p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</p>
            </div>

            <div ref={parentRef} className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No products found</div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const product = products[virtualItem.index];
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product.id)}
                        className={`w-full p-4 text-left transition-all absolute top-0 left-0 border-b border-border ${
                          selectedProductId === product.id
                            ? "bg-primary/12 border-l-[3px] border-l-primary shadow-inner"
                            : "hover:bg-accent border-l-[3px] border-l-transparent"
                        }`}
                        style={{
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <div className="font-medium text-foreground truncate mb-1">{product.name}</div>
                        {product.categories && product.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {product.categories.slice(0, 2).map((p) => (
                              <span key={p.id} className="px-1.5 py-0.5 bg-secondary text-muted-foreground text-xs rounded">{p.name}</span>
                            ))}
                            {product.categories.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground text-xs rounded">+{product.categories.length - 2}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-success">{product.availableCount} avail</span>
                          <span className="text-warning">{product.reservedCount} reserved</span>
                          <span className="text-info">{product.soldCount} sold</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="lg:col-span-3">
          {!selectedProductId ? (
          <div className="bg-card rounded-2xl border border-border overflow-hidden staff-card-elevated">
              <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Unlinked stock</h2>
                  <p className="text-sm text-muted-foreground mt-1">Items with no product — link them from &quot;Link Stock&quot; or leave as standalone</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                    <option value="expired">Expired</option>
                  </select>
                  <select
                    value={inventoryPageSize}
                    onChange={(e) => { setInventoryPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-2 bg-muted border border-input rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}/page</option>
                    ))}
                  </select>
                </div>
              </div>

              {inventoryLoading ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No unlinked inventory items</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("status")}>Status{sortIndicator("status")}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                          {fields.map((field) => (
                            <th key={field} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{field}</th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("createdAt")}>Created{sortIndicator("createdAt")}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("purchasedAt")}>Sold At{sortIndicator("purchasedAt")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {inventoryItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">{item.cost != null && item.cost !== "" ? formatCurrency(item.cost) : "—"}</td>
                            {fields.map((field) => (
                              <td key={field} className="px-4 py-3 text-sm text-foreground font-mono">{String(item.values?.[field] ?? "—")}</td>
                            ))}
                            <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
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
                          type="button"
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      type="button"
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
          ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden staff-card-elevated">
              <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">{selectedProduct?.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedProduct?.categories && selectedProduct.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedProduct.categories.map((p) => (
                          <span key={p.id} className="px-2 py-0.5 bg-info/20 text-info text-xs rounded">{p.name}</span>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">Template: {selectedProduct?.templateName || "None"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-muted border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                    <option value="expired">Expired</option>
                  </select>
                  <select
                    value={inventoryPageSize}
                    onChange={(e) => { setInventoryPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-2 bg-muted border border-input rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}/page</option>
                    ))}
                  </select>
                </div>
              </div>

              {inventoryLoading ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No inventory items found</div>
              ) : (
                <>
                  {templateFields.length > 0 && (
                    <div className="px-4 py-2 bg-muted/50 border-b border-border flex flex-wrap gap-3 text-xs">
                      {templateFields.map((f) => (
                        <span key={f.name} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{f.name}</span>
                          {f.required && <span className="text-destructive">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("status")}>Status{sortIndicator("status")}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                          {fields.map((field) => (
                            <th key={field} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{field}</th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("createdAt")}>Created{sortIndicator("createdAt")}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("purchasedAt")}>Sold At{sortIndicator("purchasedAt")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {inventoryItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">{item.cost != null && item.cost !== "" ? formatCurrency(item.cost) : "—"}</td>
                            {fields.map((field) => (
                              <td key={field} className="px-4 py-3 text-sm text-foreground font-mono">{String(item.values[field] ?? "-")}</td>
                            ))}
                            <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Numbered Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
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
                          className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
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
          )}
        </div>
      </div>

      {showAddModal && selectedProductId && selectedProduct && (
        <AddInventoryModal
          productId={selectedProductId}
          productName={selectedProduct.name}
          templateFields={templateFields}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchInventory(); fetchProducts(); }}
        />
      )}

      {showStandaloneStockModal && (
        <StandaloneStockModal
          onClose={() => setShowStandaloneStockModal(false)}
          onSuccess={() => { setShowStandaloneStockModal(false); fetchProducts(); }}
        />
      )}

      {showUnlinkedModal && (
        <LinkStockModal
          onClose={() => setShowUnlinkedModal(false)}
          onSuccess={() => { setShowUnlinkedModal(false); fetchProducts(); if (selectedProductId) fetchInventory(); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Add Inventory Modal
// ============================================================================

function AddInventoryModal({ productId, productName, templateFields, onClose, onSuccess }: {
  productId: string;
  productName: string;
  templateFields: TemplateField[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [batchName, setBatchName] = useState("");
  const [batchCost, setBatchCost] = useState("");
  const [eachLineIsProduct, setEachLineIsProduct] = useState(false);
  /** Same multi-sell settings for every line in this upload (per-line overrides below) */
  const [multiSellEnabled, setMultiSellEnabled] = useState(false);
  const [multiSellMax, setMultiSellMax] = useState(5);
  const [cooldownEnabled, setCooldownEnabled] = useState(false);
  const [cooldownDurationHours, setCooldownDurationHours] = useState(12);
  /** If true, each row can have its own multi-sell toggle / max */
  const [perRowMultisell, setPerRowMultisell] = useState(false);
  const [rowMultisell, setRowMultisell] = useState<Array<{ enabled: boolean; max: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<{ pendingItems: number; pendingOrdersCount: number } | null>(null);
  const [sellPendingFirst, setSellPendingFirst] = useState(false);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch(`/api/inventory/pending-count?productId=${productId}`);
        const data = await res.json();
        if (data.success && data.data.pendingItems > 0) {
          setPendingData(data.data);
        }
      } catch { /* silent */ }
    };
    fetchPendingCount();
  }, [productId]);

  const getParsedLines = (fieldName: string): string[] => {
    const fieldSchema = templateFields.find(f => f.name === fieldName);
    if (fieldSchema?.wholeFieldIsOneItem && fieldValues[fieldName]?.trim()) {
      return [fieldValues[fieldName].trim()];
    }
    return (fieldValues[fieldName] || "").split("\n").map((l) => l.trim()).filter(Boolean);
  };

  const fieldCounts = templateFields.reduce((acc, field) => {
    acc[field.name] = getParsedLines(field.name).length;
    return acc;
  }, {} as Record<string, number>);

  const counts = Object.values(fieldCounts);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const hasMismatch = minCount > 0 && maxCount > minCount;

  useEffect(() => {
    setRowMultisell((prev) =>
      Array.from({ length: minCount }, (_, i) => prev[i] || { enabled: false, max: 5 })
    );
  }, [minCount]);

  const fieldsWithMismatch: { field: string; count: number }[] = [];
  if (hasMismatch) {
    templateFields.forEach((field) => {
      if (fieldCounts[field.name] !== maxCount) {
        fieldsWithMismatch.push({ field: field.label || field.name, count: fieldCounts[field.name] });
      }
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (minCount === 0) { toast.error("Please enter values in at least one field"); return; }

    const parsedItems: Array<Record<string, string | number | boolean>> = [];
    for (let i = 0; i < minCount; i++) {
      const itemObj: Record<string, string | number | boolean> = {};
      let hasFieldMultiSell = false;
      let fieldMultiSellMax = 5;
      let fieldCooldownEnabled = false;
      let fieldCooldownDuration = 12;

      templateFields.forEach((field) => {
        const lines = getParsedLines(field.name);
        itemObj[field.name] = lines[i] || "";
        if (field.multiSell) {
           hasFieldMultiSell = true;
           fieldMultiSellMax = field.multiSellMax || 5;
           if (field.cooldownEnabled) {
               fieldCooldownEnabled = true;
               if (field.cooldownDurationHours) fieldCooldownDuration = field.cooldownDurationHours;
           }
        }
      });
      const msOn = perRowMultisell ? Boolean(rowMultisell[i]?.enabled) : (multiSellEnabled || hasFieldMultiSell);
      const msMax = perRowMultisell
        ? Math.max(1, rowMultisell[i]?.max ?? 5)
        : (multiSellEnabled ? Math.max(1, multiSellMax) : fieldMultiSellMax);
      
      const cdEnabled = multiSellEnabled ? cooldownEnabled : fieldCooldownEnabled;
      const cdHrs = multiSellEnabled ? cooldownDurationHours : fieldCooldownDuration;

      if (msOn) {
        itemObj.multiSellEnabled = true;
        itemObj.multiSellMax = msMax;
        itemObj.cooldownEnabled = cdEnabled;
        itemObj.cooldownDurationHours = cdHrs;
      }
      parsedItems.push(itemObj);
    }

    const validationErrors: string[] = [];
    parsedItems.forEach((item, idx) => {
      templateFields.forEach((field) => {
        if (field.required && !String(item[field.name] || "").trim()) {
          validationErrors.push(`Item ${idx + 1}: "${field.label || field.name}" is required`);
        }
      });
    });

    if (validationErrors.length > 0) {
      toast.error("Validation: " + validationErrors.slice(0, 3).join(", ") + (validationErrors.length > 3 ? ` +${validationErrors.length - 3} more` : ""));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          items: parsedItems as Record<string, string>[],
          batchName: batchName || undefined,
          cost: batchCost.trim() ? batchCost : undefined,
          sellPendingFirst,
          eachLineIsProduct,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const n = data.data.totalAdded ?? data.data.count ?? minCount;
        if (data.data.fulfilledOrders?.length > 0) {
          toast.success(`Added ${n} item(s) and fulfilled ${data.data.fulfilledOrders.length} order(s)!`);
        } else {
          toast.success(`Added ${n} item(s)`);
        }
        onSuccess();
      } else {
        toast.error(data.error || "Failed to add inventory");
      }
    } catch {
      toast.error("Failed to add inventory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl p-6 my-auto">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Add Inventory - {productName}</h2>

        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Stock type</strong> (on the product) tags how you classify stock for reporting — it does not define which keys (code, email, …) each line stores.</p>
          <p><strong className="text-foreground">Template</strong> defines the field names and structure of each inventory row. You add keys here; the product’s template must match what buyers see at delivery.</p>
        </div>

        {pendingData && pendingData.pendingItems > 0 && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-warning text-sm font-medium">{pendingData.pendingItems} pending item(s) in {pendingData.pendingOrdersCount} order(s)</p>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-2">
                  <input type="checkbox" checked={sellPendingFirst} onChange={(e) => setSellPendingFirst(e.target.checked)} className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring" />
                  <span>Sell to pending orders first</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">Batch Name (optional)</label>
            <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)} className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g., Import 2024-03-15" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">Cost per line (optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={batchCost}
              onChange={(e) => setBatchCost(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">Same cost applied to every row in this batch</p>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={eachLineIsProduct} onChange={(e) => setEachLineIsProduct(e.target.checked)} className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring" />
              <span className="text-sm text-foreground">Each line is a separate product</span>
            </label>
          </div>

          <div className="mb-4 p-4 rounded-lg border border-border space-y-3">
            <p className="text-sm font-medium text-foreground">Multi-sell (optional)</p>
            <p className="text-xs text-muted-foreground">Allow the same inventory line to be sold multiple times up to a limit (e.g. shared seats). Cooldown limits how soon the line can sell again.</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={perRowMultisell}
                onChange={(e) => setPerRowMultisell(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
              />
              <span>Set multi-sell per row (otherwise one setting applies to all rows below)</span>
            </label>
            {!perRowMultisell && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={multiSellEnabled}
                  onChange={(e) => setMultiSellEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                />
                <span>Enable multi-sell for this batch</span>
              </label>
            )}
            {(multiSellEnabled || perRowMultisell) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                {!perRowMultisell && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Max sells per line</label>
                    <input
                      type="number"
                      min={1}
                      value={multiSellMax}
                      onChange={(e) => setMultiSellMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <input
                    type="checkbox"
                    checked={cooldownEnabled}
                    onChange={(e) => setCooldownEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  Cooldown between sells
                </label>
                {cooldownEnabled && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hours</label>
                    <input
                      type="number"
                      min={1}
                      value={cooldownDurationHours}
                      onChange={(e) => setCooldownDurationHours(Math.max(1, parseInt(e.target.value, 10) || 12))}
                      className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    />
                  </div>
                )}
              </div>
            )}
            {perRowMultisell && minCount > 0 && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/80 text-left">
                      <th className="p-2">Row</th>
                      <th className="p-2">Multi-sell</th>
                      <th className="p-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowMultisell.slice(0, minCount).map((row, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => {
                              const next = [...rowMultisell];
                              next[idx] = { ...next[idx], enabled: e.target.checked };
                              setRowMultisell(next);
                            }}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={1}
                            className="w-16 px-1 py-0.5 bg-muted border border-input rounded"
                            value={row.max}
                            onChange={(e) => {
                              const next = [...rowMultisell];
                              next[idx] = { ...next[idx], max: Math.max(1, parseInt(e.target.value, 10) || 5) };
                              setRowMultisell(next);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mb-4 space-y-4">
            <p className="text-sm text-muted-foreground">Enter values for each field (one value per line). Items will be created by combining values in order.</p>
            {templateFields.length === 0 ? (
              <div className="p-3 bg-muted rounded border border-border text-muted-foreground text-sm">No template fields configured for this product.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templateFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {field.label || field.name}{field.required && <span className="text-destructive"> *</span>}
                      <span className="text-muted-foreground font-normal ml-2">({fieldCounts[field.name]} lines)</span>
                    </label>
                    <textarea
                      value={fieldValues[field.name] || ""}
                      onChange={(e) => setFieldValues({ ...fieldValues, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                      rows={6}
                      placeholder="Enter one value per line"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {minCount > 0 && (
            <div className="mb-4 p-3 bg-info/10 border border-info/30 rounded-lg">
              <span className="text-info text-sm">Will create <strong>{minCount}</strong> item(s)</span>
              {hasMismatch && <span className="text-warning text-xs ml-2">Some fields have extra values</span>}
            </div>
          )}

          {hasMismatch && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-warning text-sm font-medium">Field count mismatch</p>
              <p className="text-muted-foreground text-xs mt-1">Only {minCount} items will be created:</p>
              <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                {fieldsWithMismatch.map((m) => <li key={m.field}><strong>{m.field}</strong>: {m.count} values (needs {maxCount})</li>)}
              </ul>
            </div>
          )}

          {minCount > 0 && templateFields.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded border border-border">
              <p className="text-xs text-muted-foreground mb-2">Preview (first 3):</p>
              <div className="space-y-1">
                {Array.from({ length: Math.min(3, minCount) }).map((_, i) => (
                  <div key={i} className="text-xs font-mono text-foreground">
                    {templateFields.map((f) => getParsedLines(f.name)[i] || "-").join(" → ")}
                  </div>
                ))}
                {minCount > 3 && <div className="text-xs text-muted-foreground italic">... and {minCount - 3} more</div>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || minCount === 0}>
              {submitting ? "Adding..." : `Add ${minCount} Item${minCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Standalone Stock Modal
// ============================================================================

function StandaloneStockModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void; }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [batchName, setBatchName] = useState("");
  const [stockCost, setStockCost] = useState("");
  const [eachLineIsProduct, setEachLineIsProduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  /** When 2+ custom fields: one multi-sell setting for every created row */
  const [batchMultiSellEnabled, setBatchMultiSellEnabled] = useState(false);
  const [batchMultiSellMax, setBatchMultiSellMax] = useState(5);
  const [batchCooldownEnabled, setBatchCooldownEnabled] = useState(false);
  const [batchCooldownHours, setBatchCooldownHours] = useState(12);

  // Custom fields mode
  const [useCustomFields, setUseCustomFields] = useState(false);
  const [customFields, setCustomFields] = useState<StandaloneCustomFieldRow[]>([
    { name: "code", value: "", type: "string", required: true, multiSell: false, multiSellMax: 5, cooldownEnabled: false, cooldownDurationHours: 12, wholeFieldIsOneItem: false, linkedTo: "", isMainStockField: true },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, productsRes] = await Promise.all([fetch("/api/inventory/templates"), fetch("/api/products?limit=500")]);
        const templatesData = await templatesRes.json();
        const productsData = await productsRes.json();
        if (templatesData.success) setTemplates(templatesData.data);
        if (productsData.success) setProducts(productsData.data);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (useCustomFields) { setTemplateFields([]); setFieldValues({}); return; }
    if (!selectedTemplateId) { setTemplateFields([]); setFieldValues({}); return; }
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (template?.fieldsSchema) {
      setTemplateFields(template.fieldsSchema);
      const initialValues: Record<string, string> = {};
      template.fieldsSchema.forEach((field: TemplateField) => { initialValues[field.name] = ""; });
      setFieldValues(initialValues);
    }
  }, [selectedTemplateId, templates, useCustomFields]);

  // Template mode counts
  const getParsedLines = (fieldName: string): string[] => {
    const fieldSchema = templateFields.find(f => f.name === fieldName);
    if (fieldSchema?.wholeFieldIsOneItem && fieldValues[fieldName]?.trim()) {
      return [fieldValues[fieldName].trim()];
    }
    return (fieldValues[fieldName] || "").split("\n").map((l) => l.trim()).filter(Boolean);
  };
  const fieldCounts = templateFields.reduce((acc, field) => { acc[field.name] = getParsedLines(field.name).length; return acc; }, {} as Record<string, number>);
  const counts = Object.values(fieldCounts);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;

  // Custom fields mode counts
  const getCustomFieldParsedLines = (index: number): string[] => {
    const f = customFields[index];
    if (!f) return [];
    if (f.wholeFieldIsOneItem && f.value.trim()) return [f.value.trim()];
    return (f.value || "").split("\n").map((l) => l.trim()).filter(Boolean);
  };
  const customFieldCounts = customFields.map((_, i) => getCustomFieldParsedLines(i).length);
  const contributingCounts = customFields.map((f, i) => {
    const c = customFieldCounts[i];
    if (!f.name.trim() || c === 0) return null;
    if (f.wholeFieldIsOneItem && c === 1) return null;
    return c;
  }).filter((c): c is number => c !== null);
  const customMinCount =
    customFields.some((f) => f.value.trim()) && customFields.some((f) => f.name.trim())
      ? contributingCounts.length > 0
        ? Math.min(...contributingCounts)
        : Math.min(...customFieldCounts.filter((c) => c > 0)) || 0
      : 0;

  const addCustomField = () =>
    setCustomFields([
      ...customFields,
      {
        name: "",
        value: "",
        type: "string",
        required: false,
        multiSell: false,
        multiSellMax: 5,
        cooldownEnabled: false,
        cooldownDurationHours: 12,
        wholeFieldIsOneItem: false,
        linkedTo: "",
        isMainStockField: false,
      },
    ]);
  const removeCustomField = (index: number) => {
    const next = customFields.filter((_, i) => i !== index);
    if (next.length && !next.some((f) => f.isMainStockField)) {
      next[0] = { ...next[0], isMainStockField: true };
    }
    setCustomFields(next);
  };
  const updateCustomField = (index: number, key: string, val: unknown) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [key]: val } as StandaloneCustomFieldRow;
    setCustomFields(newFields);
  };
  const setMainStockField = (index: number) => {
    setCustomFields(customFields.map((f, i) => ({ ...f, isMainStockField: i === index })));
  };

  const effectiveMinCount = useCustomFields ? customMinCount : minCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedItems: Record<string, any>[] = [];

    if (useCustomFields) {
      const filled = customFields.filter((f) => f.name.trim() && f.value.trim());
      if (filled.length === 0) {
        toast.error("Please add at least one field with values");
        return;
      }
      if (customMinCount === 0) {
        toast.error("Please enter values in at least one field");
        return;
      }
      const multiFieldMode = filled.length >= 2;
      const reqMissing = customFields.some((f) => f.required && f.name.trim() && !f.value.trim());
      if (reqMissing) {
        toast.error("Fill all required fields");
        return;
      }
      for (let i = 0; i < customMinCount; i++) {
        const itemObj: Record<string, unknown> = {};
        customFields.forEach((field, idx) => {
          if (!field.name.trim() || !field.value.trim()) return;
          const lines = getCustomFieldParsedLines(idx);
          const broadcast = field.wholeFieldIsOneItem && lines.length === 1 && customMinCount > 1;
          itemObj[field.name] = broadcast ? lines[0] : (lines[i] ?? "");
        });
        if (multiFieldMode) {
          if (batchMultiSellEnabled) {
            itemObj.multiSellEnabled = true;
            itemObj.multiSellMax = Math.max(1, batchMultiSellMax);
            itemObj.cooldownEnabled = batchCooldownEnabled;
            itemObj.cooldownDurationHours = Math.max(1, batchCooldownHours);
          }
        } else {
          customFields.forEach((field, idx) => {
            if (!field.name.trim() || !field.value.trim()) return;
            if (field.multiSell) {
              itemObj.multiSellEnabled = true;
              itemObj.multiSellMax = field.multiSellMax || 5;
              itemObj.cooldownEnabled = field.cooldownEnabled || false;
              itemObj.cooldownDurationHours = field.cooldownDurationHours || 12;
            }
          });
        }
        parsedItems.push(itemObj);
      }
      const rowErrors: string[] = [];
      parsedItems.forEach((item, idx) => {
        customFields.forEach((field) => {
          if (!field.required || !field.name.trim()) return;
          if (!String(item[field.name] ?? "").trim()) {
            rowErrors.push(`Row ${idx + 1}: "${field.name}" is required`);
          }
        });
      });
      if (rowErrors.length > 0) {
        toast.error(rowErrors.slice(0, 2).join("; "));
        return;
      }
    } else {
      if (minCount === 0) { toast.error("Please enter values in at least one field"); return; }
      for (let i = 0; i < minCount; i++) {
        const itemObj: Record<string, any> = {};
        templateFields.forEach((field) => { 
          itemObj[field.name] = getParsedLines(field.name)[i] || ""; 
          if (field.multiSell) {
            itemObj.multiSellEnabled = true;
            itemObj.multiSellMax = field.multiSellMax || 5;
            itemObj.cooldownEnabled = field.cooldownEnabled || false;
            itemObj.cooldownDurationHours = field.cooldownDurationHours || 12;
          }
        });
        parsedItems.push(itemObj);
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: useCustomFields ? null : selectedTemplateId,
          productId: selectedProductId || null,
          items: parsedItems,
          batchName: batchName || undefined,
          cost: stockCost.trim() ? stockCost : undefined,
          eachLineIsProduct,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Added ${data.data.count} stock item(s)!`); onSuccess(); }
      else { toast.error(data.error || "Failed to add stock"); }
    } catch { toast.error("Failed to add stock"); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-card rounded-lg border border-border w-full max-w-3xl p-6 my-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Add Stock</h2>

        {loading ? (
          <div className="text-center py-8"><Skeleton className="h-8 w-48 mx-auto" /></div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Mode Toggle */}
            <div className="mb-4 p-3 bg-muted rounded-lg border border-input">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mode" checked={!useCustomFields} onChange={() => setUseCustomFields(false)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-foreground">Use Template</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mode" checked={useCustomFields} onChange={() => setUseCustomFields(true)} className="w-4 h-4" />
                  <span className="text-sm font-medium text-foreground">Custom Fields</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {useCustomFields
                  ? "Define your own field names and paste values. No template needed."
                  : "Select a pre-defined template to use its field structure."}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">Cost per stock line (optional)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={stockCost}
                onChange={(e) => setStockCost(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">Applied to every line you create in this batch (same as product &quot;Add Inventory&quot;).</p>
            </div>

            {useCustomFields && customFields.length >= 2 && (
              <div className="mb-4 p-4 rounded-lg border border-border space-y-3 bg-muted/40">
                <p className="text-sm font-medium text-foreground">Multi-sell for this batch (all rows)</p>
                <p className="text-xs text-muted-foreground">With several fields, one setting here applies to every stock line — easier for manual sell.</p>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={batchMultiSellEnabled}
                    onChange={(e) => setBatchMultiSellEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span>Enable multi-sell for all lines below</span>
                </label>
                {batchMultiSellEnabled && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Max sells per line</label>
                      <input
                        type="number"
                        min={1}
                        value={batchMultiSellMax}
                        onChange={(e) => setBatchMultiSellMax(Math.max(1, parseInt(e.target.value, 10) || 5))}
                        className="w-24 px-2 py-1.5 bg-muted border border-input rounded text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={batchCooldownEnabled}
                        onChange={(e) => setBatchCooldownEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-input"
                      />
                      Cooldown between sells
                    </label>
                    {batchCooldownEnabled && (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Hours</label>
                        <input
                          type="number"
                          min={1}
                          value={batchCooldownHours}
                          onChange={(e) => setBatchCooldownHours(Math.max(1, parseInt(e.target.value, 10) || 12))}
                          className="w-20 px-2 py-1.5 bg-muted border border-input rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Template Selector (only in template mode) */}
            {!useCustomFields && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Inventory Template</label>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select a template...</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.description ? ` - ${t.description}` : ""}</option>)}
                </select>
              </div>
            )}

            {/* Custom Fields Editor (only in custom mode) */}
            {useCustomFields && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">Fields</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomField}>+ Add Field</Button>
                </div>
                {customFields.length >= 2 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    The <strong className="text-foreground">main</strong> field is shown first: one line = one stock unit. Detail fields use the same line order so row 1 matches row 1 everywhere — easier for manual sell.
                  </p>
                )}
                <div className="space-y-4">
                  {(() => {
                    const mainI = Math.max(0, customFields.findIndex((f) => f.isMainStockField));
                    const detailIdx = customFields.map((_, i) => i).filter((i) => customFields.length < 2 || i !== mainI);

                    const renderFieldCard = (index: number, role: "main" | "detail" | "single") => {
                      const field = customFields[index];
                      const multiField = customFields.length >= 2;
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border shadow-sm ${
                            role === "main" ? "bg-primary/5 border-primary/40" : "bg-muted border-input"
                          }`}
                        >
                          {role === "main" && (
                            <p className="text-xs font-semibold text-primary mb-2">Main stock row</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateCustomField(index, "name", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                              className="flex-1 min-w-[120px] px-3 py-2 bg-card border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              placeholder="Field name (e.g. sku)"
                            />
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomField(index, "type", e.target.value)}
                              className="px-3 py-2 bg-card border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                            <span className="text-xs text-muted-foreground">{getCustomFieldParsedLines(index).length} lines</span>
                            {multiField && !field.isMainStockField && (
                              <button
                                type="button"
                                onClick={() => setMainStockField(index)}
                                className="text-xs text-primary hover:underline"
                              >
                                Set as main
                              </button>
                            )}
                            {customFields.length > 1 && (
                              <button type="button" onClick={() => removeCustomField(index)} className="px-2 py-1 text-sm text-destructive hover:text-destructive/80">
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateCustomField(index, "required", e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-ring bg-card border-input"
                              />
                              <span>Required</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.wholeFieldIsOneItem}
                                onChange={(e) => updateCustomField(index, "wholeFieldIsOneItem", e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-ring bg-card border-input"
                              />
                              <span>Single value (same for every row)</span>
                            </label>
                            {!multiField && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.multiSell}
                                  onChange={(e) => updateCustomField(index, "multiSell", e.target.checked)}
                                  className="w-4 h-4 rounded text-primary focus:ring-ring bg-card border-input"
                                />
                                <span>Multi-sell</span>
                              </label>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Link:</span>
                              <select
                                value={field.linkedTo}
                                onChange={(e) => updateCustomField(index, "linkedTo", e.target.value)}
                                className="px-3 py-1 bg-card border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="">None</option>
                                {customFields.filter((_, i) => i !== index).map((f, oi) => (
                                  <option key={`${index}-link-${oi}-${f.name}`} value={f.name}>{f.name || "Unnamed"}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {!multiField && field.multiSell && (
                            <div className="flex flex-wrap items-center gap-3 bg-muted/50 px-2 py-2 rounded mb-3">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">Max sales:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={field.multiSellMax}
                                  onChange={(e) => updateCustomField(index, "multiSellMax", parseInt(e.target.value, 10) || 1)}
                                  className="w-16 px-2 py-1 bg-card border border-input rounded text-sm"
                                />
                              </div>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.cooldownEnabled}
                                  onChange={(e) => updateCustomField(index, "cooldownEnabled", e.target.checked)}
                                  className="w-4 h-4 rounded text-primary"
                                />
                                <span className="text-sm">Cooldown</span>
                              </label>
                              {field.cooldownEnabled && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={field.cooldownDurationHours}
                                    onChange={(e) => updateCustomField(index, "cooldownDurationHours", parseInt(e.target.value, 10) || 1)}
                                    className="w-16 px-2 py-1 bg-card border border-input rounded text-sm"
                                  />
                                  <span className="text-sm text-muted-foreground">hours</span>
                                </div>
                              )}
                            </div>
                          )}

                          <textarea
                            value={field.value}
                            onChange={(e) => updateCustomField(index, "value", e.target.value)}
                            className="w-full px-3 py-2 bg-card border border-input rounded text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            rows={field.wholeFieldIsOneItem ? 2 : 4}
                            placeholder={field.wholeFieldIsOneItem ? "One shared value for all rows…" : "One value per line (same count as other fields, unless single value is checked)"}
                          />
                        </div>
                      );
                    };

                    if (customFields.length === 1) {
                      return <>{renderFieldCard(0, "single")}</>;
                    }
                    return (
                      <>
                        {renderFieldCard(mainI, "main")}
                        {detailIdx.length > 0 && (
                          <p className="text-xs font-semibold text-muted-foreground pt-1">Detail fields</p>
                        )}
                        {detailIdx.map((i) => renderFieldCard(i, "detail"))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Link to Product (Optional)</label>
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Batch Name (optional)</label>
              <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g., Import 2024-03-15" />
            </div>

            {/* Template mode field values */}
            {!useCustomFields && templateFields.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Field Values</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateFields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {field.label || field.name}{field.required && <span className="text-destructive"> *</span>}
                        <span className="text-muted-foreground font-normal ml-2">({fieldCounts[field.name] || 0} lines)</span>
                      </label>
                      {field.type === "boolean" ? (
                        <select value={fieldValues[field.name] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [field.name]: e.target.value })} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">Select...</option><option value="true">True</option><option value="false">False</option>
                        </select>
                      ) : field.type === "number" ? (
                        <input type="number" value={fieldValues[field.name] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [field.name]: e.target.value })} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      ) : (
                        <textarea value={fieldValues[field.name] || ""} onChange={(e) => setFieldValues({ ...fieldValues, [field.name]: e.target.value })} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm" rows={6} placeholder="One value per line" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {effectiveMinCount > 0 && (
              <div className="mb-4 p-3 bg-info/10 border border-info/30 rounded-lg">
                <span className="text-info text-sm">Will create <strong>{effectiveMinCount}</strong> stock item(s)</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting || effectiveMinCount === 0}>
                {submitting ? "Adding..." : `Add ${effectiveMinCount} Stock Item${effectiveMinCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Link Stock Modal
// ============================================================================

function LinkStockModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void; }) {
  const [products, setProducts] = useState<any[]>([]);
  const [unlinkedItems, setUnlinkedItems] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, itemsRes] = await Promise.all([fetch("/api/products?limit=500"), fetch("/api/inventory?unlinked=true&limit=100")]);
        const productsData = await productsRes.json();
        const itemsData = await itemsRes.json();
        if (productsData.success) setProducts(productsData.data);
        if (itemsData.success) setUnlinkedItems(itemsData.data);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const toggleItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedItemIds(next);
  };

  const toggleAll = () => {
    setSelectedItemIds(selectedItemIds.size === unlinkedItems.length ? new Set() : new Set(unlinkedItems.map((item) => item.id)));
  };

  const handleLink = async () => {
    if (selectedItemIds.size === 0) { toast.error("Select at least one stock item"); return; }
    if (!selectedProductId) { toast.error("Select a product to link to"); return; }

    setLinking(true);
    try {
      const res = await fetch("/api/inventory/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds: Array.from(selectedItemIds), productId: selectedProductId }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Linked ${selectedItemIds.size} item(s) to product!`); onSuccess(); }
      else { toast.error(data.error || "Failed to link stock"); }
    } catch { toast.error("Failed to link stock"); } finally { setLinking(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-card rounded-lg border border-border w-full max-w-4xl p-6 my-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Link Stock to Product</h2>
        <p className="text-sm text-muted-foreground mb-4">Select unlinked stock items and link them to a product.</p>

        {loading ? (
          <div className="text-center py-8"><Skeleton className="h-8 w-48 mx-auto" /></div>
        ) : (
          <>
            {unlinkedItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No unlinked stock items found.</p>
                <Button variant="ghost" onClick={onClose}>Close</Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Select Product *</label>
                  <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select a product...</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground">Unlinked Stock Items ({unlinkedItems.length})</h3>
                    <button type="button" onClick={toggleAll} className="text-xs text-primary hover:text-primary/80">
                      {selectedItemIds.size === unlinkedItems.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left"><input type="checkbox" checked={selectedItemIds.size === unlinkedItems.length && unlinkedItems.length > 0} onChange={toggleAll} className="w-4 h-4 rounded" /></th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Values</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {unlinkedItems.map((item) => (
                          <tr key={item.id} className={`hover:bg-muted/50 cursor-pointer ${selectedItemIds.has(item.id) ? "bg-primary/5" : ""}`} onClick={() => toggleItem(item.id)}>
                            <td className="px-4 py-2"><input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItem(item.id)} className="w-4 h-4 rounded" onClick={(e) => e.stopPropagation()} /></td>
                            <td className="px-4 py-2 text-sm text-foreground">{Object.entries(item.values || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedItemIds.size > 0 && (
                  <div className="mb-4 p-3 bg-info/10 border border-info/30 rounded-lg">
                    <span className="text-info text-sm">{selectedItemIds.size} item(s) selected</span>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={onClose} disabled={linking}>Cancel</Button>
                  <Button onClick={handleLink} disabled={linking || selectedItemIds.size === 0 || !selectedProductId}>
                    {linking ? "Linking..." : `Link ${selectedItemIds.size} Item(s)`}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
