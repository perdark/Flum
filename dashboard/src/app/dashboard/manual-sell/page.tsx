/**
 * Manual Sell Page
 *
 * Manual sales workflow with shortage handling
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: string;
  stockCount: number;
  availableCount: number;
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
  const [newCost, setNewCost] = useState("");
  const [showCostField, setShowCostField] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
      // Fetch enough products so the picker works for ~150 products.
      const res = await fetch("/api/products/summary?limit=500");
      const data = await res.json();
      if (data.success) {
        // Template fields are shipped in /api/products/summary as `fieldsSchema`.
        const productsWithTemplates = data.data.map((p: any) => ({
          ...p,
          templateFields: p.fieldsSchema || [],
        }));
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
          available: (product as any).availableCount || 0,
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
      toast.error("Please add items to sell");
      return null;
    }

    if (!customerEmail) {
      toast.error("Please enter customer email");
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
        toast.error(data.error || "Failed to check availability");
        return null;
      }
    } catch (err) {
      toast.error("Failed to check availability");
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
          newCost: showCostField && newCost ? parseFloat(newCost) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOrderResult(data.data);
        setShortageModal({ show: false, data: null });
      } else {
        toast.error(data.error || "Sale failed");
      }
    } catch (err) {
      toast.error("Sale failed");
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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return <span className="ml-1 text-muted-foreground/40">&uarr;&darr;</span>;
    return <span className="ml-1 text-primary">{sortOrder === "asc" ? "&uarr;" : "&darr;"}</span>;
  };

  const sortedProducts = [...products].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "price":
        cmp = parseFloat(a.price || "0") - parseFloat(b.price || "0");
        break;
      case "stock":
        cmp = (a.availableCount || 0) - (b.availableCount || 0);
        break;
      default:
        cmp = 0;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Manual Sell</h1>
        <p className="text-muted-foreground mt-1">
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
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Select Products</h2>
                <div className="flex items-center gap-1">
                  {(["name", "price", "stock"] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        sortBy === col
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-accent border border-transparent"
                      }`}
                    >
                      {col === "name" ? "Name" : col === "price" ? "Price" : "Stock"}
                      {sortIndicator(col)}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading products...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {sortedProducts.map((product: any) => (
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
            <div className="bg-card rounded-xl border border-border p-6 sticky top-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Sale Summary</h2>

              {/* Customer Info */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* New Cost Override */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCostField}
                    onChange={(e) => setShowCostField(e.target.checked)}
                    className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">Set new cost for this sale</span>
                </label>
                {showCostField && (
                  <div className="mt-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter cost per item"
                    />
                  </div>
                )}
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
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}{" "}
                              {hasShortage && (
                                <span className="text-warning">
                                  (only {item.available} available)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSellItemQuantity(item.productId, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-secondary hover:bg-secondary rounded text-foreground"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateSellItemQuantity(item.productId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-secondary hover:bg-secondary rounded text-foreground"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeSellItem(item.productId)}
                              className="ml-2 p-1 text-destructive hover:text-destructive/80"
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
                  <div className="border-t border-border pt-4 mb-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Total Items:</span>
                      <span className="text-foreground">{totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="text-xl font-bold text-foreground">
                        ${totalValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleCompleteSale}
                    disabled={processing || sellItems.length === 0}
                    className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Complete Sale"}
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
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
          onAddInventory={(inventory, eachLineIsProduct) => processSale("add-inventory", inventory)}
          products={products}
          templates={templates}
          newCost={showCostField && newCost ? parseFloat(newCost) : undefined}
          setNewCost={setNewCost}
          showCostField={showCostField}
          setShowCostField={setShowCostField}
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
    <div className="bg-muted/60 rounded-xl p-4 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-foreground truncate flex-1 text-sm">{product.name}</h3>
        <span className="text-xs font-medium text-success ml-2 bg-success/10 px-2 py-0.5 rounded-full">{(product as any).availableCount || 0} avail</span>
      </div>
      <p className="text-lg font-bold text-foreground mb-3">${product.price}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-2 py-1.5 bg-card border border-input rounded-lg text-foreground text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          className="flex-1 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          Add
        </button>
      </div>
      {currentQuantity > 0 && (
        <div className="mt-2 text-xs text-primary font-medium bg-primary/5 rounded px-2 py-1 text-center">
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
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {result.hasShortage ? "Sale Processed with Shortage" : "Sale Completed!"}
        </h2>
        <p className="text-muted-foreground">Order ID: {result.orderId}</p>
      </div>

      {/* Shortage Warning */}
      {result.hasShortage && result.shortageItems.length > 0 && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <h3 className="font-medium text-warning mb-2">Shortage Detected</h3>
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
        <h3 className="font-medium text-foreground mb-3">Delivered Items</h3>
        <div className="space-y-2">
          {result.deliveryItems.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm p-2 bg-muted rounded">
              <span className="text-foreground">{item.productName}</span>
              <span className="text-success">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-secondary hover:bg-secondary text-foreground font-medium rounded-lg transition-colors"
        >
          New Sale
        </button>
        <button
          onClick={onViewDelivery}
          className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors"
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
  newCost,
  setNewCost,
  showCostField,
  setShowCostField,
}: {
  data: AvailabilityCheck;
  onClose: () => void;
  onPartialSale: () => void;
  onPendingSale: () => void;
  onAddInventory: (inventory: Array<{ productId: string; values: Record<string, string | number | boolean> }>, eachLineIsProduct?: boolean) => void;
  products: Product[];
  templates: any[];
  newCost?: number;
  setNewCost: (cost: string) => void;
  showCostField: boolean;
  setShowCostField: (show: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"partial" | "pending" | "add">("partial");
  // State for field values: Record<productId, Record<fieldName, string>>
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [eachLineIsProduct, setEachLineIsProduct] = useState(false);

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

  // Get parsed lines for a specific field of a product
  const getParsedLines = (productId: string, fieldName: string): string[] => {
    const values = fieldValues[productId]?.[fieldName] || "";
    return values
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
  };

  // Get count for each field of a product
  const getFieldCounts = (productId: string): Record<string, number> => {
    const templateFields = getProductTemplateFields(productId);
    const counts: Record<string, number> = {};
    templateFields.forEach((field) => {
      counts[field.name] = getParsedLines(productId, field.name).length;
    });
    return counts;
  };

  // Calculate total items for a product (min of all field counts)
  const getTotalItems = (productId: string): number => {
    const counts = Object.values(getFieldCounts(productId));
    return counts.length > 0 ? Math.min(...counts) : 0;
  };

  const handleAddInventory = async () => {
    const parsedInventory: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];

    for (const shortageItem of data.shortageItems) {
      const templateFields = getProductTemplateFields(shortageItem.productId);
      const totalItems = getTotalItems(shortageItem.productId);

      if (totalItems === 0) {
        toast.error(`Please add inventory for ${shortageItem.productName}`);
        return;
      }

      // Build items by combining values row by row
      for (let i = 0; i < totalItems; i++) {
        const itemObj: Record<string, string | number | boolean> = {};
        templateFields.forEach((field) => {
          const lines = getParsedLines(shortageItem.productId, field.name);
          const value = lines[i] || "";

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
      toast.error("Please add at least one inventory item");
      return;
    }

    setSubmitting(true);
    try {
      onAddInventory(parsedInventory, eachLineIsProduct);
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize field values for a product if not already set
  const ensureProductFields = (productId: string) => {
    if (!fieldValues[productId]) {
      setFieldValues(prev => ({
        ...prev,
        [productId]: {}
      }));
    }
  };

  // Update field value for a product
  const updateFieldValue = (productId: string, fieldName: string, value: string) => {
    ensureProductFields(productId);
    setFieldValues(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [fieldName]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Inventory Shortage</h2>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortage Summary */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
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
            <div className="mt-3 pt-3 border-t border-warning/30 text-sm">
              <p>Total requested: <span className="text-foreground font-medium">${data.totals.requested}</span></p>
              <p>Can deliver now: <span className="text-success font-medium">${data.totals.canDeliver}</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("partial")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "partial"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sell What You Have
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "add"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add Inventory
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Order
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "partial" && (
            <div>
              <h3 className="text-foreground font-medium mb-3">Sell Available Items Only</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Complete the sale with only the items currently available. The order will be marked as completed.
              </p>
              <div className="space-y-2 mb-4">
                {data.potentialDelivery.map((item) => (
                  <div key={item.productId} className="flex justify-between p-3 bg-muted rounded">
                    <span className="text-foreground">{item.productName}</span>
                    <span className="text-success">{item.canDeliver} / {item.requested}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-muted rounded text-sm">
                <span className="text-muted-foreground">Total will be: </span>
                <span className="text-foreground font-medium">${data.totals.canDeliver}</span>
              </div>
            </div>
          )}

          {activeTab === "add" && (
            <div>
              <h3 className="text-foreground font-medium mb-3">Add Missing Inventory</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add inventory items now. Enter values for each field (one value per line). Items will be created by combining values in order.
              </p>
              <div className="space-y-6">
                {data.shortageItems.map((item) => {
                  const templateFields = getProductTemplateFields(item.productId);
                  const fieldCounts = getFieldCounts(item.productId);
                  const totalItems = getTotalItems(item.productId);
                  const counts = Object.values(fieldCounts);
                  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
                  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
                  const hasMismatch = minCount > 0 && maxCount > minCount;

                  return (
                    <div key={item.productId} className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-foreground font-medium">{item.productName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm">Need: {item.shortage}</span>
                          {totalItems > 0 && (
                            <span className="text-success text-sm">Will add: {totalItems}</span>
                          )}
                        </div>
                      </div>

                      {templateFields.length === 0 ? (
                        <div className="p-3 bg-muted rounded border border-border text-muted-foreground text-sm">
                          No template fields configured for this product.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templateFields.map((field) => (
                            <div key={field.name}>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                {field.label || field.name}
                                {field.required && <span className="text-destructive"> *</span>}
                                <span className="text-muted-foreground font-normal ml-2">
                                  ({fieldCounts[field.name]} {fieldCounts[field.name] === 1 ? 'line' : 'lines'})
                                </span>
                              </label>
                              <textarea
                                value={fieldValues[item.productId]?.[field.name] || ""}
                                onChange={(e) => updateFieldValue(item.productId, field.name, e.target.value)}
                                className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                                rows={5}
                                placeholder={`Enter one value per line\nExample:\nABC\nFVB`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warning for mismatched counts */}
                      {hasMismatch && (
                        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                          <p className="text-yellow-200 text-sm">
                            Only the first <strong>{minCount}</strong> items will be created (some fields have fewer values).
                          </p>
                        </div>
                      )}

                      {/* Preview */}
                      {totalItems > 0 && templateFields.length > 0 && (
                        <div className="mt-4 p-3 bg-muted rounded border border-border">
                          <p className="text-xs text-muted-foreground mb-2">Preview (first 3 items):</p>
                          <div className="space-y-1">
                            {Array.from({ length: Math.min(3, totalItems) }).map((_, i) => (
                              <div key={i} className="text-xs font-mono text-foreground">
                                {templateFields.map((f) => {
                                  const lines = getParsedLines(item.productId, f.name);
                                  return lines[i] || "-";
                                }).join(" → ")}
                              </div>
                            ))}
                            {totalItems > 3 && (
                              <div className="text-xs text-muted-foreground italic">
                                ... and {totalItems - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div>
              <h3 className="text-foreground font-medium mb-3">Create Pending Order</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create an order with the available items now. The missing items will be marked as pending and can be fulfilled later from the Orders page.
              </p>
              <div className="space-y-2 mb-4">
                {data.potentialDelivery.map((item) => (
                  <div key={item.productId} className="flex justify-between p-3 bg-muted rounded">
                    <div>
                      <span className="text-foreground">{item.productName}</span>
                      {item.shortage > 0 && (
                        <span className="ml-2 text-warning text-sm">({item.shortage} pending)</span>
                      )}
                    </div>
                    <span className="text-success">{item.canDeliver} delivered</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-info/10 border border-info/30 rounded text-sm text-primary">
                You can fulfill pending items later from the Orders page. Click the "Processing" button on the order to add items and complete it.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          {/* Options */}
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCostField}
                onChange={(e) => setShowCostField(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Set new cost for this sale</span>
            </label>
            {showCostField && (
              <input
                type="number"
                step="0.01"
                value={newCost ?? ""}
                onChange={(e) => setNewCost(e.target.value)}
                className="px-3 py-1 bg-muted border border-input rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Cost per item"
              />
            )}
            {activeTab === "add" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eachLineIsProduct}
                  onChange={(e) => setEachLineIsProduct(e.target.checked)}
                  className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">Each line is a separate product</span>
              </label>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex-1" />
            {activeTab === "partial" && (
            <button
              onClick={onPartialSale}
              className="px-6 py-2 bg-success text-foreground hover:bg-success/90 rounded-lg transition-colors font-medium"
            >
              Sell ${data.totals.canDeliver} Worth
            </button>
            )}
            {activeTab === "add" && (
            <button
              onClick={handleAddInventory}
              disabled={submitting}
              className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {submitting ? "Adding..." : `Add ${data.shortageItems.reduce((sum, item) => sum + getTotalItems(item.productId), 0)} Items & Complete Sale`}
            </button>
            )}
            {activeTab === "pending" && (
            <button
              onClick={onPendingSale}
              className="px-6 py-2 bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg transition-colors font-medium"
            >
              Create Pending Order
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
