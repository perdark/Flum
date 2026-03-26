/**
 * RelatedProducts Component
 *
 * UI for managing product relationships (cross-sell, upsell)
 * Used in the Product Edit page
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

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
      toast.error("Please select a product");
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
        toast.error(data.error || "Failed to add relation");
      }
    } catch (err) {
      toast.error("Failed to add relation");
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
      toast.error("Failed to remove relation");
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
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Related Products</h3>
        <button
          type="button"
          onClick={() => setAddRelationOpen(true)}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
        >
          + Add Relation
        </button>
      </div>

      {/* Add Relation Modal */}
      {addRelationOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Related Product</h3>

            <div className="space-y-4">
              {/* Search products */}
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Search by name or SKU..."
                  autoComplete="off"
                />

                {/* Search results dropdown */}
                {searchOpen && (searchQuery.length >= 2) && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg max-h-60 overflow-y-auto shadow-lg">
                    {searchLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No products found</div>
                    ) : (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setSearchQuery(product.name);
                            setSearchOpen(false);
                          }}
                          className="p-3 hover:bg-secondary cursor-pointer border-b border-border last:border-0"
                        >
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
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
                <div className="p-3 bg-muted rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Selected Product:</p>
                  <p className="text-foreground font-medium">{searchQuery}</p>
                </div>
              )}

              {/* Relation type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Relation Type
                </label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as "cross_sell" | "upsell")}
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="px-4 py-2 text-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRelation}
                  disabled={!selectedProductId}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : relations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No related products yet. Add your first relation!
        </div>
      ) : (
        <div className="space-y-2">
          {relations.map((relation) => (
            <div
              key={relation.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{relation.relatedProductName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-info/20 text-primary rounded">
                    {getRelationLabel(relation.relationType)}
                  </span>
                  {!relation.relatedProductActive && (
                    <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRelation(relation.id)}
                className="p-2 text-destructive hover:text-destructive/80"
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
