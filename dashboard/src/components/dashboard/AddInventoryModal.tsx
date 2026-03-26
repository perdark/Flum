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
        <div className="bg-background border border-border rounded-lg p-6 text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Add Inventory Items</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-success text-5xl mb-4">✓</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Inventory Added Successfully!</h3>
              <p className="text-muted-foreground">{inventoryItems.length} items have been added.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
                  {error}
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={!!productId}
                  className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-secondary"
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Inventory Template *
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <div className="border-b border-border">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setBulkText("")}
                        className="px-4 py-2 border-b-2 border-ring text-primary font-medium"
                      >
                        Single Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentItem({})}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground"
                      >
                        Bulk Import (CSV)
                      </button>
                    </div>
                  </div>

                  {/* Single Item Form */}
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Add Single Item
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.fieldsSchema.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </label>
                          {field.type === "boolean" ? (
                            <select
                              value={String(currentItem[field.name] ?? "")}
                              onChange={(e) =>
                                updateCurrentItemField(field.name, e.target.value === "true")
                              }
                              className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
                              className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(currentItem[field.name] ?? "")}
                              onChange={(e) => updateCurrentItemField(field.name, e.target.value)}
                              required={field.required}
                              className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="mt-4 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary"
                    >
                      + Add to List
                    </button>
                  </div>

                  {/* Bulk Import */}
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Bulk Import (CSV Format)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter one item per line, comma-separated values in order:{" "}
                      {selectedTemplate.fieldsSchema.map((f) => f.label).join(", ")}
                    </p>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={5}
                      placeholder={`XXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX`}
                      className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      className="mt-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary"
                    >
                      Parse & Add Items
                    </button>
                  </div>

                  {/* Items List */}
                  {inventoryItems.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2">
                        Items to Add ({inventoryItems.length})
                      </h3>
                      <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-muted/50">
                        {inventoryItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border-b border-border last:border-b-0"
                          >
                            <div className="text-sm font-mono text-muted-foreground">
                              {JSON.stringify(item)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-destructive hover:text-destructive/80 text-sm"
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
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || success}
            className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || success || inventoryItems.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding..." : `Add ${inventoryItems.length} Item${inventoryItems.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
