/**
 * Manual Sell Page — POS-style Interface
 *
 * Three sections: Stocks | Products (Auto) | Products (Manual)
 * Stocks groups products by inventory template for stock-centric selling.
 * Virtualized lists handle 100+ items efficiently.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface Variant {
  id: string;
  optionCombination: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  stockCount: number;
  isDefault: boolean;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  basePrice: string;
  price?: string;
  isActive?: boolean;
  stockCount: number;
  availableCount: number;
  deliveryType: string;
  inventoryTemplateId: string | null;
  templateName?: string | null;
  fieldsSchema?: any;
  isBundle: boolean;
  variants?: Variant[];
}

interface CategoryOption {
  id: string;
  name: string;
}

interface CartItem {
  productId: string;
  productName: string;
  variantId: string | null;
  variantLabel: string | null;
  price: number;
  quantity: number;
  available: number;
  deliveryType: string;
}

interface ShortageInfo {
  productId: string;
  productName: string;
  requested: number;
  available: number;
  shortage: number;
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
  shortageItems?: ShortageInfo[];
  hasShortage: boolean;
}

type TabKey = "stocks" | "auto" | "manual";

interface InventoryItem {
  id: string;
  values: Record<string, string | number | boolean>;
  status: string;
  productId: string | null;
  productName: string | null;
  templateId: string | null;
  createdAt: string;
}

interface InventoryGroup {
  groupId: string;        // productId or "__unlinked__"
  groupName: string;      // product name or "Unlinked"
  productId: string | null;
  items: InventoryItem[];
}

const PAGE_SIZE = 80;

function flattenCategoryTree(nodes: unknown[], prefix = "", depth = 0): CategoryOption[] {
  const out: CategoryOption[] = [];
  for (const node of nodes as Array<{ id: string; name: string; children?: unknown[] }>) {
    out.push({ id: node.id, name: prefix + node.name });
    if (node.children && node.children.length > 0) {
      out.push(...flattenCategoryTree(node.children, prefix + node.name + " / ", depth + 1));
    }
  }
  return out;
}

function productPrice(p: Product): string {
  return p.basePrice ?? p.price ?? "0";
}

// ============================================================================
// Main Page
// ============================================================================

export default function ManualSellPage() {
  const searchRef = useRef<HTMLInputElement>(null);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("stocks");
  const [pickingVariantFor, setPickingVariantFor] = useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState<"retail" | "merchant">("retail");
  const [processing, setProcessing] = useState(false);

  const [shortageData, setShortageData] = useState<{
    items: ShortageInfo[];
    potentialDelivery: any[];
  } | null>(null);

  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories?asTree=true");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(flattenCategoryTree(data.data));
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  // "/" hotkey focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const normalizeRows = (rows: unknown[]): Product[] =>
    (rows as Product[])
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        ...p,
        basePrice: String(p.basePrice ?? p.price ?? "0"),
        deliveryType: p.deliveryType ?? "auto",
      }));

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: "0",
        isActive: "true",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/products/summary?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error("bad response");
      setAllProducts(normalizeRows(data.data));
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch {
      toast.error("Failed to load catalog");
      setAllProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(allProducts.length),
        isActive: "true",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/products/summary?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error("bad response");
      const next = normalizeRows(data.data);
      setAllProducts((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch {
      toast.error("Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, allProducts.length, debouncedSearch, categoryId]);

  // ── Split products into sections ──────────────────────────────────────────

  const { productsById, autoProducts, manualProducts } = useMemo(() => {
    const byId = new Map<string, Product>();
    const auto: Product[] = [];
    const manual: Product[] = [];

    for (const p of allProducts) {
      byId.set(p.id, p);
      if (p.inventoryTemplateId) {
        auto.push(p);
      } else {
        manual.push(p);
      }
    }

    return { productsById: byId, autoProducts: auto, manualProducts: manual };
  }, [allProducts]);

  // stocks tab count is driven by StocksTab's own fetch; use a ref to track it
  const [stocksCount, setStocksCount] = useState(0);

  const tabCounts: Record<TabKey, number> = {
    stocks: stocksCount,
    auto: autoProducts.length,
    manual: manualProducts.length,
  };

  // ── Add to cart ───────────────────────────────────────────────────────────

  const addToCart = useCallback((product: Product, variant: Variant | null, qty = 1) => {
    const variantId = variant?.id || null;
    const variantLabel = variant && Object.keys(variant.optionCombination).length > 0
      ? Object.values(variant.optionCombination).join(" / ")
      : null;
    const price = variant ? parseFloat(variant.price) : parseFloat(productPrice(product));
    const available = variant ? variant.stockCount : product.availableCount;
    const safeQty = Math.max(1, qty);

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.productId === product.id && ci.variantId === variantId
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + safeQty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          variantId,
          variantLabel,
          price,
          quantity: safeQty,
          available: product.deliveryType === "manual" ? 999 : available,
          deliveryType: product.deliveryType,
        },
      ];
    });
    setPickingVariantFor(null);
  }, []);

  const handleProductClick = useCallback(async (product: Product, qty = 1) => {
    try {
      const res = await fetch(`/api/products/${product.id}/variants`);
      const data = await res.json();
      if (data.success && data.data.length > 1) {
        setPickingVariantFor({ ...product, variants: data.data.filter((v: Variant) => v.isActive) });
        return;
      }
      const defaultVariant = data.data?.[0] || null;
      addToCart(product, defaultVariant, qty);
    } catch {
      addToCart(product, null, qty);
    }
  }, [addToCart]);

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, quantity: qty } : ci)));
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalItems = cart.reduce((s, ci) => s + ci.quantity, 0);
  const totalPrice = cart.reduce((s, ci) => s + ci.price * ci.quantity, 0);

  // ── Checkout ──────────────────────────────────────────────────────────────

  const handleCheckout = async (shortageAction?: "partial" | "pending") => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!customerEmail) return toast.error("Customer email is required");

    setProcessing(true);
    setShortageData(null);

    try {
      const res = await fetch("/api/manual-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((ci) => ({
            productId: ci.productId,
            quantity: ci.quantity,
            variantId: ci.variantId,
          })),
          customerEmail,
          customerName: customerName || undefined,
          customerType,
          shortageAction,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Sale failed");
        return;
      }

      if (data.action === "check" && data.data?.hasShortage) {
        setShortageData({
          items: data.data.shortageItems,
          potentialDelivery: data.data.potentialDelivery,
        });
        return;
      }

      if (data.data?.orderId) {
        setOrderResult(data.data);
        toast.success("Sale completed!");
      }
    } catch {
      toast.error("Sale failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetSale = () => {
    setOrderResult(null);
    setShortageData(null);
    setCart([]);
    setCustomerEmail("");
    setCustomerName("");
    setSearchInput("");
    setDebouncedSearch("");
    void loadInitial();
    searchRef.current?.focus();
  };

  // ── Render: Order result ──────────────────────────────────────────────────

  if (orderResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <OrderConfirmation result={orderResult} onReset={resetSale} />
      </div>
    );
  }

  // ── Render: Main layout ───────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string }[] = [
    { key: "stocks", label: "Stocks" },
    { key: "auto", label: "Products (Auto)" },
    { key: "manual", label: "Products (Manual)" },
  ];

  return (
    <div className="mx-auto max-w-[1920px] space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-900 to-primary/30 p-5 text-white shadow-xl sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_50%)] pointer-events-none" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Point of sale</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manual Sell</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Stocks &amp; products &mdash; built for large catalogs.{" "}
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">/</kbd>{" "}
              focuses search.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium tabular-nums">
              {allProducts.length} loaded
            </span>
            <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium tabular-nums">
              {totalItems} in cart
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_min(380px,100%)] xl:items-start">
        {/* Catalog Panel */}
        <div className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card staff-card-elevated sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 p-3">
            <div className="relative min-w-[200px] flex-1">
              <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                id="product-search"
                ref={searchRef}
                type="search"
                autoComplete="off"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, SKU, or slug…"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:min-w-[200px]"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadInitial()}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] font-bold tabular-nums rounded-full bg-muted px-1.5 py-0.5">
                  {tabCounts[tab.key]}
                </span>
                {activeTab === tab.key && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-hidden rounded-b-2xl border border-t-0 border-border bg-card">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Loading catalog…</span>
              </div>
            ) : activeTab === "stocks" ? (
              <StocksTab
                productsById={productsById}
                onAdd={(product, qty) => handleProductClick(product, qty)}
                onCountChange={setStocksCount}
              />
            ) : activeTab === "auto" ? (
              <ProductListTab
                products={autoProducts}
                onProductClick={handleProductClick}
                emptyMessage="No products with inventory templates"
              />
            ) : (
              <ProductListTab
                products={manualProducts}
                onProductClick={handleProductClick}
                emptyMessage="No manual delivery products"
              />
            )}

            {hasMore && !loading && (
              <div className="border-t border-border bg-muted/20 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : `Load more (${PAGE_SIZE} per page)`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-5 shadow-lg shadow-black/5 dark:shadow-black/30 lg:sticky lg:top-28 flex flex-col max-h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Cart</h2>
              {cart.length > 0 && (
                <span className="text-xs font-semibold tabular-nums rounded-full bg-primary/10 text-primary px-2.5 py-2 text-center">
                  {totalItems}
                </span>
              )}
            </div>

            {/* Customer */}
            <div className="space-y-3 mb-5">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Customer email *"
                className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as "retail" | "merchant")}
                className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="retail">Retail</option>
                <option value="merchant">Merchant (Wholesale)</option>
              </select>
            </div>

            {/* Cart Items */}
            {cart.length > 0 ? (
              <>
                <div className="space-y-3 mb-5 flex-1 overflow-y-auto min-h-0">
                  {cart.map((ci, idx) => {
                    const hasShortage = ci.deliveryType !== "manual" && ci.quantity > ci.available;
                    return (
                      <div key={`${ci.productId}-${ci.variantId}`} className="p-3 rounded-xl bg-muted/60 border border-border/80">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {ci.productName}
                            </p>
                            {ci.variantLabel && (
                              <p className="text-xs text-muted-foreground mt-0.5">{ci.variantLabel}</p>
                            )}
                            {hasShortage && (
                              <p className="text-xs text-warning mt-1 font-medium">
                                Only {ci.available} available
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                            aria-label="Remove line"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(ci.price * ci.quantity)}
                          </span>
                          <div className="flex items-center rounded-lg overflow-hidden border border-input bg-card">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, ci.quantity - 1)}
                              className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-muted text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="w-10 h-9 flex items-center justify-center text-foreground text-sm font-semibold tabular-nums border-x border-input">
                              {ci.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, ci.quantity + 1)}
                              className="w-9 h-9 flex items-center justify-center text-foreground hover:bg-muted text-lg leading-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-4 mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Line items</span>
                    <span className="text-foreground font-medium tabular-nums">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Checkout */}
                <button
                  type="button"
                  onClick={() => handleCheckout()}
                  disabled={processing}
                  className="w-full min-h-[52px] py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {processing ? "Processing…" : "Complete sale"}
                </button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-muted/20">
                <p className="font-medium text-foreground/80 mb-1">Cart is empty</p>
                <p>Search and tap products to add lines</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variant Picker Modal */}
      {pickingVariantFor && (
        <VariantPickerModal
          product={pickingVariantFor}
          onSelect={(variant) => addToCart(pickingVariantFor, variant)}
          onClose={() => setPickingVariantFor(null)}
        />
      )}

      {/* Shortage Modal */}
      {shortageData && (
        <ShortageModal
          data={shortageData}
          processing={processing}
          onSellAvailable={() => handleCheckout("partial")}
          onCreatePending={() => handleCheckout("pending")}
          onCancel={() => setShortageData(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Stocks Tab — actual inventory items grouped by product, with qty picker
// ============================================================================

function StocksTab({
  productsById,
  onAdd,
  onCountChange,
}: {
  productsById: Map<string, Product>;
  onAdd: (product: Product, qty: number) => void;
  onCountChange: (n: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Per-group quantity state: groupId → qty
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const getQty = (groupId: string) => qtys[groupId] ?? 1;
  const setQty = (groupId: string, val: number) =>
    setQtys((prev) => ({ ...prev, [groupId]: Math.max(1, val) }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory?status=available&limit=500&page=1");
      const data = await res.json();
      if (!data.success) throw new Error("bad response");

      const items: InventoryItem[] = data.data;

      const map = new Map<string, InventoryGroup>();
      for (const item of items) {
        const key = item.productId ?? "__unlinked__";
        const name = item.productName ?? "Unlinked";
        if (!map.has(key)) {
          map.set(key, { groupId: key, groupName: name, productId: item.productId, items: [] });
        }
        map.get(key)!.items.push(item);
      }

      const sorted = Array.from(map.values()).sort((a, b) => {
        if (a.groupId === "__unlinked__") return 1;
        if (b.groupId === "__unlinked__") return -1;
        return a.groupName.localeCompare(b.groupName);
      });

      setGroups(sorted);
      onCountChange(items.length);
    } catch {
      toast.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const vals = Object.values(item.values).map((v) => String(v).toLowerCase());
          return g.groupName.toLowerCase().includes(q) || vals.some((v) => v.includes(q));
        }),
      }))
      .filter((g) => g.items.length > 0 || g.groupName.toLowerCase().includes(q));
  }, [groups, search]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading stocks…</span>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, value, or name…"
          className="flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button type="button" onClick={load} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          {search ? "No stocks match your search" : "No available stock items"}
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[min(65vh,700px)] min-h-[240px] overflow-auto">
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((vRow) => {
              const group = filtered[vRow.index];
              if (!group) return null;
              const isExpanded = expandedId === group.groupId;
              const linkedProduct = group.productId ? productsById.get(group.productId) : undefined;
              const qty = getQty(group.groupId);
              const maxQty = group.items.length;

              return (
                <div
                  key={group.groupId}
                  data-index={vRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full border-b border-border/60"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    {/* Expand toggle + name */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : group.groupId)}
                      className="flex flex-1 min-w-0 items-center gap-2 text-left"
                    >
                      <svg
                        className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          group.groupId === "__unlinked__" ? "text-warning" : "text-foreground"
                        )}>
                          {group.groupName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {maxQty} available{linkedProduct ? ` · ${formatCurrency(productPrice(linkedProduct))}` : ""}
                        </p>
                      </div>
                    </button>

                    {/* Qty picker + Add — only for linked products */}
                    {linkedProduct ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setQty(group.groupId, qty - 1)}
                            disabled={qty <= 1}
                            className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 text-base leading-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={qty}
                            onChange={(e) => setQty(group.groupId, parseInt(e.target.value) || 1)}
                            className="w-10 h-8 text-center text-sm font-semibold tabular-nums bg-transparent text-foreground border-x border-input focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(group.groupId, qty + 1)}
                            disabled={qty >= maxQty}
                            className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 text-base leading-none"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAdd(linkedProduct, qty)}
                          className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow hover:bg-primary/90 whitespace-nowrap"
                        >
                          Add {qty > 1 ? `×${qty}` : ""}
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                        Not linked
                      </span>
                    )}
                  </div>

                  {/* Expanded: individual stock items with field values */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t border-border/40">
                      {group.items.map((item, i) => {
                        const fieldEntries = Object.entries(item.values).filter(([k]) => k !== "_metadata");
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 border-b border-border/25 px-4 py-2 pl-9 last:border-b-0"
                          >
                            <span className="w-5 shrink-0 text-[10px] text-muted-foreground tabular-nums text-right">
                              {i + 1}.
                            </span>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 flex-1 min-w-0">
                              {fieldEntries.map(([k, v]) => (
                                <span key={k} className="text-[11px] font-mono">
                                  <span className="text-muted-foreground">{k}: </span>
                                  <span className="font-bold text-foreground">{String(v)}</span>
                                </span>
                              ))}
                              {fieldEntries.length === 0 && (
                                <span className="text-[11px] text-muted-foreground italic">No fields</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Product List Tab — virtualized table for auto/manual products
// ============================================================================

function ProductListTab({
  products,
  onProductClick,
  emptyMessage,
}: {
  products: Product[];
  onProductClick: (p: Product) => void;
  emptyMessage: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 46,
    overscan: 16,
  });

  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const stockLabel = (p: Product) => {
    if (p.isBundle) return "Bundle";
    if (p.deliveryType === "manual") return "Manual";
    return String(p.availableCount);
  };

  return (
    <div ref={scrollRef} className="max-h-[min(68vh,720px)] min-h-[280px] overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_72px_80px_72px_76px] items-center gap-1 border-b border-border bg-muted/95 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_88px_80px_72px_76px]">
        <span className="pl-1">Product</span>
        <span className="hidden text-center sm:block">SKU</span>
        <span className="text-right">Price</span>
        <span className="text-right">Stock</span>
        <span className="text-right pr-1"> </span>
      </div>

      <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const product = products[vRow.index];
          if (!product) return null;
          return (
            <div
              key={product.id}
              className="absolute left-0 top-0 grid w-full grid-cols-[minmax(0,1fr)_72px_80px_72px_76px] items-center gap-1 border-b border-border/70 bg-card text-sm hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_88px_80px_72px_76px]"
              style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
            >
              <div className="min-w-0 truncate pl-1 font-medium text-foreground">{product.name}</div>
              <div className="hidden truncate text-center font-mono text-[11px] text-muted-foreground sm:block">
                {product.sku || "—"}
              </div>
              <div className="text-right tabular-nums font-semibold">{formatCurrency(productPrice(product))}</div>
              <div className="text-right text-xs text-muted-foreground tabular-nums">{stockLabel(product)}</div>
              <div className="flex justify-end pr-1">
                <button
                  type="button"
                  onClick={() => onProductClick(product)}
                  className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground shadow hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Variant Picker Modal
// ============================================================================

function VariantPickerModal({
  product,
  onSelect,
  onClose,
}: {
  product: Product & { variants?: Variant[] };
  onSelect: (variant: Variant) => void;
  onClose: () => void;
}) {
  const variants = product.variants || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">Choose a variant:</p>

        <div className="space-y-2">
          {variants.map((variant) => {
            const label = Object.keys(variant.optionCombination).length > 0
              ? Object.entries(variant.optionCombination)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" / ")
              : "Default";

            return (
              <button
                key={variant.id}
                onClick={() => onSelect(variant)}
                className="w-full text-left p-3 bg-muted rounded-lg border border-border hover:border-primary/30 hover:bg-muted/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-sm font-bold text-foreground">${variant.price}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      variant.stockCount > 0
                        ? "bg-success/15 text-success"
                        : "bg-error/15 text-error"
                    }`}
                  >
                    {variant.stockCount} in stock
                  </span>
                  {variant.compareAtPrice && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      ${variant.compareAtPrice}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Shortage Modal
// ============================================================================

function ShortageModal({
  data,
  processing,
  onSellAvailable,
  onCreatePending,
  onCancel,
}: {
  data: { items: ShortageInfo[]; potentialDelivery: any[] };
  processing: boolean;
  onSellAvailable: () => void;
  onCreatePending: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Stock Shortage</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Some items don&apos;t have enough stock:
        </p>

        <div className="space-y-2 mb-6">
          {data.items.map((item) => (
            <div key={item.productId} className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm font-medium text-foreground">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                Requested: {item.requested} &middot; Available: {item.available} &middot;{" "}
                <span className="text-warning">Short: {item.shortage}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button
            onClick={onSellAvailable}
            disabled={processing}
            className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {processing ? "Processing..." : `Sell Available (${data.items.reduce((s, i) => s + i.available, 0)} items)`}
          </button>
          <button
            onClick={onCreatePending}
            disabled={processing}
            className="w-full py-3 bg-warning/20 text-warning hover:bg-warning/30 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {processing ? "Processing..." : "Create Pending Order"}
          </button>
          <button
            onClick={onCancel}
            disabled={processing}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Order Confirmation
// ============================================================================

function OrderConfirmation({
  result,
  onReset,
}: {
  result: OrderResult;
  onReset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {result.hasShortage ? "Order Created (Partial)" : "Sale Completed!"}
        </h2>
        <p className="text-sm text-muted-foreground">Order: {result.orderId.slice(0, 8)}...</p>
      </div>

      {result.hasShortage && result.shortageItems && result.shortageItems.length > 0 && (
        <div className="mb-5 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <h3 className="font-medium text-warning text-sm mb-2">Items short on stock</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {result.shortageItems.map((item: any) => (
              <li key={item.productId}>
                {item.productName}: {item.shortage} short
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.deliveryItems && result.deliveryItems.length > 0 && (
        <div className="mb-5">
          <h3 className="font-medium text-foreground text-sm mb-3">Delivered</h3>
          <div className="space-y-2">
            {result.deliveryItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{item.productName}</span>
                  <span className="text-success font-medium">x{item.quantity}</span>
                </div>
                {item.items.length > 0 && (
                  <div className="text-xs font-mono text-muted-foreground space-y-0.5">
                    {item.items.slice(0, 5).map((ii, i) => (
                      <div key={i} className="truncate">
                        {Object.entries(ii.values)
                          .filter(([k]) => k !== "_metadata")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" | ")}
                      </div>
                    ))}
                    {item.items.length > 5 && (
                      <div className="italic">...and {item.items.length - 5} more</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
        >
          New Sale
        </button>
        <button
          onClick={() => router.push(`/dashboard/manual-sell/${result.orderId}`)}
          className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors"
        >
          View Order
        </button>
      </div>
    </div>
  );
}
