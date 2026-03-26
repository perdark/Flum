"use client";

/**
 * Bundle Builder Component
 *
 * Allows configuration of bundle products based on a template.
 * Users can add items to each repeatable field defined in the template.
 */

import { useState, useEffect } from "react";

interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean" | "group" | "multiline";
  required: boolean;
  label: string;
  isVisibleToAdmin: boolean;
  isVisibleToMerchant: boolean;
  isVisibleToCustomer: boolean;
  repeatable: boolean;
  eachLineIsProduct: boolean;
  parentId: string | null;
  displayOrder: number;
}

interface InventoryTemplate {
  id: string;
  name: string;
  description: string | null;
  fieldsSchema: TemplateField[];
}

export interface BundleItem {
  templateFieldId: string;
  lineIndex: number;
  productName: string;
  quantity: number;
  productId?: string;
  priceOverride?: string;
}

interface BundleBuilderProps {
  bundleTemplateId: string;
  bundleItems: BundleItem[];
  onChange: (items: BundleItem[]) => void;
  readOnly?: boolean;
}

export function BundleBuilder({
  bundleTemplateId,
  bundleItems,
  onChange,
  readOnly = false,
}: BundleBuilderProps) {
  const [template, setTemplate] = useState<InventoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductSelector, setShowProductSelector] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const response = await fetch("/api/inventory/templates");
        const result = await response.json();
        if (result.success) {
          const foundTemplate = result.data.find((t: InventoryTemplate) => t.id === bundleTemplateId);
          if (foundTemplate) {
            setTemplate(foundTemplate);
          } else {
            setError("Template not found");
          }
        }
      } catch (err) {
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [bundleTemplateId]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products?limit=100");
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
        }
      } catch (err) {
        console.error("Failed to load products");
      }
    }
    fetchProducts();
  }, []);

  // Get repeatable fields from template (sorted by displayOrder)
  const repeatableFields = template?.fieldsSchema
    .filter((f) => f.repeatable && !f.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder) || [];

  // Get items for a specific field
  const getFieldItems = (fieldName: string): BundleItem[] => {
    return bundleItems.filter((item) => item.templateFieldId === fieldName);
  };

  // Add a new item to a field
  const addItem = (fieldName: string) => {
    const fieldItems = getFieldItems(fieldName);
    const newItem: BundleItem = {
      templateFieldId: fieldName,
      lineIndex: fieldItems.length,
      productName: "",
      quantity: 1,
    };
    onChange([...bundleItems, newItem]);
  };

  // Remove an item from a field
  const removeItem = (item: BundleItem) => {
    const filtered = bundleItems.filter(
      (i) => !(i.templateFieldId === item.templateFieldId && i.lineIndex === item.lineIndex)
    );
    // Reindex remaining items for this field
    const fieldName = item.templateFieldId;
    const fieldItems = filtered.filter((i) => i.templateFieldId === fieldName);
    fieldItems.forEach((fi, idx) => (fi.lineIndex = idx));
    onChange(filtered);
  };

  // Update an item
  const updateItem = (item: BundleItem, updates: Partial<BundleItem>) => {
    const index = bundleItems.findIndex(
      (i) => i.templateFieldId === item.templateFieldId && i.lineIndex === item.lineIndex
    );
    if (index !== -1) {
      const newItems = [...bundleItems];
      newItems[index] = { ...newItems[index], ...updates };
      onChange(newItems);
    }
  };

  // Get product suggestions
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading template...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
        {error}
      </div>
    );
  }

  if (!template) {
    return null;
  }

  if (repeatableFields.length === 0) {
    return (
      <div className="p-4 bg-yellow-950/50 text-yellow-400 border border-yellow-900 rounded-lg">
        This template has no repeatable fields. Please edit the template and mark at least one field as repeatable to use it for bundles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {repeatableFields.map((field) => {
        const fieldItems = getFieldItems(field.name);
        const fieldConfig = template.fieldsSchema.find((f) => f.name === field.name);

        return (
          <div key={field.name} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            {/* Field Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">{field.label}</h4>
                  <p className="text-xs text-slate-500">Field: {field.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {field.eachLineIsProduct && (
                    <span className="text-xs bg-green-950 text-green-400 px-2 py-1 rounded">
                      Each line is a separate product
                    </span>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => addItem(field.name)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Item
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Field Items */}
            <div className="p-4 space-y-3">
              {fieldItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No items added yet. Click "Add Item" to add products to this field.
                </p>
              ) : (
                fieldItems.map((item) => (
                  <div
                    key={`${item.templateFieldId}-${item.lineIndex}`}
                    className="bg-slate-900/50 p-3 rounded border border-slate-700"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Product Name/Selector */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Product Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => updateItem(item, { productName: e.target.value })}
                            placeholder="Enter product name or search..."
                            readOnly={readOnly}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                          />
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => setShowProductSelector(item.templateFieldId + "-" + item.lineIndex)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              🔍
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item, { quantity: parseInt(e.target.value) || 1 })}
                          readOnly={readOnly}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-end">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="w-full px-3 py-2 text-red-400 hover:text-red-300 text-sm border border-red-900/50 rounded hover:bg-red-950/30"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Price Override (Optional) */}
                    {!readOnly && (
                      <div className="mt-3 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!item.priceOverride}
                            onChange={(e) =>
                              updateItem(item, { priceOverride: e.target.checked ? "0" : undefined })
                            }
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                          />
                          <span className="text-slate-300">Override Price</span>
                        </label>
                        {item.priceOverride !== undefined && (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.priceOverride}
                            onChange={(e) => updateItem(item, { priceOverride: e.target.value })}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded text-sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelectorModal
          products={filteredProducts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(product) => {
            const [fieldId, lineIndexStr] = showProductSelector.split("-");
            const lineIndex = parseInt(lineIndexStr);
            const item = bundleItems.find(
              (i) => i.templateFieldId === fieldId && i.lineIndex === lineIndex
            );
            if (item) {
              updateItem(item, { productName: product.name, productId: product.id });
            }
            setShowProductSelector(null);
            setSearchQuery("");
          }}
          onClose={() => {
            setShowProductSelector(null);
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}

interface ProductSelectorModalProps {
  products: Array<{ id: string; name: string }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (product: { id: string; name: string }) => void;
  onClose: () => void;
}

function ProductSelectorModal({
  products,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
}: ProductSelectorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Select a Product</h3>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            autoFocus
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {products.length === 0 ? (
            <p className="p-4 text-slate-500 text-center">No products found</p>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                className="w-full px-4 py-3 text-left hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                {product.name}
              </button>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
