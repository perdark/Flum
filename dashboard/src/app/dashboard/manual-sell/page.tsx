/**
 * Manual Sell Page
 *
 * Manual sales workflow with shortage handling
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: string;
  stockCount: number;
  templateName: string | null;
  inventoryTemplateId: string | null;
  templateFields?: TemplateField[];
}

interface SellItem {
  productId: string;
  quantity: number;
  productName: string;
  available: number;
}

interface ShortageItem {
  productId: string;
  productName: string;
  requested: number;
  available: number;
  shortage: number;
}

interface AvailabilityCheck {
  hasShortage: boolean;
  shortageItems: ShortageItem[];
  potentialDelivery: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
    canDeliver: number;
    shortage: number;
    subtotalIfPartial: string;
  }>;
  totals: {
    requested: string;
    canDeliver: string;
  };
  options: {
    partial?: string;
    addInventory?: string;
    pending?: string;
    complete?: string;
  };
}

interface OrderResult {
  orderId: string;
  order: any;
  deliveryItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    items: Array<{
      inventoryId: string;
      values: Record<string, string | number | boolean>;
    }>;
  }>;
  shortageItems: ShortageItem[];
  hasShortage: boolean;
}

interface TemplateField {
  name: string;
  type: "string" | "number" | "boolean";
  label: string;
  required: boolean;
}

export default function ManualSellPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellItems, setSellItems] = useState<SellItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [shortageModal, setShortageModal] = useState<{
    show: boolean;
    data: AvailabilityCheck | null;
  }>({ show: false, data: null });

  useEffect(() => {
    fetchProducts();
    fetchTemplates();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/summary?limit=100");
      const data = await res.json();
      if (data.success) {
        // Also fetch template info for each product
        const productsWithTemplates = await Promise.all(
          data.data.map(async (p: any) => {
            // Get template fields
            if (p.inventoryTemplateId) {
              const templateRes = await fetch("/api/inventory/templates");
              const templateData = await templateRes.json();
              if (templateData.success) {
                const template = templateData.data.find((t: any) => t.id === p.inventoryTemplateId);
                return {
                  ...p,
                  templateFields: template?.fieldsSchema || [],
                };
              }
            }
            return { ...p, templateFields: [] };
          })
        );
        setProducts(productsWithTemplates.filter((p: Product) => (p as any).isActive !== false));
      }
    } catch (err) {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/inventory/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error("Failed to load templates");
    }
  };

  const addSellItem = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingIndex = sellItems.findIndex((i) => i.productId === productId);

    if (existingIndex >= 0) {
      const newItems = [...sellItems];
      newItems[existingIndex].quantity += quantity;
      setSellItems(newItems);
    } else {
      setSellItems([
        ...sellItems,
        {
          productId: product.id,
          quantity,
          productName: product.name,
          available: product.stockCount,
        },
      ]);
    }
  };

  const updateSellItemQuantity = (productId: string, quantity: number) => {
    setSellItems(
      sellItems
        .map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeSellItem = (productId: string) => {
    setSellItems(sellItems.filter((item) => item.productId !== productId));
  };

  const checkAvailability = async () => {
    if (sellItems.length === 0) {
      alert("Please add items to sell");
      return null;
    }

    if (!customerEmail) {
      alert("Please enter customer email");
      return null;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/manual-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sellItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerEmail,
          customerName: customerName || undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.action === "check") {
        return data.data;
      } else if (data.success && data.data.orderId) {
        // Sale completed directly (no shortage)
        setOrderResult(data.data);
        return null;
      } else {
        alert(data.error || "Failed to check availability");
        return null;
      }
    } catch (err) {
      alert("Failed to check availability");
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const processSale = async (action?: "partial" | "add-inventory" | "pending", inventoryItemsToAdd?: Array<{ productId: string; values: Record<string, string | number | boolean> }>) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/manual-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sellItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerEmail,
          customerName: customerName || undefined,
          shortageAction: action,
          inventoryItemsToAdd,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOrderResult(data.data);
        setShortageModal({ show: false, data: null });
      } else {
        alert(data.error || "Sale failed");
      }
    } catch (err) {
      alert("Sale failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteSale = async () => {
    const availability = await checkAvailability();
    if (availability) {
      setShortageModal({ show: true, data: availability });
    }
  };

  const resetSale = () => {
    setOrderResult(null);
    setSellItems([]);
    setCustomerEmail("");
    setCustomerName("");
    setShortageModal({ show: false, data: null });
  };

  const viewDelivery = () => {
    if (orderResult) {
      router.push(`/dashboard/manual-sell/${orderResult.orderId}`);
    }
  };

  // Calculate totals
  const totalItems = sellItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = sellItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (parseFloat(product?.price || "0") * item.quantity);
  }, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Manual Sell</h1>
        <p className="text-slate-400 mt-1">
          Process manual sales with shortage handling
        </p>
      </div>

      {orderResult ? (
        <OrderConfirmation
          result={orderResult}
          onReset={resetSale}
          onViewDelivery={viewDelivery}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Products</h2>

              {loading ? (
                <div className="text-center py-8 text-slate-400">Loading products...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {products.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={addSellItem}
                      currentQuantity={
                        sellItems.find((i) => i.productId === product.id)?.quantity || 0
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sale Summary */}
          <div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Sale Summary</h2>

              {/* Customer Info */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Items List */}
              {sellItems.length > 0 ? (
                <>
                  <div className="space-y-2 mb-6">
                    {sellItems.map((item) => {
                      const hasShortage = item.quantity > item.available;
                      return (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-slate-400">
                              Qty: {item.quantity}{" "}
                              {hasShortage && (
                                <span className="text-yellow-400">
                                  (only {item.available} available)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSellItemQuantity(item.productId, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateSellItemQuantity(item.productId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeSellItem(item.productId)}
                              className="ml-2 p-1 text-red-400 hover:text-red-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-slate-700 pt-4 mb-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>Total Items:</span>
                      <span className="text-white">{totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Value:</span>
                      <span className="text-xl font-bold text-white">
                        ${totalValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleCompleteSale}
                    disabled={processing || sellItems.length === 0}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Complete Sale"}
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  No items added yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shortage Options Modal */}
      {shortageModal.show && shortageModal.data && (
        <ShortageOptionsModal
          data={shortageModal.data}
          onClose={() => setShortageModal({ show: false, data: null })}
          onPartialSale={() => processSale("partial")}
          onPendingSale={() => processSale("pending")}
          onAddInventory={(inventory) => processSale("add-inventory", inventory)}
          products={products}
          templates={templates}
        />
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  onAdd,
  currentQuantity,
}: {
  product: Product;
  onAdd: (productId: string, quantity: number) => void;
  currentQuantity: number;
}) {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    onAdd(product.id, quantity);
    setQuantity(1);
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-white truncate flex-1">{product.name}</h3>
        <span className="text-sm text-green-400 ml-2">{product.stockCount} avail</span>
      </div>
      <p className="text-lg font-bold text-white mb-3">${product.price}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-center"
        />
        <button
          onClick={handleAdd}
          className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Add
        </button>
      </div>
      {currentQuantity > 0 && (
        <div className="mt-2 text-xs text-slate-400">
          In cart: {currentQuantity}
        </div>
      )}
    </div>
  );
}

// Order Confirmation Component
function OrderConfirmation({
  result,
  onReset,
  onViewDelivery,
}: {
  result: OrderResult;
  onReset: () => void;
  onViewDelivery: () => void;
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {result.hasShortage ? "Sale Processed with Shortage" : "Sale Completed!"}
        </h2>
        <p className="text-slate-400">Order ID: {result.orderId}</p>
      </div>

      {/* Shortage Warning */}
      {result.hasShortage && result.shortageItems.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h3 className="font-medium text-yellow-400 mb-2">Shortage Detected</h3>
          <ul className="text-sm text-yellow-200/80">
            {result.shortageItems.map((item) => (
              <li key={item.productId}>
                {item.productName}: {item.shortage} items short
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delivered Items */}
      <div className="mb-6">
        <h3 className="font-medium text-white mb-3">Delivered Items</h3>
        <div className="space-y-2">
          {result.deliveryItems.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm p-2 bg-slate-900 rounded">
              <span className="text-white">{item.productName}</span>
              <span className="text-green-400">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
        >
          New Sale
        </button>
        <button
          onClick={onViewDelivery}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          View Delivery
        </button>
      </div>
    </div>
  );
}

// Shortage Options Modal Component
function ShortageOptionsModal({
  data,
  onClose,
  onPartialSale,
  onPendingSale,
  onAddInventory,
  products,
  templates,
}: {
  data: AvailabilityCheck;
  onClose: () => void;
  onPartialSale: () => void;
  onPendingSale: () => void;
  onAddInventory: (inventory: Array<{ productId: string; values: Record<string, string | number | boolean> }>) => void;
  products: Product[];
  templates: any[];
}) {
  const [activeTab, setActiveTab] = useState<"partial" | "pending" | "add">("partial");
  const [inventoryItems, setInventoryItems] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Get product template fields
  const getProductTemplateFields = (productId: string): TemplateField[] => {
    const product = products.find((p: any) => p.id === productId);
    if (product?.templateFields && product.templateFields.length > 0) {
      return product.templateFields;
    }
    // Fallback to template lookup
    if (product?.inventoryTemplateId) {
      const template = templates.find((t: any) => t.id === product.inventoryTemplateId);
      return template?.fieldsSchema || [];
    }
    return [{ name: "key", type: "string", label: "Key", required: true }];
  };

  const handleAddInventory = async () => {
    // Parse inventory items into array format
    const parsedInventory: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];

    for (const shortageItem of data.shortageItems) {
      const itemsText = inventoryItems[shortageItem.productId];
      if (!itemsText || itemsText.trim().length === 0) {
        alert(`Please add inventory for ${shortageItem.productName}`);
        return;
      }

      const templateFields = getProductTemplateFields(shortageItem.productId);
      const lines = itemsText.trim().split("\n").map(l => l.trim()).filter(l => l);

      if (lines.length === 0) {
        alert(`Please add at least one item for ${shortageItem.productName}`);
        return;
      }

      // Parse each line as a separate inventory item
      for (const line of lines) {
        const values = line.split(",").map(v => v.trim());
        const itemObj: Record<string, string | number | boolean> = {};
        templateFields.forEach((field, index) => {
          const value = values[index] || "";
          if (field.type === "number") {
            itemObj[field.name] = parseFloat(value) || 0;
          } else if (field.type === "boolean") {
            itemObj[field.name] = value.toLowerCase() === "true" || value === "1";
          } else {
            itemObj[field.name] = value;
          }
        });
        parsedInventory.push({
          productId: shortageItem.productId,
          values: itemObj
        });
      }
    }

    if (parsedInventory.length === 0) {
      alert("Please add at least one inventory item");
      return;
    }

    setSubmitting(true);
    try {
      onAddInventory(parsedInventory);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Inventory Shortage</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortage Summary */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-sm">
              Some items are out of stock. You have:
            </p>
            <ul className="mt-2 space-y-1">
              {data.shortageItems.map((item) => (
                <li key={item.productId} className="text-yellow-200 text-sm">
                  <strong>{item.productName}</strong>: {item.available} of {item.requested} requested ({item.shortage} short)
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-yellow-500/20 text-sm">
              <p>Total requested: <span className="text-white font-medium">${data.totals.requested}</span></p>
              <p>Can deliver now: <span className="text-green-400 font-medium">${data.totals.canDeliver}</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab("partial")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "partial"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sell What You Have
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "add"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Add Inventory
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pending Order
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "partial" && (
            <div>
              <h3 className="text-white font-medium mb-3">Sell Available Items Only</h3>
              <p className="text-slate-400 text-sm mb-4">
                Complete the sale with only the items currently available. The order will be marked as completed.
              </p>
              <div className="space-y-2 mb-4">
                {data.potentialDelivery.map((item) => (
                  <div key={item.productId} className="flex justify-between p-3 bg-slate-900 rounded">
                    <span className="text-white">{item.productName}</span>
                    <span className="text-green-400">{item.canDeliver} / {item.requested}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-900 rounded text-sm">
                <span className="text-slate-400">Total will be: </span>
                <span className="text-white font-medium">${data.totals.canDeliver}</span>
              </div>
            </div>
          )}

          {activeTab === "add" && (
            <div>
              <h3 className="text-white font-medium mb-3">Add Missing Inventory</h3>
              <p className="text-slate-400 text-sm mb-4">
                Add inventory items now using the same format as the inventory page. Enter one item per line with comma-separated values.
              </p>
              <div className="space-y-4">
                {data.shortageItems.map((item) => {
                  const templateFields = getProductTemplateFields(item.productId);
                  return (
                    <div key={item.productId} className="p-4 bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{item.productName}</span>
                        <span className="text-slate-400 text-sm">Need: {item.shortage}</span>
                      </div>

                      {/* Template fields info */}
                      {templateFields.length > 0 && (
                        <div className="mb-2 p-2 bg-slate-800 rounded text-xs">
                          <span className="text-slate-400">Fields: </span>
                          {templateFields.map((f, i) => (
                            <span key={f.name} className="inline-block mr-2">
                              <span className="text-blue-400">{f.name}</span>
                              {f.required && <span className="text-red-400">*</span>}
                              {i < templateFields.length - 1 && <span className="text-slate-500">, </span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={inventoryItems[item.productId] || ""}
                        onChange={(e) => setInventoryItems(prev => ({
                          ...prev,
                          [item.productId]: e.target.value
                        }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        rows={5}
                        placeholder={`Enter items (one per line)&#10;Example: ${templateFields.map(f => f.name).join(", ")}&#10;${templateFields.map(() => "XXX").join(", ")}`}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        One item per line, values separated by commas. You can add more than {item.shortage} items - extras will be available for future sales.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div>
              <h3 className="text-white font-medium mb-3">Create Pending Order</h3>
              <p className="text-slate-400 text-sm mb-4">
                Create an order with the available items now. The missing items will be marked as pending and can be fulfilled later from the Orders page.
              </p>
              <div className="space-y-2 mb-4">
                {data.potentialDelivery.map((item) => (
                  <div key={item.productId} className="flex justify-between p-3 bg-slate-900 rounded">
                    <div>
                      <span className="text-white">{item.productName}</span>
                      {item.shortage > 0 && (
                        <span className="ml-2 text-yellow-400 text-sm">({item.shortage} pending)</span>
                      )}
                    </div>
                    <span className="text-green-400">{item.canDeliver} delivered</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200">
                You can fulfill pending items later from the Orders page. Click the "Processing" button on the order to add items and complete it.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex-1" />
          {activeTab === "partial" && (
            <button
              onClick={onPartialSale}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Sell ${data.totals.canDeliver} Worth
            </button>
          )}
          {activeTab === "add" && (
            <button
              onClick={handleAddInventory}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add & Complete Sale"}
            </button>
          )}
          {activeTab === "pending" && (
            <button
              onClick={onPendingSale}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
            >
              Create Pending Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
