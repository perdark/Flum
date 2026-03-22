"use client";

/**
 * Add Inventory Modal Component
 *
 * Modal form to bulk add inventory items for a product
 */

import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface InventoryTemplate {
  id: string;
  name: string;
  fieldsSchema: Array<{
    name: string;
    type: "string" | "number" | "boolean";
    required: boolean;
    label: string;
  }>;
}

interface AddInventoryModalProps {
  onClose: () => void;
  productId?: string;
}

export function AddInventoryModal({ onClose, productId }: AddInventoryModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(productId || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [inventoryItems, setInventoryItems] = useState<Record<string, unknown>[]>([]);
  const [currentItem, setCurrentItem] = useState<Record<string, unknown>>({});
  const [bulkText, setBulkText] = useState("");

  // Selected template's schema
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    async function loadData() {
      try {
        const [productsRes, templatesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/inventory/templates"),
        ]);

        const productsResult = await productsRes.json();
        const templatesResult = await templatesRes.json();

        if (productsResult.success) {
          setProducts(productsResult.data);
        }
        if (templatesResult.success) {
          setTemplates(templatesResult.data);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // When product changes, update template if product has one
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      // We would need to fetch product details to get inventoryTemplateId
      // For now, let user select template manually
    }
  }, [selectedProductId, products]);

  const updateCurrentItemField = (fieldName: string, value: string | number | boolean) => {
    setCurrentItem({ ...currentItem, [fieldName]: value });
  };

  const addItem = () => {
    if (selectedTemplate) {
      // Validate required fields
      const missing = selectedTemplate.fieldsSchema
        .filter((f) => f.required && !currentItem[f.name])
        .map((f) => f.label);

      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(", ")}`);
        return;
      }

      setInventoryItems([...inventoryItems, { ...currentItem }]);
      setCurrentItem({});
      setError(null);
    }
  };

  const removeItem = (index: number) => {
    setInventoryItems(inventoryItems.filter((_, i) => i !== index));
  };

  const handleBulkSubmit = () => {
    if (!selectedTemplate || !bulkText.trim()) return;

    const lines = bulkText.split("\n").filter((line) => line.trim());
    const parsedItems: Record<string, unknown>[] = [];

    lines.forEach((line) => {
      const values: Record<string, unknown> = {};
      const parts = line.split(",").map((p) => p.trim());

      selectedTemplate.fieldsSchema.forEach((field, index) => {
        if (index < parts.length) {
          const value = parts[index];
          if (field.type === "number") {
            values[field.name] = parseFloat(value);
          } else if (field.type === "boolean") {
            values[field.name] = value.toLowerCase() === "true";
          } else {
            values[field.name] = value;
          }
        }
      });

      parsedItems.push(values);
    });

    setInventoryItems([...inventoryItems, ...parsedItems]);
    setBulkText("");
  };

  const handleSubmit = async () => {
    if (!selectedProductId || inventoryItems.length === 0) {
      setError("Please select a product and add at least one inventory item");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          items: inventoryItems,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error || "Failed to add inventory");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Inventory Items</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <h3 className="text-lg font-semibold text-white mb-2">Inventory Added Successfully!</h3>
              <p className="text-slate-400">{inventoryItems.length} items have been added.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
                  {error}
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={!!productId}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-850"
                >
                  <option value="">Select a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Inventory Template *
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  {/* Tabs for Single vs Bulk */}
                  <div className="border-b border-slate-800">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setBulkText("")}
                        className="px-4 py-2 border-b-2 border-blue-500 text-blue-400 font-medium"
                      >
                        Single Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentItem({})}
                        className="px-4 py-2 text-slate-400 hover:text-slate-200"
                      >
                        Bulk Import (CSV)
                      </button>
                    </div>
                  </div>

                  {/* Single Item Form */}
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Add Single Item
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.fieldsSchema.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {field.type === "boolean" ? (
                            <select
                              value={String(currentItem[field.name] ?? "")}
                              onChange={(e) =>
                                updateCurrentItemField(field.name, e.target.value === "true")
                              }
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : field.type === "number" ? (
                            <input
                              type="number"
                              value={String(currentItem[field.name] ?? "")}
                              onChange={(e) =>
                                updateCurrentItemField(field.name, parseFloat(e.target.value))
                              }
                              required={field.required}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(currentItem[field.name] ?? "")}
                              onChange={(e) => updateCurrentItemField(field.name, e.target.value)}
                              required={field.required}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="mt-4 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
                    >
                      + Add to List
                    </button>
                  </div>

                  {/* Bulk Import */}
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Bulk Import (CSV Format)
                    </h3>
                    <p className="text-xs text-slate-500 mb-2">
                      Enter one item per line, comma-separated values in order:{" "}
                      {selectedTemplate.fieldsSchema.map((f) => f.label).join(", ")}
                    </p>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={5}
                      placeholder={`XXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX`}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      className="mt-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
                    >
                      Parse & Add Items
                    </button>
                  </div>

                  {/* Items List */}
                  {inventoryItems.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-2">
                        Items to Add ({inventoryItems.length})
                      </h3>
                      <div className="border border-slate-800 rounded-lg max-h-48 overflow-y-auto bg-slate-800/30">
                        {inventoryItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border-b border-slate-800 last:border-b-0"
                          >
                            <div className="text-sm font-mono text-slate-400">
                              {JSON.stringify(item)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || success}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || success || inventoryItems.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding..." : `Add ${inventoryItems.length} Item${inventoryItems.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
