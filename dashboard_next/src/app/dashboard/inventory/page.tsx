/**
 * Inventory Dashboard Page - Product-First View with Platform Filters
 *
 * Product selection on left, inventory table on right
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Platform {
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
  platforms: Platform[];
}

interface InventoryItem {
  id: string;
  values: Record<string, string | number | boolean>;
  status: string;
  createdAt: string;
  purchasedAt: string | null;
}

interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean";
  label: string;
  required: boolean;
}

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");

  const [products, setProducts] = useState<Product[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productIdParam);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch products summary and platforms
  useEffect(() => {
    fetchProducts();
    fetchPlatforms();
  }, [platformFilter]);

  // Fetch inventory when product is selected
  useEffect(() => {
    if (selectedProductId) {
      fetchInventory();
    } else {
      setInventoryItems([]);
      setTemplateFields([]);
    }
  }, [selectedProductId, statusFilter, page]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (platformFilter) params.set("platformId", platformFilter);

      const res = await fetch(`/api/products/summary?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const res = await fetch("/api/platforms?asTree=true");
      const data = await res.json();
      if (data.success) {
        // Flatten tree for dropdown
        const flat = flattenPlatforms(data.data);
        setPlatforms(flat);
      }
    } catch (err) {
      console.error("Failed to load platforms");
    }
  };

  const flattenPlatforms = (
    nodes: any[],
    prefix = "",
    depth = 0
  ): Platform[] => {
    const result: Platform[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, name: prefix + node.name, parentId: null, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenPlatforms(node.children, prefix + node.name + " / ", depth + 1));
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
        limit: "50",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();

      if (data.success) {
        setInventoryItems(data.data);
        setTotalPages(data.pagination?.totalPages || 1);

        // Get template fields for display
        const product = products.find((p) => p.id === selectedProductId);
        if (product?.templateName) {
          // Fetch template schema
          const templateRes = await fetch(`/api/inventory/templates`);
          const templateData = await templateRes.json();
          if (templateData.success) {
            const template = templateData.data.find((t: any) => t.name === product.templateName);
            if (template?.fieldsSchema) {
              setTemplateFields(template.fieldsSchema);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load inventory");
    } finally {
      setInventoryLoading(false);
    }
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
      }
    } catch (err) {
      alert("Export failed");
    }
  };

  // Filter products by search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected product
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Get field names from inventory
  const fieldNames = new Set<string>();
  inventoryItems.forEach((item) => {
    if (item.values) {
      Object.keys(item.values).forEach((k) => fieldNames.add(k));
    }
  });
  const fields = Array.from(fieldNames);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-slate-400 mt-1">
            Manage inventory by product
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/inventory/search"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Global Search
          </a>
          <a
            href="/dashboard/inventory/templates"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Templates
          </a>
          {selectedProductId && (
            <>
              <button
                onClick={() => handleExport("tsv")}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Export TSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add Inventory
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-slate-700 space-y-3">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {"\u00A0".repeat((p.depth || 0) * 2) + p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products */}
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-400">Loading...</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className={`w-full p-4 text-left hover:bg-slate-700/50 transition-colors ${
                        selectedProductId === product.id ? "bg-slate-700" : ""
                      }`}
                    >
                      <div className="font-medium text-white truncate mb-1">
                        {product.name}
                      </div>
                      {/* Platform chips */}
                      {product.platforms && product.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.platforms.slice(0, 2).map((p) => (
                            <span
                              key={p.id}
                              className="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded"
                            >
                              {p.name}
                            </span>
                          ))}
                          {product.platforms.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                              +{product.platforms.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-400">
                          {product.availableCount} avail
                        </span>
                        <span className="text-yellow-400">
                          {product.reservedCount} reserved
                        </span>
                        <span className="text-blue-400">
                          {product.soldCount} sold
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="lg:col-span-3">
          {!selectedProductId ? (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-slate-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">
                Select a Product
              </h3>
              <p className="text-slate-400">
                Choose a product from the list to view and manage its inventory
              </p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              {/* Product Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedProduct?.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedProduct?.platforms && selectedProduct.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedProduct.platforms.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-slate-400">
                      Template: {selectedProduct?.templateName || "None"}
                    </span>
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Table */}
              {inventoryLoading ? (
                <div className="p-8 text-center text-slate-400">Loading inventory...</div>
              ) : inventoryItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No inventory items found</div>
              ) : (
                <>
                  {/* Template field labels legend */}
                  {templateFields.length > 0 && (
                    <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-700 flex flex-wrap gap-3 text-xs">
                      {templateFields.map((f) => (
                        <span key={f.name} className="text-slate-400">
                          <span className="font-medium text-slate-300">{f.name}</span>
                          {f.required && <span className="text-red-400">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                            Status
                          </th>
                          {fields.map((field) => (
                            <th
                              key={field}
                              className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
                            >
                              {field}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                            Created
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                            Sold At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {inventoryItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  item.status === "available"
                                    ? "bg-green-500/20 text-green-400"
                                    : item.status === "reserved"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : item.status === "sold"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            {fields.map((field) => (
                              <td key={field} className="px-4 py-3 text-sm text-slate-300 font-mono">
                                {String(item.values[field] ?? "-")}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {item.purchasedAt
                                ? new Date(item.purchasedAt).toLocaleDateString()
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-slate-700 text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-slate-700 text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && selectedProductId && selectedProduct && (
        <AddInventoryModal
          productId={selectedProductId}
          productName={selectedProduct.name}
          templateFields={templateFields}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchInventory();
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

// Add Inventory Modal Component with template fields
function AddInventoryModal({
  productId,
  productName,
  templateFields,
  onClose,
  onSuccess,
}: {
  productId: string;
  productName: string;
  templateFields: TemplateField[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [items, setItems] = useState("");
  const [batchName, setBatchName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<{ pendingItems: number; pendingOrdersCount: number } | null>(null);
  const [sellPendingFirst, setSellPendingFirst] = useState(false);

  // Fetch pending items count on mount
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch(`/api/inventory/pending-count?productId=${productId}`);
        const data = await res.json();
        if (data.success && data.data.pendingItems > 0) {
          setPendingData(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch pending count");
      }
    };
    fetchPendingCount();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!items.trim()) {
      alert("Please enter inventory items");
      return;
    }

    // Parse items (one per line, comma-separated values)
    const lines = items.trim().split("\n");
    const parsedItems = lines
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        // Build object based on template fields
        const itemObj: Record<string, string> = {};
        templateFields.forEach((field, index) => {
          itemObj[field.name] = values[index] || "";
        });
        return itemObj;
      });

    if (parsedItems.length === 0) {
      alert("No valid items to add");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          items: parsedItems,
          batchName: batchName || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || "Failed to add inventory");
      }
    } catch (err) {
      alert("Failed to add inventory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Add Inventory - {productName}
        </h2>

        {/* Pending items notice */}
        {pendingData && pendingData.pendingItems > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-yellow-200 text-sm font-medium">
                  You have {pendingData.pendingItems} pending item(s) in {pendingData.pendingOrdersCount} order(s)
                </p>
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-sm text-yellow-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sellPendingFirst}
                      onChange={(e) => setSellPendingFirst(e.target.checked)}
                      className="w-4 h-4 rounded border-yellow-500/30 bg-slate-900 text-yellow-400 focus:ring-yellow-500"
                    />
                    <span>Sell to pending orders first (new inventory will fulfill pending orders)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Template info */}
        {templateFields.length > 0 && (
          <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Template fields:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {templateFields.map((f) => (
                <span key={f.name} className="px-2 py-1 bg-slate-700 rounded">
                  {f.name}
                  {f.required && <span className="text-red-400"> *</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Enter values in order: {templateFields.map((f) => f.name).join(", ")}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Batch Name (optional)
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Import 2024-03-15"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Inventory Items *
            </label>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={10}
              placeholder={templateFields.length > 0
                ? `One item per line, comma-separated values\nExample: ${templateFields.map((f) => f.name).join(", ")}`
                : "One item per line, comma-separated values\nXXXXX-XXXXX-XXXXX, extra info"
              }
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              {templateFields.length > 0
                ? `Values should be in order: ${templateFields.map((f) => f.name).join(", ")}`
                : "First value will be used as the key/code"
              }
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding..." : `Add ${items.split("\n").filter(l => l.trim()).length} Items`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
