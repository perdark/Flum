/**
 * RelatedProducts Component
 *
 * UI for managing product relationships (cross-sell, upsell)
 * Used in the Product Edit page
 */

"use client";

import { useState, useEffect } from "react";

interface RelatedProduct {
  id: string;
  relationType: string;
  score: number;
  relatedProductId: string;
  relatedProductName: string;
  relatedProductSlug: string;
  relatedProductActive: boolean;
}

interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  basePrice: string;
  isActive: boolean;
}

interface RelatedProductsProps {
  productId: string;
}

export function RelatedProducts({ productId }: RelatedProductsProps) {
  const [relations, setRelations] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Add relation state
  const [addRelationOpen, setAddRelationOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [relationType, setRelationType] = useState<"cross_sell" | "upsell">("cross_sell");

  useEffect(() => {
    loadRelations();
  }, [productId]);

  const loadRelations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/relations`);
      const data = await res.json();
      if (data.success) {
        setRelations(data.data);
      }
    } catch (err) {
      console.error("Failed to load relations:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&excludeId=${productId}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error("Failed to search products:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddRelation = async () => {
    if (!selectedProductId) {
      alert("Please select a product");
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedProductId: selectedProductId,
          relationType,
          score: 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        loadRelations();
        setAddRelationOpen(false);
        setSelectedProductId("");
        setSearchQuery("");
      } else {
        alert(data.error || "Failed to add relation");
      }
    } catch (err) {
      alert("Failed to add relation");
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!confirm("Remove this related product?")) return;

    try {
      const res = await fetch(`/api/products/${productId}/relations/${relationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRelations(relations.filter((r) => r.id !== relationId));
      }
    } catch (err) {
      alert("Failed to remove relation");
    }
  };

  const getRelationLabel = (type: string) => {
    switch (type) {
      case "cross_sell":
        return "Cross-sell";
      case "upsell":
        return "Upsell";
      default:
        return type;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Related Products</h3>
        <button
          type="button"
          onClick={() => setAddRelationOpen(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Relation
        </button>
      </div>

      {/* Add Relation Modal */}
      {addRelationOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add Related Product</h3>

            <div className="space-y-4">
              {/* Search products */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Search Products
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchProducts(e.target.value);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by name or SKU..."
                  autoComplete="off"
                />

                {/* Search results dropdown */}
                {searchOpen && (searchQuery.length >= 2) && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                    {searchLoading ? (
                      <div className="p-3 text-sm text-slate-400">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400">No products found</div>
                    ) : (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setSearchQuery(product.name);
                            setSearchOpen(false);
                          }}
                          className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0"
                        >
                          <div className="font-medium text-white">{product.name}</div>
                          <div className="text-sm text-slate-400">
                            SKU: {product.sku || "N/A"} • ${product.basePrice}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected product */}
              {selectedProductId && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1">Selected Product:</p>
                  <p className="text-white font-medium">{searchQuery}</p>
                </div>
              )}

              {/* Relation type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Relation Type
                </label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as "cross_sell" | "upsell")}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cross_sell">Cross-sell (shown as related)</option>
                  <option value="upsell">Upsell (shown as upgrade)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddRelationOpen(false);
                    setSelectedProductId("");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRelation}
                  disabled={!selectedProductId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Relation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relations list */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : relations.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No related products yet. Add your first relation!
        </div>
      ) : (
        <div className="space-y-2">
          {relations.map((relation) => (
            <div
              key={relation.id}
              className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{relation.relatedProductName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    {getRelationLabel(relation.relationType)}
                  </span>
                  {!relation.relatedProductActive && (
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRelation(relation.id)}
                className="p-2 text-red-400 hover:text-red-300"
                title="Remove relation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
