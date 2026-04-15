/**
 * Manual Sell Page — POS-style Interface
 *
 * Inventory products (catalog SKUs): one card per SKU → add to cart → FIFO reserve per product.
 * Checkout: stock-only → /api/manual-sell/template (requires catalogItemId when template has SKUs).
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { summarizeInventoryValues } from "@/lib/inventoryLineSummary";
import {
  countCodesInRowWithSchema,
  getTemplateFieldsForCodes,
  listAtomicCodesForField,
  type FieldSchemaForCodes,
} from "@/lib/inventoryCodes";
import {
  Package,
  Clock,
  Eye,
  ChevronDown,
  Plus,
  RefreshCw,
  ListChecks,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

interface CartInventoryPreviewLine {
  inventoryId: string;
  fieldSummaries: { fieldLabel: string; value: string }[];
  flatPreview: string;
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
  /** Product rows linked to an inventory template (auto-delivery) */
  trackInventory?: boolean;
  fieldsSchema?: Array<{ name: string; label?: string; type?: string }>;
  inventoryIds?: string[];
  inventoryPreview?: CartInventoryPreviewLine[];
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
  /** Set when checkout used /api/manual-sell/template (no product lines) */
  stockLinesSold?: number;
  /** Customer-facing total for the whole stock-only checkout (may span multiple orders) */
  stockSaleGrandTotal?: number;
  /** How many template groups were sold (one order per group) */
  stockTemplateOrderCount?: number;
}

type TabKey = "stocks" | "auto" | "manual";

interface InventoryPickTarget {
  product: Product;
  variant: Variant | null;
}

interface StockPreviewRow {
  id: string;
  values: Record<string, unknown>;
  cost: number;
}

interface StockCartItem {
  templateId: string;
  templateName: string;
  /** Internal catalog SKU when the template defines inventory products */
  catalogItemId?: string | null;
  catalogItemName?: string | null;
  quantity: number;
  fieldsSchema: Array<{
    name: string;
    label: string;
    type: string;
    wholeFieldIsOneItem?: boolean;
  }>;
  available: number;
  previewRows: StockPreviewRow[];
  /** Rows exclusively held for this cart line (server `reserved`) */
  reservedIds: string[];
}

function stockCartLineKey(sc: Pick<StockCartItem, "templateId" | "catalogItemId">) {
  return `${sc.templateId}\t${sc.catalogItemId ?? ""}`;
}

/** Built from /api/inventory/catalog-products row for cart + reserve APIs */
interface TemplateSellField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  displayOrder: number;
  wholeFieldIsOneItem?: boolean;
}

interface TemplateSellCard {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  stockCount: number;
  codesCount?: number;
  isActive: boolean;
  multiSellEnabled: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
  fieldsSchema: TemplateSellField[];
  catalogItems?: Array<{
    id: string;
    name: string;
    codesCount?: number;
    stockCount?: number;
    availableQty?: number;
  }>;
}

/** GET /api/inventory/catalog-products — used by Stocks tab */
interface InventoryProductSellRow {
  id: string;
  templateId: string;
  templateName: string;
  templateDescription: string | null;
  templateColor: string | null;
  templateIcon: string | null;
  templateIsActive: boolean;
  fieldsSchema: unknown;
  multiSellEnabled: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  codesCount: number;
  stockCount: number;
  /** Bundles sellable (one code per field), from catalog-products */
  availableQty: number;
}

function inventoryProductToTemplateSellCard(row: InventoryProductSellRow): TemplateSellCard {
  const raw = Array.isArray(row.fieldsSchema) ? row.fieldsSchema : [];
  const fieldsSchema: TemplateSellField[] = raw.map((f: Record<string, unknown>) => ({
    name: String(f.name ?? ""),
    label: String(f.label ?? f.name ?? ""),
    type: String(f.type ?? "string"),
    required: Boolean(f.required),
    displayOrder: typeof f.displayOrder === "number" ? f.displayOrder : 0,
    wholeFieldIsOneItem: Boolean(f.wholeFieldIsOneItem),
  }));
  return {
    id: row.templateId,
    name: row.templateName,
    description: row.templateDescription,
    color: row.templateColor,
    icon: row.templateIcon,
    stockCount: row.stockCount,
    codesCount: row.codesCount,
    isActive: Boolean(row.templateIsActive && row.isActive),
    multiSellEnabled: row.multiSellEnabled,
    multiSellMax: row.multiSellMax,
    cooldownEnabled: row.cooldownEnabled,
    cooldownDurationHours: row.cooldownDurationHours,
    fieldsSchema,
  };
}

const PAGE_SIZE = 80;

function placeholderValuesForSchema(
  schema: Array<{ name: string; type?: string }>,
  index: number
): Record<string, string | number | boolean> {
  const suffix = `${Date.now()}-${index}`;
  const o: Record<string, string | number | boolean> = {};
  for (const f of schema) {
    const t = (f.type || "string").toLowerCase();
    if (t === "number") o[f.name] = index + 1;
    else if (t === "boolean") o[f.name] = false;
    else o[f.name] = `POS-${suffix}`.slice(0, 120);
  }
  if (Object.keys(o).length === 0) o._restock = `POS-${suffix}`;
  return o;
}

function buildInventoryItemsToAddFromShortage(
  shortageItems: ShortageInfo[],
  cart: CartItem[]
): Array<{ productId: string; values: Record<string, string | number | boolean> }> {
  const out: Array<{ productId: string; values: Record<string, string | number | boolean> }> = [];
  for (const si of shortageItems) {
    const ci = cart.find((c) => c.productId === si.productId && c.trackInventory);
    const schema = Array.isArray(ci?.fieldsSchema) ? ci.fieldsSchema : [];
    for (let i = 0; i < si.shortage; i++) {
      out.push({
        productId: si.productId,
        values: placeholderValuesForSchema(schema, i),
      });
    }
  }
  return out;
}

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

function requestedCodesForStockLine(sc: StockCartItem, qty: number): number {
  const fields = getTemplateFieldsForCodes(sc.fieldsSchema as FieldSchemaForCodes[]);
  const slice = sc.previewRows.slice(0, qty);
  if (slice.length === 0) return 0;
  if (slice.length >= qty) {
    return slice.reduce((s, r) => s + countCodesInRowWithSchema(r.values, fields), 0);
  }
  const perBundle = countCodesInRowWithSchema(slice[0].values, fields);
  return perBundle * qty;
}

/** Parse numeric cost from DB/JSON (decimal string, number, or Drizzle-like objects). */
function parseStockRowCost(cost: unknown): number {
  if (typeof cost === "number" && Number.isFinite(cost)) return cost;
  if (cost != null && typeof cost === "object" && "toString" in cost) {
    const n = parseFloat(String(cost));
    if (Number.isFinite(n)) return n;
  }
  const n = parseFloat(String(cost ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Prefer column `cost`; fallback to `values._metadata.cost` when the column is null. */
function effectiveCostFromPreviewRow(r: StockPreviewRow): number {
  const direct = parseStockRowCost(r.cost);
  if (direct !== 0) return direct;
  const v = r.values as Record<string, unknown> | undefined;
  const meta = v?._metadata as Record<string, unknown> | undefined;
  if (meta && meta.cost != null) return parseStockRowCost(meta.cost);
  return 0;
}

/** Sum line cost for reserved preview rows (each row is one peeled bundle after reserve-bundles). */
function totalStockCostForCartLine(sc: StockCartItem): number {
  return sc.previewRows
    .slice(0, sc.quantity)
    .reduce((sum, r) => sum + effectiveCostFromPreviewRow(r), 0);
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
  const [stockCart, setStockCart] = useState<StockCartItem[]>([]);
  const [orderPrice, setOrderPrice] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState<"retail" | "merchant">("retail");
  const [processing, setProcessing] = useState(false);

  const [shortageData, setShortageData] = useState<{
    items: ShortageInfo[];
    potentialDelivery: any[];
  } | null>(null);

  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const cartRef = useRef<CartItem[]>([]);
  const stockCartRef = useRef<StockCartItem[]>([]);
  const [previewRefreshing, setPreviewRefreshing] = useState<number | null>(null);

  const [pickInventoryFor, setPickInventoryFor] = useState<InventoryPickTarget | null>(null);
  const [variantPickMode, setVariantPickMode] = useState<"add" | "pick">("add");

  /** Template stock shortage — rows and/or atomic codes vs pool */
  const [stockShortageDraft, setStockShortageDraft] = useState<{
    items: Array<{
      lineKey: string;
      templateId: string;
      catalogItemId: string | null;
      templateName: string;
      fieldsSchema: Array<{
        name: string;
        label: string;
        type: string;
        wholeFieldIsOneItem?: boolean;
      }>;
      requested: number;
      available: number;
      shortage: number;
      requestedCodes: number;
      availableCodes: number;
      shortageCodes: number;
    }>;
  } | null>(null);
  const [stockPreviewLoading, setStockPreviewLoading] = useState<string | null>(null);
  const [stockCartExpanded, setStockCartExpanded] = useState<Record<string, boolean>>({});
  /** Field name → codes dialog (same pattern as /dashboard/inventory/templates) */
  const [stockFieldCodesDialog, setStockFieldCodesDialog] = useState<{
    templateId: string;
    templateName: string;
    fieldLabel: string;
    fieldName: string;
    codes: string[];
    isLoading: boolean;
  } | null>(null);
  const [checkoutShortageAction, setCheckoutShortageAction] = useState<"auto" | "partial" | "pending">("auto");

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    stockCartRef.current = stockCart;
  }, [stockCart]);

  /** Best-effort release holds when leaving the page */
  useEffect(() => {
    const releaseAll = () => {
      const ids = stockCartRef.current.flatMap((sc) => sc.reservedIds);
      if (ids.length === 0) return;
      void fetch("/api/inventory/release-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds: ids }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", releaseAll);
    return () => {
      window.removeEventListener("beforeunload", releaseAll);
      releaseAll();
    };
  }, []);

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

  const { autoProducts, manualProducts } = useMemo(() => {
    const auto: Product[] = [];
    const manual: Product[] = [];

    for (const p of allProducts) {
      if (p.inventoryTemplateId) {
        auto.push(p);
      } else {
        manual.push(p);
      }
    }

    return { autoProducts: auto, manualProducts: manual };
  }, [allProducts]);

  // stocks tab count is driven by StocksTab's own fetch; use a ref to track it
  const [stocksCount, setStocksCount] = useState(0);

  const tabCounts: Record<TabKey, number> = {
    stocks: stocksCount,
    auto: autoProducts.length,
    manual: manualProducts.length,
  };

  const collectExcludeIdsForLine = useCallback(
    (fullCart: CartItem[], skipIndex: number, productId: string, variantId: string | null) => {
      const ex = new Set<string>();
      for (let i = 0; i < fullCart.length; i++) {
        if (i === skipIndex) continue;
        const c = fullCart[i];
        if (!c || c.productId !== productId) continue;
        if ((c.variantId ?? null) !== (variantId ?? null)) continue;
        for (const id of c.inventoryIds ?? []) ex.add(id);
      }
      return [...ex];
    },
    []
  );

  const fetchInventoryLinesForPreview = useCallback(
    async (
      productId: string,
      variantId: string | null,
      quantity: number,
      excludeIds: string[]
    ): Promise<Array<{ id: string; values: Record<string, unknown> }>> => {
      const cap = Math.min(400, quantity + excludeIds.length + 64);
      const params = new URLSearchParams({
        productId,
        status: "available",
        sortOrder: "asc",
        sortBy: "createdAt",
        limit: String(cap),
      });
      if (variantId) params.set("variantId", variantId);
      if (excludeIds.length > 0) params.set("excludeIds", excludeIds.join(","));
      try {
        const res = await fetch(`/api/inventory?${params}`);
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return [];
        const rows = data.data as Array<{ id: string; values: Record<string, unknown> }>;
        const ex = new Set(excludeIds);
        return rows.filter((r) => !ex.has(r.id)).slice(0, quantity);
      } catch {
        return [];
      }
    },
    []
  );

  const refreshCartLineAtIndex = useCallback(
    async (index: number, snapshot?: CartItem[]) => {
      const full = snapshot ?? cartRef.current;
      const ci = full[index];
      if (!ci?.trackInventory) return;
      setPreviewRefreshing(index);
      try {
        const exclude = collectExcludeIdsForLine(full, index, ci.productId, ci.variantId ?? null);
        const rows = await fetchInventoryLinesForPreview(
          ci.productId,
          ci.variantId ?? null,
          ci.quantity,
          exclude
        );
        const fieldsSchema = ci.fieldsSchema ?? [];
        const inventoryPreview: CartInventoryPreviewLine[] = rows.map((r) => {
          const { fieldSummaries, flatPreview } = summarizeInventoryValues(r.values, fieldsSchema);
          return { inventoryId: r.id, fieldSummaries, flatPreview };
        });
        const inventoryIds = rows.map((r) => r.id);
        setCart((prev) =>
          prev.map((c, i) =>
            i === index ? { ...c, inventoryIds, inventoryPreview } : c
          )
        );
        if (rows.length < ci.quantity) {
          toast.info(
            `معاينة: ${rows.length} من ${ci.quantity} سطر متاح حالياً — عند «إتمام البيع» ستظهر نافذة خيارات النقص.`
          );
        }
      } finally {
        setPreviewRefreshing(null);
      }
    },
    [collectExcludeIdsForLine, fetchInventoryLinesForPreview]
  );

  // ── Add to cart ───────────────────────────────────────────────────────────

  const addToCart = useCallback((product: Product, variant: Variant | null, qty = 1) => {
    const variantId = variant?.id || null;
    const variantLabel = variant && Object.keys(variant.optionCombination).length > 0
      ? Object.values(variant.optionCombination).join(" / ")
      : null;
    const price = variant ? parseFloat(variant.price) : parseFloat(productPrice(product));
    const available = variant ? variant.stockCount : product.availableCount;
    const safeQty = Math.max(1, qty);
    const trackInventory = Boolean(product.inventoryTemplateId) && product.deliveryType !== "manual";
    const fieldsSchema = Array.isArray(product.fieldsSchema) ? product.fieldsSchema : [];

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.productId === product.id && ci.variantId === variantId
      );
      let targetIdx = 0;
      let next: CartItem[];

      if (existingIdx >= 0) {
        targetIdx = existingIdx;
        next = prev.map((ci, i) =>
          i === existingIdx
            ? {
                ...ci,
                quantity: ci.quantity + safeQty,
              }
            : ci
        );
      } else {
        next = [
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
            trackInventory,
            fieldsSchema: trackInventory ? fieldsSchema : undefined,
            inventoryIds: trackInventory ? [] : undefined,
            inventoryPreview: trackInventory ? [] : undefined,
          },
        ];
        targetIdx = next.length - 1;
      }

      if (trackInventory) {
        queueMicrotask(() => {
          void refreshCartLineAtIndex(targetIdx, next);
        });
      }

      return next;
    });
    setPickingVariantFor(null);
  }, [refreshCartLineAtIndex]);

  const handleProductClick = useCallback(async (product: Product, qty = 1) => {
    try {
      const res = await fetch(`/api/products/${product.id}/variants`);
      const data = await res.json();
      const variantList: Variant[] = Array.isArray(data.data)
        ? data.data
        : data.data?.variants ?? [];
      if (data.success && variantList.length > 1) {
        setVariantPickMode("add");
        setPickingVariantFor({ ...product, variants: variantList.filter((v: Variant) => v.isActive) });
        return;
      }
      const defaultVariant = variantList[0] || null;
      addToCart(product, defaultVariant, qty);
    } catch {
      addToCart(product, null, qty);
    }
  }, [addToCart]);

  const handlePickProductClick = useCallback(async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}/variants`);
      const data = await res.json();
      const variantList: Variant[] = Array.isArray(data.data)
        ? data.data
        : data.data?.variants ?? [];
      if (data.success && variantList.length > 1) {
        setVariantPickMode("pick");
        setPickingVariantFor({ ...product, variants: variantList.filter((v: Variant) => v.isActive) });
        return;
      }
      const defaultVariant = variantList[0] || null;
      setPickInventoryFor({ product, variant: defaultVariant });
    } catch {
      setPickInventoryFor({ product, variant: null });
    }
  }, []);

  const addToCartWithIds = useCallback(
    (product: Product, variant: Variant | null, items: Array<{ id: string; values: Record<string, unknown> }>) => {
      if (items.length === 0) return;
      const variantId = variant?.id || null;
      const variantLabel =
        variant && Object.keys(variant.optionCombination).length > 0
          ? Object.values(variant.optionCombination).join(" / ")
          : null;
      const price = variant ? parseFloat(variant.price) : parseFloat(productPrice(product));
      const fieldsSchema = Array.isArray(product.fieldsSchema) ? product.fieldsSchema : [];
      const inventoryIds = items.map((r) => r.id);
      const inventoryPreview: CartInventoryPreviewLine[] = items.map((r) => {
        const { fieldSummaries, flatPreview } = summarizeInventoryValues(r.values, fieldsSchema);
        return { inventoryId: r.id, fieldSummaries, flatPreview };
      });

      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (ci) => ci.productId === product.id && ci.variantId === variantId
        );
        if (existingIdx >= 0) {
          return prev.map((ci, i) => {
            if (i !== existingIdx) return ci;
            const existing = new Set(ci.inventoryIds ?? []);
            const newIds = inventoryIds.filter((id) => !existing.has(id));
            const newPreviews = inventoryPreview.filter((p) => !existing.has(p.inventoryId));
            return {
              ...ci,
              quantity: ci.quantity + newIds.length,
              inventoryIds: [...(ci.inventoryIds ?? []), ...newIds],
              inventoryPreview: [...(ci.inventoryPreview ?? []), ...newPreviews],
            };
          });
        }
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            variantId,
            variantLabel,
            price,
            quantity: items.length,
            available: product.availableCount,
            deliveryType: product.deliveryType,
            trackInventory: true,
            fieldsSchema,
            inventoryIds,
            inventoryPreview,
          },
        ];
      });
      setPickInventoryFor(null);
    },
    []
  );

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) => {
      const ci = prev[index];
      if (!ci) return prev;
      if (!ci.trackInventory) {
        return prev.map((c, i) => (i === index ? { ...c, quantity: qty } : c));
      }
      if (qty < ci.quantity) {
        const newIds = (ci.inventoryIds ?? []).slice(0, qty);
        const newPr = (ci.inventoryPreview ?? []).slice(0, qty);
        return prev.map((c, i) =>
          i === index ? { ...c, quantity: qty, inventoryIds: newIds, inventoryPreview: newPr } : c
        );
      }
      const needMore = qty > ci.quantity;
      const next = prev.map((c, i) => (i === index ? { ...c, quantity: qty } : c));
      if (needMore) {
        queueMicrotask(() => {
          void refreshCartLineAtIndex(index, next);
        });
      }
      return next;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProductInventoryUnit = (cartIndex: number, inventoryId: string) => {
    setCart((prev) => {
      const ci = prev[cartIndex];
      if (!ci?.inventoryIds?.length) return prev;
      if (!ci.inventoryIds.includes(inventoryId)) return prev;
      const newIds = ci.inventoryIds.filter((id) => id !== inventoryId);
      const newPr = (ci.inventoryPreview ?? []).filter((p) => p.inventoryId !== inventoryId);
      const newQty = Math.max(0, ci.quantity - 1);
      if (newQty <= 0) return prev.filter((_, i) => i !== cartIndex);
      return prev.map((c, i) =>
        i === cartIndex
          ? { ...c, quantity: newQty, inventoryIds: newIds, inventoryPreview: newPr }
          : c
      );
    });
  };

  const stockUnitCount = stockCart.reduce((s, sc) => s + sc.quantity, 0);
  const totalItems = cart.reduce((s, ci) => s + ci.quantity, 0) + stockUnitCount;
  const totalStockCost = stockCart.reduce((s, sc) => s + totalStockCostForCartLine(sc), 0);
  const orderPriceNum = parseFloat(orderPrice) || 0;
  const productSubtotal = cart.reduce((s, ci) => s + ci.price * ci.quantity, 0);
  const totalPrice = productSubtotal + (stockCart.length > 0 ? orderPriceNum : 0);
  const stockProfit = stockCart.length > 0 ? orderPriceNum - totalStockCost : 0;

  /** Reserve FIFO rows for a template (exclusive hold) and update cart preview. Returns rows for immediate use (state may lag one tick). */
  const reserveStockForTemplate = useCallback(
    async (
      templateId: string,
      quantity: number,
      heldIds: string[],
      catalogItemId?: string | null
    ): Promise<StockPreviewRow[] | null> => {
      setStockPreviewLoading(`${templateId}\t${catalogItemId ?? ""}`);
      try {
        const res = await fetch(`/api/inventory/templates/${templateId}/reserve-bundles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bundleCount: quantity,
            previousReservedIds: heldIds,
            catalogItemId: catalogItemId || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.error || "Could not reserve stock");
          return null;
        }
        const rows: StockPreviewRow[] = (data.data.rows as Array<{
          id: string;
          values: Record<string, unknown>;
          cost: string | null;
        }>).map((r) => {
          const values = r.values || {};
          const n = r.cost != null && String(r.cost).trim() !== "" ? parseFloat(String(r.cost)) : NaN;
          const preliminary: StockPreviewRow = {
            id: r.id,
            values,
            cost: Number.isFinite(n) ? n : 0,
          };
          return { ...preliminary, cost: effectiveCostFromPreviewRow(preliminary) };
        });
        const reservedIds = rows.map((r) => r.id);
        const actualQty = rows.length;
        if (actualQty < quantity) {
          toast.info(
            `Reserved ${actualQty} of ${quantity} bundle(s). Complete sale to sell what's reserved, create a pending order, or add stock.`
          );
        }
        setStockCart((prev) =>
          prev.map((sc) => {
            if (sc.templateId !== templateId) return sc;
            if ((sc.catalogItemId ?? "") !== (catalogItemId ?? "")) return sc;
            if (sc.quantity !== quantity) return sc;
            return { ...sc, previewRows: rows, quantity, reservedIds };
          })
        );
        return rows;
      } catch {
        toast.error("Network error reserving stock");
        return null;
      } finally {
        setStockPreviewLoading(null);
      }
    },
    []
  );

  /** Update stock cart quantity + re-reserve rows */
  const updateStockQuantity = useCallback(
    (templateId: string, qty: number, catalogItemId?: string | null) => {
      if (qty <= 0) {
        setStockCart((prev) => {
          const target = prev.find(
            (sc) => sc.templateId === templateId && (sc.catalogItemId ?? "") === (catalogItemId ?? "")
          );
          if (target?.reservedIds?.length) {
            void fetch("/api/inventory/release-reservations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inventoryIds: target.reservedIds }),
            }).catch(() => {});
          }
          return prev.filter(
            (sc) =>
              !(sc.templateId === templateId && (sc.catalogItemId ?? "") === (catalogItemId ?? ""))
          );
        });
        return;
      }

      const capEntry = stockCartRef.current.find(
        (sc) => sc.templateId === templateId && (sc.catalogItemId ?? "") === (catalogItemId ?? "")
      );
      const cap = capEntry?.available;
      const wanted = Math.max(1, Math.floor(qty));
      const useQty =
        typeof cap === "number" && cap > 0 ? Math.min(wanted, cap) : wanted;

      if (useQty < wanted) {
        toast.info(`Quantity capped at ${useQty} (available in pool).`);
      }

      setStockCart((prev) => {
        const cur = prev.find(
          (sc) => sc.templateId === templateId && (sc.catalogItemId ?? "") === (catalogItemId ?? "")
        );
        const held = cur?.reservedIds ?? [];
        void reserveStockForTemplate(templateId, useQty, held, catalogItemId ?? null);
        return prev.map((sc) =>
          sc.templateId === templateId && (sc.catalogItemId ?? "") === (catalogItemId ?? "")
            ? { ...sc, quantity: useQty }
            : sc
        );
      });
    },
    [reserveStockForTemplate]
  );

  /** Add a template to stock cart with qty 1 and reserve preview rows. */
  const addTemplateToCart = useCallback(
    (
      template: TemplateSellCard,
      catalogItem: {
        id: string;
        name: string;
        codesCount?: number;
        stockCount?: number;
        availableQty?: number;
      }
    ) => {
      if (!catalogItem?.id) {
        toast.error("An inventory product is required");
        return;
      }
      const fieldsSchema = template.fieldsSchema
        .filter((f) => f.type !== "group")
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          wholeFieldIsOneItem: f.wholeFieldIsOneItem,
        }));

      const cid = catalogItem.id;
      const cname = catalogItem.name;

      setStockCart((prev) => {
        const exists = prev.find(
          (sc) => sc.templateId === template.id && (sc.catalogItemId ?? "") === cid
        );
        if (exists) {
          toast.info(`${cname} is already in the cart`);
          return prev;
        }
        return [
          ...prev,
          {
            templateId: template.id,
            templateName: `${cname} · ${template.name}`,
            catalogItemId: cid,
            catalogItemName: cname,
            quantity: 1,
            fieldsSchema,
            available:
              catalogItem.availableQty ??
              catalogItem.codesCount ??
              template.codesCount ??
              template.stockCount,
            previewRows: [],
            reservedIds: [],
          },
        ];
      });
      requestAnimationFrame(() => {
        void reserveStockForTemplate(template.id, 1, [], cid);
      });
    },
    [reserveStockForTemplate]
  );

  // ── Checkout ──────────────────────────────────────────────────────────────

  const executeTemplateStockSale = useCallback(
    async (
      groups: StockCartItem[],
      shortageHandling: "complete" | "pending_remainder",
      options?: { capToPreviewRows?: boolean }
    ) => {
      const capToPreview = options?.capToPreviewRows === true;
      const totalUnits = groups.reduce((s, sc) => {
        const cap = capToPreview ? Math.min(sc.quantity, sc.previewRows.length) : sc.quantity;
        return s + Math.max(0, cap);
      }, 0);
      if (totalUnits === 0) return;
      const unitPrice = orderPriceNum / totalUnits;
      let lastResult: { orderId: string; order: unknown } | null = null;
      let anyPending = false;
      let totalSold = 0;
      for (const sc of groups) {
        const cap = capToPreview ? Math.min(sc.quantity, sc.previewRows.length) : sc.quantity;
        const ids = sc.previewRows.slice(0, cap).map((r) => r.id);
        /** Pending remainder: do not FIFO-pull extra rows when fewer bundles were reserved than requested. */
        const fifoReplacement =
          shortageHandling !== "pending_remainder" || sc.previewRows.length >= sc.quantity;
        const res = await fetch("/api/manual-sell/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: sc.templateId,
            inventoryIds: ids,
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim() || undefined,
            unitPrice,
            label: sc.templateName,
            catalogItemId: sc.catalogItemId || undefined,
            catalogItemName: sc.catalogItemName || undefined,
            fifoReplacement,
            shortageHandling,
            requestedLineCount: cap,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.error || `Sale failed for ${sc.templateName}`);
          throw new Error(data.error || "sale failed");
        }
        const row = data.data as {
          orderId: string;
          order: unknown;
          soldCount?: number;
          isPendingRemainder?: boolean;
        };
        lastResult = row;
        totalSold += row.soldCount ?? cap;
        anyPending = anyPending || row.isPendingRemainder === true;
      }
      if (lastResult?.orderId) {
        setOrderResult({
          orderId: lastResult.orderId,
          order: lastResult.order,
          deliveryItems: [],
          hasShortage: anyPending,
          stockLinesSold: totalSold,
          stockSaleGrandTotal: orderPriceNum,
          stockTemplateOrderCount: groups.length,
        });
        setStockCart([]);
        setOrderPrice("");
        setStockShortageDraft(null);
        toast.success(
          anyPending
            ? "Order created — complete the remainder from Orders"
            : `Sold ${totalSold} stock line(s)`
        );
      }
    },
    [customerEmail, customerName, orderPriceNum]
  );

  const handleCheckout = async (
    overrideAction?: "partial" | "pending" | "add-inventory",
    options?: {
      inventoryItemsToAdd?: Array<{
        productId: string;
        values: Record<string, string | number | boolean>;
      }>;
    }
  ) => {
    const shortageAction =
      overrideAction ?? (checkoutShortageAction !== "auto" ? checkoutShortageAction : undefined);
    if (cart.length === 0 && stockCart.length === 0) return toast.error("Cart is empty");
    if (!customerEmail) return toast.error("Customer email is required");
    if (stockCart.length > 0 && (!orderPriceNum || orderPriceNum <= 0)) {
      return toast.error("Order price is required when the cart includes stock lines");
    }

    // Stock-only sale
    if (cart.length === 0 && stockCart.length > 0) {
      const statsResults = await Promise.all(
        stockCart.map(async (sc) => {
          try {
            const qs = new URLSearchParams();
            if (sc.catalogItemId) qs.set("catalogItemId", sc.catalogItemId);
            const r = await fetch(
              `/api/inventory/templates/${sc.templateId}/field-code-stats${qs.toString() ? `?${qs}` : ""}`
            );
            const j = await r.json();
            return j.success ? (j.data as { totalCodes: number; totalRows: number }) : null;
          } catch {
            return null;
          }
        })
      );

      const shortageItems: Array<{
        lineKey: string;
        templateId: string;
        catalogItemId: string | null;
        templateName: string;
        fieldsSchema: StockCartItem["fieldsSchema"];
        requested: number;
        available: number;
        shortage: number;
        requestedCodes: number;
        availableCodes: number;
        shortageCodes: number;
      }> = [];

      for (let i = 0; i < stockCart.length; i++) {
        const sc = stockCart[i];
        const stats = statsResults[i];
        const availCodes = stats?.totalCodes ?? 0;
        const reqCodes = requestedCodesForStockLine(sc, sc.quantity);
        const rowShort = sc.quantity > sc.previewRows.length;
        const codeShort = reqCodes > availCodes;
        if (rowShort || codeShort) {
          shortageItems.push({
            lineKey: stockCartLineKey(sc),
            templateId: sc.templateId,
            catalogItemId: sc.catalogItemId ?? null,
            templateName: sc.templateName,
            fieldsSchema: sc.fieldsSchema,
            requested: sc.quantity,
            available: sc.previewRows.length,
            shortage: Math.max(0, sc.quantity - sc.previewRows.length),
            requestedCodes: reqCodes,
            availableCodes: availCodes,
            shortageCodes: Math.max(0, reqCodes - availCodes),
          });
        }
      }

      if (shortageItems.length > 0) {
        setStockShortageDraft({ items: shortageItems });
        return;
      }

      setProcessing(true);
      try {
        await executeTemplateStockSale(stockCart, "complete");
      } catch {
        toast.error("Sale failed");
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Product-based or mixed sale
    setProcessing(true);
    setShortageData(null);

    try {
      const directItems =
        stockCart.length > 0
          ? stockCart
              .map((sc) => ({
                inventoryIds: sc.previewRows.slice(0, sc.quantity).map((r) => r.id),
                price: stockUnitCount > 0 ? orderPriceNum / stockUnitCount : 0,
                label: sc.templateName,
              }))
              .filter((d) => d.inventoryIds.length > 0)
          : undefined;

      const usePosCart =
        cart.length > 0 &&
        stockCart.length === 0 &&
        cart.every((ci) => ci.variantId != null && ci.variantId !== "");

      const res = await fetch("/api/manual-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((ci) => ({
            productId: ci.productId,
            quantity: ci.quantity,
            variantId: ci.variantId,
            ...(usePosCart
              ? {
                  unitPrice: ci.price,
                  fulfillmentMode:
                    ci.trackInventory && ci.inventoryIds && ci.inventoryIds.length > 0
                      ? "manual"
                      : "auto",
                  ...(ci.trackInventory && ci.inventoryIds && ci.inventoryIds.length > 0
                    ? { manualInventoryIds: ci.inventoryIds }
                    : {}),
                }
              : ci.trackInventory && ci.inventoryIds && ci.inventoryIds.length > 0
                ? { inventoryIds: ci.inventoryIds }
                : {}),
          })),
          directItems,
          customerEmail,
          customerName: customerName || undefined,
          customerType,
          ...(usePosCart ? {} : { shortageAction }),
          ...(options?.inventoryItemsToAdd && options.inventoryItemsToAdd.length > 0
            ? { inventoryItemsToAdd: options.inventoryItemsToAdd }
            : {}),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.code === "INSUFFICIENT_STOCK") {
          toast.error(
            `Stock insufficient: ${data.requested} requested, ${data.available} available (variant)`
          );
        } else {
          toast.error(data.error || "Sale failed");
        }
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
        setShortageData(null);
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
    const held = stockCartRef.current.flatMap((sc) => sc.reservedIds);
    if (held.length > 0) {
      void fetch("/api/inventory/release-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds: held }),
      }).catch(() => {});
    }
    setOrderResult(null);
    setShortageData(null);
    setStockShortageDraft(null);
    setCart([]);
    setStockCart([]);
    setOrderPrice("");
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
    { key: "stocks", label: "Inventory products" },
    { key: "auto", label: "Products (Auto)" },
    { key: "manual", label: "Products (Manual)" },
  ];

  return (
    <div className="mx-auto max-w-[1920px] space-y-4">
      <div className="flex flex-col-reverse gap-4 xl:grid xl:grid-cols-[1fr_min(380px,100%)] xl:items-start">
        {/* Catalog Panel — DOM first; flex-col-reverse shows cart above on small screens */}
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
            {activeTab === "stocks" ? (
              <StocksTab
                onCountChange={setStocksCount}
                stockCart={stockCart}
                onAddTemplate={addTemplateToCart}
              />
            ) : loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Loading catalog…</span>
              </div>
            ) : activeTab === "auto" ? (
              <ProductListTab
                products={autoProducts}
                onProductClick={handleProductClick}
                onPickProduct={handlePickProductClick}
                emptyMessage="No products with inventory templates"
              />
            ) : (
              <ProductListTab
                products={manualProducts}
                onProductClick={handleProductClick}
                emptyMessage="No manual delivery products"
              />
            )}

            {hasMore && !loading && activeTab !== "stocks" && (
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

        {/* Cart — DOM second; appears first on small screens via flex-col-reverse */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-5 shadow-lg shadow-black/5 dark:shadow-black/30 lg:sticky lg:top-28 flex flex-col max-h-[calc(100vh-8rem)] overflow-x-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Cart</h2>
              {(cart.length > 0 || stockCart.length > 0) && (
                <span className="text-xs font-semibold tabular-nums rounded-full bg-primary/10 text-primary px-2.5 py-2 text-center">
                  {totalItems}
                </span>
              )}
            </div>

            {cart.length > 0 || stockCart.length > 0 ? (
              <>
                <div className="mb-4 max-h-[min(50vh,28rem)] shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain space-y-3 rounded-xl border border-border/40 bg-muted/15 p-2">
                  {/* Product cart items */}
                  {cart.map((ci, idx) => {
                    const hasShortage = ci.deliveryType !== "manual" && ci.quantity > ci.available;
                    const prevCount = ci.inventoryPreview?.length ?? 0;
                    const previewShort = Boolean(ci.trackInventory && prevCount < ci.quantity);
                    return (
                      <div
                        key={`${ci.productId}-${ci.variantId ?? "default"}-${idx}`}
                        className="p-3 rounded-xl bg-muted/60 border border-border/80"
                      >
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{ci.productName}</p>
                            {ci.variantLabel && (
                              <p className="text-xs text-muted-foreground mt-0.5">{ci.variantLabel}</p>
                            )}
                            {hasShortage && (
                              <p className="text-xs text-warning mt-1 font-medium">
                                المخزون المتاح: {ci.available} — عند «إتمام البيع» ستظهر نافذة خيارات النقص.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                            aria-label="حذف السطر"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {ci.trackInventory && (
                          <div className="mb-3 rounded-lg border border-border/70 bg-background/50 px-2 py-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-muted-foreground">
                                معاينة المخزون (FIFO):{" "}
                                <strong className="text-foreground tabular-nums">
                                  {prevCount}/{ci.quantity}
                                </strong>{" "}
                                سطر
                              </p>
                              <button
                                type="button"
                                title="تحديث المعاينة"
                                onClick={() => void refreshCartLineAtIndex(idx)}
                                disabled={previewRefreshing === idx}
                                className="p-1.5 rounded-md border border-input bg-card hover:bg-muted disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={cn("h-3.5 w-3.5 text-foreground", previewRefreshing === idx && "animate-spin")}
                                />
                              </button>
                            </div>
                            {previewShort && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                                المعاينة أقل من الكمية المطلوبة. عند «إتمام البيع» تظهر نافذة (بيع متاح / معلّق / إضافة مخزون).
                              </p>
                            )}
                            <div className="group relative">
                              <p className="text-[10px] text-primary font-medium cursor-default">
                                مرّر المؤشر هنا لعرض الحقول والقيم المرتبطة بكل سطر
                              </p>
                              <div
                                className={cn(
                                  "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150",
                                  "absolute z-50 left-0 right-0 top-full mt-1 p-2 rounded-lg border border-border bg-card shadow-xl",
                                  "max-h-52 overflow-auto text-[10px]"
                                )}
                              >
                                {!ci.inventoryPreview?.length ? (
                                  <span className="text-muted-foreground">لا توجد معاينة بعد — اضغط تحديث.</span>
                                ) : (
                                  <table className="w-full text-start">
                                    <tbody>
                                      {ci.inventoryPreview.map((line, li) => (
                                        <tr key={line.inventoryId} className="border-b border-border/50 last:border-0">
                                          <td className="py-1 ps-0 pe-2 align-top text-muted-foreground whitespace-nowrap">
                                            #{li + 1}
                                          </td>
                                          <td className="py-1">
                                            {line.fieldSummaries.length === 0 ? (
                                              <span>{line.flatPreview || line.inventoryId.slice(0, 8)}</span>
                                            ) : (
                                              <ul className="space-y-0.5">
                                                {line.fieldSummaries.map((s) => (
                                                  <li key={`${line.inventoryId}-${s.fieldLabel}`}>
                                                    <span className="font-semibold text-foreground">{s.fieldLabel}:</span>{" "}
                                                    <span className="text-muted-foreground break-words">{s.value}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                            {ci.inventoryPreview && ci.inventoryPreview.length > 0 && (
                              <ul className="space-y-1 border-t border-border/40 pt-2">
                                {ci.inventoryPreview.map((line) => (
                                  <li
                                    key={line.inventoryId}
                                    className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] text-foreground leading-snug break-words">
                                        {line.flatPreview ||
                                          line.fieldSummaries.map((s) => `${s.fieldLabel}: ${s.value}`).join(" · ") ||
                                          "—"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeProductInventoryUnit(idx, line.inventoryId)}
                                      className="shrink-0 p-1 rounded-md text-destructive hover:bg-destructive/10"
                                      aria-label="إزالة هذا السطر من السلة"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

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

                  {/* Stock cart — lines are inventory products (catalog SKUs) */}
                  {stockCart.map((sc, idx) => {
                    const lineKey = stockCartLineKey(sc);
                    const previewSlice = sc.previewRows.slice(0, sc.quantity);
                    const groupCost = totalStockCostForCartLine(sc);
                    const isLoadingThis = stockPreviewLoading === lineKey;
                    const isShort = sc.quantity > sc.previewRows.length;
                    const fieldDefs = getTemplateFieldsForCodes(sc.fieldsSchema as FieldSchemaForCodes[]);
                    const codesReservedTotal = sc.previewRows.reduce(
                      (s, r) => s + countCodesInRowWithSchema(r.values, fieldDefs),
                      0
                    );
                    const codesRequestedForQty = requestedCodesForStockLine(sc, sc.quantity);
                    const expanded = stockCartExpanded[lineKey] ?? true;
                    return (
                      <div
                        key={lineKey}
                        className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm ring-1 ring-border/60"
                      >
                        <div className="flex items-stretch gap-1 border-b border-border/70 bg-muted/30 px-2 py-2 sm:px-3">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-start hover:bg-muted/50"
                            onClick={() =>
                              setStockCartExpanded((p) => ({
                                ...p,
                                [lineKey]: !(p[lineKey] ?? true),
                              }))
                            }
                            aria-expanded={expanded}
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                !expanded && "-rotate-90"
                              )}
                            />
                            <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                              {sc.templateName}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (sc.reservedIds?.length) {
                                void fetch("/api/inventory/release-reservations", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ inventoryIds: sc.reservedIds }),
                                }).catch(() => {});
                              }
                              setStockCart((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
                            aria-label={`Remove ${sc.templateName} from cart`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>

                        <div className="space-y-3 border-b border-border/50 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Bundles (1 code / field)
                            </span>
                            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5">
                              <button
                                type="button"
                                onClick={() => updateStockQuantity(sc.templateId, 2, sc.catalogItemId ?? null)}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                  sc.quantity === 2
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                                )}
                              >
                                2
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStockQuantity(sc.templateId, 4, sc.catalogItemId ?? null)}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                  sc.quantity === 4
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                                )}
                              >
                                4
                              </button>
                            </div>
                            <div className="ml-auto flex items-center overflow-hidden rounded-xl border border-border bg-background shadow-inner">
                              <button
                                type="button"
                                onClick={() =>
                                  updateStockQuantity(sc.templateId, sc.quantity - 1, sc.catalogItemId ?? null)
                                }
                                className="flex h-9 w-9 items-center justify-center text-lg leading-none text-foreground hover:bg-muted"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={sc.available > 0 ? sc.available : undefined}
                                value={sc.quantity}
                                onChange={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  if (n > 0)
                                    updateStockQuantity(sc.templateId, n, sc.catalogItemId ?? null);
                                }}
                                className="h-9 w-12 border-x border-border bg-transparent text-center text-sm font-bold tabular-nums text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateStockQuantity(sc.templateId, sc.quantity + 1, sc.catalogItemId ?? null)
                                }
                                className="flex h-9 w-9 items-center justify-center text-lg leading-none text-foreground hover:bg-muted"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] leading-snug text-muted-foreground">
                            Each bundle peels one atomic code from <span className="font-medium text-foreground">every</span>{" "}
                            field in sync (from multiline / array stock). If fewer bundles reserve than you asked for, use
                            Complete sale for options (sell reserved, pending, or add stock).
                          </p>

                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            <span className="tabular-nums font-medium text-foreground">Qty {sc.quantity}</span>
                            <span className="mx-1.5 text-border">·</span>
                            {isShort ? (
                              <>
                                <span className="tabular-nums">
                                  {codesReservedTotal} code{codesReservedTotal !== 1 ? "s" : ""} reserved
                                </span>
                                <span className="mx-1.5 text-border">·</span>
                                <span className="tabular-nums">{codesRequestedForQty} at full qty</span>
                                <span className="mx-1.5 text-border">·</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  {sc.previewRows.length} of {sc.quantity} bundles reserved
                                </span>
                              </>
                            ) : (
                              <span className="tabular-nums">
                                {codesRequestedForQty} code{codesRequestedForQty !== 1 ? "s" : ""} in this sale
                              </span>
                            )}
                            {groupCost > 0 && (
                              <>
                                <span className="mx-1.5 text-border">·</span>
                                <span className="font-medium text-foreground">Cost {formatCurrency(groupCost)}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {expanded && (
                          <div className="p-3">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                                Fields — tap a field to see codes for this sale
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {fieldDefs.map((field) => {
                                  const codesToSell = previewSlice.flatMap((inv) =>
                                    listAtomicCodesForField(inv.values as Record<string, unknown>, field)
                                  );
                                  return (
                                    <button
                                      key={field.name}
                                      type="button"
                                      onClick={() =>
                                        setStockFieldCodesDialog({
                                          templateId: sc.templateId,
                                          templateName: sc.templateName,
                                          fieldLabel: field.label || field.name,
                                          fieldName: field.name,
                                          codes: codesToSell,
                                          isLoading: isLoadingThis,
                                        })
                                      }
                                      className="flex min-w-[8.5rem] max-w-full flex-1 flex-col gap-0.5 rounded-lg border border-input bg-secondary px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary/80 sm:min-w-[10rem] sm:max-w-[calc(50%-0.25rem)]"
                                    >
                                      <span className="font-medium text-foreground">{field.label || field.name}</span>
                                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                                        {(field.type || "string").toString()}
                                      </span>
                                      <span className="text-xs font-semibold tabular-nums text-primary">
                                        {isLoadingThis
                                          ? "…"
                                          : `${codesToSell.length} code${codesToSell.length !== 1 ? "s" : ""}`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Customer — after line items so template row stays visible under “Cart” */}
                <div className="space-y-3 mb-4">
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

                {/* Order Price & Profit for stock items */}
                {stockCart.length > 0 && (
                  <div className="border-t border-border pt-4 mb-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Order Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        placeholder="0.00"
                        className="mt-0.5 w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock cost</span>
                      <span className="text-foreground font-medium tabular-nums">{formatCurrency(totalStockCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Profit</span>
                      <span className={cn(
                        "font-bold tabular-nums",
                        stockProfit >= 0 ? "text-emerald-500" : "text-destructive"
                      )}>
                        {stockProfit >= 0 ? "+" : ""}{formatCurrency(stockProfit)}
                      </span>
                    </div>
                  </div>
                )}

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
              <div
                className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-muted/20 px-3"
                suppressHydrationWarning
              >
                <p className="font-medium text-foreground/80 mb-1">Cart is empty</p>
                <p className="mb-3">
                  Add products from the product tabs, or add a <span className="font-medium text-foreground">template</span>{" "}
                  from <span className="font-medium text-foreground">Stock Templates</span> for qty / fields / codes.
                </p>
                <p className="text-xs text-start rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Template stock</span> uses the Stock Templates tab (not
                  Products). After adding, use Set 2 / Set 4, tap the template to show fields, then tap a field to preview
                  codes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variant Picker Modal */}
      {pickingVariantFor && (
        <VariantPickerModal
          product={pickingVariantFor}
          onSelect={(variant) => {
            if (variantPickMode === "pick") {
              setPickingVariantFor(null);
              setVariantPickMode("add");
              setPickInventoryFor({ product: pickingVariantFor, variant });
            } else {
              addToCart(pickingVariantFor, variant);
            }
          }}
          onClose={() => {
            setPickingVariantFor(null);
            setVariantPickMode("add");
          }}
        />
      )}

      {/* Inventory Picker Modal */}
      {pickInventoryFor && (
        <InventoryPickerModal
          target={pickInventoryFor}
          alreadyInCartIds={
            cart
              .filter(
                (ci) =>
                  ci.productId === pickInventoryFor.product.id &&
                  ci.variantId === (pickInventoryFor.variant?.id ?? null)
              )
              .flatMap((ci) => ci.inventoryIds ?? [])
          }
          onAdd={addToCartWithIds}
          onClose={() => setPickInventoryFor(null)}
        />
      )}

      {/* Template field codes (same flow as Inventory Templates → field → stock list) */}
      <Dialog
        open={stockFieldCodesDialog !== null}
        onOpenChange={(open) => {
          if (!open) setStockFieldCodesDialog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {stockFieldCodesDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-start">
                  {stockFieldCodesDialog.templateName}
                  <span className="text-muted-foreground font-normal"> › </span>
                  {stockFieldCodesDialog.fieldLabel}
                </DialogTitle>
                <DialogDescription>
                  Codes from reserved inventory that will be sold for this field.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[min(60vh,28rem)] overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                {stockFieldCodesDialog.isLoading ? (
                  <p className="text-sm text-muted-foreground">Reserving inventory…</p>
                ) : stockFieldCodesDialog.codes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No codes for this field yet — increase quantity or check stock.
                  </p>
                ) : (
                  <ol className="space-y-2 font-mono text-[12px] leading-relaxed text-foreground">
                    {stockFieldCodesDialog.codes.map((v, vi) => (
                      <li
                        key={vi}
                        className="break-all rounded-md border border-border/60 bg-background px-2.5 py-2"
                      >
                        {v.length > 400 ? `${v.slice(0, 400)}…` : v}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template stock shortage (after Complete sale) */}
      {stockShortageDraft && (
        <StockTemplateShortageModal
          draft={stockShortageDraft}
          processing={processing}
          onClose={() => setStockShortageDraft(null)}
          onSellAvailable={async () => {
            setProcessing(true);
            try {
              await executeTemplateStockSale(stockCart, "complete", { capToPreviewRows: true });
            } finally {
              setProcessing(false);
            }
          }}
          onCreatePending={async () => {
            setProcessing(true);
            try {
              await executeTemplateStockSale(stockCart, "pending_remainder");
            } finally {
              setProcessing(false);
            }
          }}
          onFulfillAndSell={async (newInventoryByTemplate) => {
            setProcessing(true);
            try {
              for (const entry of newInventoryByTemplate) {
                if (entry.itemsForSale.length > 0) {
                  const res = await fetch("/api/inventory/standalone", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      templateId: entry.templateId,
                      catalogItemId: entry.catalogItemId || undefined,
                      items: entry.itemsForSale.map((x) => x.values),
                    }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    toast.error(data.error || `Failed to add inventory for ${entry.templateName}`);
                    return;
                  }
                }
                if (entry.itemsSurplus?.length) {
                  const res = await fetch("/api/inventory/standalone", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      templateId: entry.templateId,
                      catalogItemId: entry.catalogItemId || undefined,
                      items: entry.itemsSurplus.map((x) => x.values),
                    }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    toast.error(data.error || `Failed to add surplus stock for ${entry.templateName}`);
                    return;
                  }
                }
              }
              // 2. Re-reserve and build fresh cart lines for sale (state updates are async)
              const rebuilt: StockCartItem[] = [];
              for (const sc of stockCart) {
                const nextRows = await reserveStockForTemplate(
                  sc.templateId,
                  sc.quantity,
                  sc.reservedIds,
                  sc.catalogItemId ?? null
                );
                if (!nextRows) return;
                rebuilt.push({
                  ...sc,
                  previewRows: nextRows,
                  reservedIds: nextRows.map((r) => r.id),
                });
              }
              await executeTemplateStockSale(rebuilt, "complete");
            } finally {
              setProcessing(false);
            }
          }}
        />
      )}

      {/* Product cart shortage */}
      {shortageData && (
        <ShortageModal
          data={shortageData}
          cart={cart}
          processing={processing}
          onSellAvailable={() => void handleCheckout("partial")}
          onCreatePending={() => void handleCheckout("pending")}
          onAddInventoryAndComplete={() => {
            const items = buildInventoryItemsToAddFromShortage(shortageData.items, cart);
            if (items.length === 0) {
              toast.error("لا يمكن توليد قيم تلقائياً — أضف المخزون يدوياً ثم أعد المحاولة.");
              return;
            }
            void handleCheckout("add-inventory", { inventoryItemsToAdd: items });
          }}
          onCancel={() => setShortageData(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Stocks Tab — one card per inventory product (catalog SKU)
// ============================================================================

function StocksTab({
  onCountChange,
  stockCart,
  onAddTemplate,
}: {
  onCountChange: (n: number) => void;
  stockCart: StockCartItem[];
  onAddTemplate: (
    template: TemplateSellCard,
    catalogItem: {
      id: string;
      name: string;
      codesCount?: number;
      stockCount?: number;
      availableQty?: number;
    }
  ) => void;
}) {
  const [products, setProducts] = useState<InventoryProductSellRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/catalog-products");
      const data = await res.json();
      if (data.success) {
        const raw = (data.data ?? []) as InventoryProductSellRow[];
        const list = raw.map((r) => ({
          ...r,
          availableQty: typeof r.availableQty === "number" ? r.availableQty : 0,
        }));
        setProducts(list);
        onCountChange(list.length);
      } else {
        toast.error(data.error || "Failed to load inventory products");
      }
    } catch {
      toast.error("Failed to load inventory products");
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.templateName.toLowerCase().includes(search.toLowerCase()) ||
          (p.templateDescription || "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading inventory products…</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 max-w-md">
        <div className="relative">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory products…"
            className="w-full pl-10 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground text-sm px-4">
          <p>
            {search
              ? "No products match your search"
              : "No inventory products yet — create SKUs under Inventory → Inventory products."}
          </p>
          {!search && (
            <Link
              href="/dashboard/inventory/products"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Open inventory products
            </Link>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((row) => {
            const card = inventoryProductToTemplateSellCard(row);
            const fieldCount = card.fieldsSchema.filter((f) => f.type !== "group").length;
            const inCart = stockCart.some(
              (sc) => sc.templateId === row.templateId && (sc.catalogItemId ?? "") === row.id
            );
            return (
              <div
                key={row.id}
                className={cn(
                  "relative bg-card border rounded-xl p-4 transition-all hover:shadow-md",
                  inCart ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"
                )}
                style={{
                  borderTopColor: row.templateColor || undefined,
                  borderTopWidth: row.templateColor ? "4px" : "1px",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground flex-1 min-w-0 leading-snug" title={row.name}>
                    {row.templateIcon && <span className="mr-1.5">{row.templateIcon}</span>}
                    {row.name}
                  </h3>
                  {inCart && (
                    <span className="shrink-0 flex h-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-2">
                      In cart
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-2 truncate" title={row.templateName}>
                  Template: {row.templateName}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.25rem]">
                  {row.templateDescription || `${fieldCount} field${fieldCount !== 1 ? "s" : ""}`}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    <strong className="text-foreground tabular-nums">{row.availableQty}</strong>
                    <span>qty</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {row.multiSellEnabled && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-full inline-flex items-center font-medium">
                      <Eye className="w-3 h-3 mr-1" />
                      Multi×{row.multiSellMax}
                    </span>
                  )}
                  {row.cooldownEnabled && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] rounded-full inline-flex items-center font-medium">
                      <Clock className="w-3 h-3 mr-1" />
                      {row.cooldownDurationHours}h
                    </span>
                  )}
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded-full font-medium",
                      row.isActive && row.templateIsActive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {row.isActive && row.templateIsActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={inCart || !row.isActive || !row.templateIsActive}
                  onClick={() =>
                    onAddTemplate(card, {
                      id: row.id,
                      name: row.name,
                      codesCount: row.codesCount,
                      stockCount: row.stockCount,
                      availableQty: row.availableQty,
                    })
                  }
                  title={
                    !row.isActive || !row.templateIsActive
                      ? "Inactive product or template"
                      : undefined
                  }
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    inCart || !row.isActive || !row.templateIsActive
                      ? "bg-muted text-muted-foreground cursor-default"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  )}
                >
                  {inCart ? (
                    "Added"
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to cart
                    </>
                  )}
                </button>
              </div>
            );
          })}
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
  onPickProduct,
  emptyMessage,
}: {
  products: Product[];
  onProductClick: (p: Product) => void;
  onPickProduct?: (p: Product) => void;
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

  const colTemplate = onPickProduct
    ? "grid-cols-[minmax(0,1fr)_72px_80px_72px_108px] sm:grid-cols-[minmax(0,1fr)_88px_80px_72px_108px]"
    : "grid-cols-[minmax(0,1fr)_72px_80px_72px_76px] sm:grid-cols-[minmax(0,1fr)_88px_80px_72px_76px]";

  return (
    <div ref={scrollRef} className="max-h-[min(68vh,720px)] min-h-[280px] overflow-auto">
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-20 grid items-center gap-1 border-b border-border bg-muted/95 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm",
        colTemplate
      )}>
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
              className={cn(
                "absolute left-0 top-0 grid w-full items-center gap-1 border-b border-border/70 bg-card text-sm hover:bg-muted/50",
                colTemplate
              )}
              style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
            >
              <div className="min-w-0 truncate pl-1 font-medium text-foreground">{product.name}</div>
              <div className="hidden truncate text-center font-mono text-[11px] text-muted-foreground sm:block">
                {product.sku || "—"}
              </div>
              <div className="text-right tabular-nums font-semibold">{formatCurrency(productPrice(product))}</div>
              <div className="text-right text-xs text-muted-foreground tabular-nums">{stockLabel(product)}</div>
              <div className="flex items-center justify-end gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => onProductClick(product)}
                  className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground shadow hover:bg-primary/90"
                >
                  Add
                </button>
                {onPickProduct && product.inventoryTemplateId && (
                  <button
                    type="button"
                    title="Browse & pick specific inventory lines"
                    onClick={() => onPickProduct(product)}
                    className="rounded-md border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                  </button>
                )}
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
// Inventory Picker Modal — browse + checkbox-select specific inventory lines
// ============================================================================

function InventoryPickerModal({
  target,
  alreadyInCartIds,
  onAdd,
  onClose,
}: {
  target: InventoryPickTarget;
  alreadyInCartIds: string[];
  onAdd: (product: Product, variant: Variant | null, items: Array<{ id: string; values: Record<string, unknown> }>) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Array<{ id: string; values: Record<string, unknown> }>>([]);
  const [loadingPicker, setLoadingPicker] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fieldsSchema = useMemo(
    () => (Array.isArray(target.product.fieldsSchema) ? target.product.fieldsSchema : []),
    [target.product.fieldsSchema]
  );
  const cartSet = useMemo(() => new Set(alreadyInCartIds), [alreadyInCartIds]);

  useEffect(() => {
    void (async () => {
      setLoadingPicker(true);
      try {
        const params = new URLSearchParams({
          productId: target.product.id,
          status: "available",
          sortOrder: "asc",
          sortBy: "createdAt",
          limit: "400",
        });
        if (target.variant?.id) params.set("variantId", target.variant.id);
        const res = await fetch(`/api/inventory?${params}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setRows(data.data as Array<{ id: string; values: Record<string, unknown> }>);
        }
      } catch { /* silent */ }
      finally { setLoadingPicker(false); }
    })();
  }, [target.product.id, target.variant?.id]);

  const summaries = useMemo(
    () =>
      rows.map((r) => {
        const { fieldSummaries, flatPreview } = summarizeInventoryValues(r.values, fieldsSchema);
        return { id: r.id, fieldSummaries, flatPreview, values: r.values };
      }),
    [rows, fieldsSchema]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((s) => s.flatPreview.toLowerCase().includes(q));
  }, [summaries, search]);

  const availableFiltered = useMemo(
    () => filtered.filter((s) => !cartSet.has(s.id)),
    [filtered, cartSet]
  );
  const allSelected = availableFiltered.length > 0 && availableFiltered.every((s) => selected.has(s.id));

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        availableFiltered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        availableFiltered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleAdd = () => {
    const picked = rows.filter((r) => selected.has(r.id));
    onAdd(target.product, target.variant, picked);
  };

  const selectedCount = selected.size;
  const variantSuffix =
    target.variant && Object.keys(target.variant.optionCombination).length > 0
      ? " · " + Object.values(target.variant.optionCombination).join(" / ")
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Pick inventory lines</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {target.product.name}{variantSuffix}
              {!loadingPicker && <> · <strong className="text-foreground">{rows.length}</strong> available</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar: search + select-all */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter items…"
            className="flex-1 px-3 py-2 text-sm bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={toggleAll}
            disabled={availableFiltered.length === 0}
            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap disabled:opacity-40 disabled:no-underline"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingPicker ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading items…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {search ? "No items match your filter" : "No available inventory items"}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((item) => {
                const inCart = cartSet.has(item.id);
                const isSelected = selected.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "relative group flex items-start gap-3 px-4 py-2.5 transition-colors select-none",
                      inCart
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary/5 cursor-pointer"
                        : "hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => !inCart && toggleSelect(item.id)}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                        isSelected || inCart
                          ? "bg-primary border-primary"
                          : "border-input group-hover:border-primary/60"
                      )}
                    >
                      {(isSelected || inCart) && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Preview text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {item.flatPreview || <span className="text-muted-foreground italic">—</span>}
                      </p>
                      {inCart && (
                        <p className="text-[10px] text-muted-foreground">Already in cart</p>
                      )}
                    </div>

                    {/* Hover tooltip — full field values */}
                    {item.fieldSummaries.length > 0 && (
                      <div className={cn(
                        "invisible opacity-0 group-hover:visible group-hover:opacity-100",
                        "transition-all duration-100 pointer-events-none",
                        "absolute z-50 right-3 top-full mt-1 w-72 p-3",
                        "rounded-xl border border-border bg-popover shadow-xl text-[11px]"
                      )}>
                        <ul className="space-y-1">
                          {item.fieldSummaries.map((s) => (
                            <li key={s.fieldLabel} className="flex gap-2 leading-snug">
                              <span className="shrink-0 font-semibold text-foreground">{s.fieldLabel}:</span>
                              <span className="text-muted-foreground break-all">{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0 bg-card rounded-b-2xl">
          <span className="text-sm text-muted-foreground tabular-nums">
            {selectedCount > 0 ? (
              <>
                <strong className="text-foreground">{selectedCount}</strong> selected
              </>
            ) : (
              "None selected"
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedCount === 0}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Add {selectedCount > 0 ? selectedCount : ""} to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Template stock shortage modal — 3-tab: Sell directly / Fulfill directly / Pending
// ============================================================================

function StockTemplateShortageModal({
  draft,
  processing,
  onClose,
  onSellAvailable,
  onCreatePending,
  onFulfillAndSell,
}: {
  draft: {
    items: Array<{
      lineKey: string;
      templateId: string;
      catalogItemId: string | null;
      templateName: string;
      fieldsSchema: Array<{
        name: string;
        label: string;
        type: string;
        wholeFieldIsOneItem?: boolean;
      }>;
      requested: number;
      available: number;
      shortage: number;
      requestedCodes: number;
      availableCodes: number;
      shortageCodes: number;
    }>;
  };
  processing: boolean;
  onClose: () => void;
  onSellAvailable: () => void | Promise<void>;
  onCreatePending: () => void | Promise<void>;
  onFulfillAndSell: (
    entries: Array<{
      templateId: string;
      catalogItemId?: string | null;
      templateName: string;
      itemsForSale: Array<{ values: Record<string, string> }>;
      itemsSurplus?: Array<{ values: Record<string, string> }>;
    }>
  ) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"sell" | "fulfill" | "pending">("sell");

  // For "Fulfill directly" tab — per-template, per-field textarea values
  const [fulfillValues, setFulfillValues] = useState<Record<string, Record<string, string>>>({});

  const shortageItems = draft.items;
  const totalAvailable = shortageItems.reduce((s, i) => s + i.available, 0);
  const totalRequested = shortageItems.reduce((s, i) => s + i.requested, 0);
  const totalAvailCodes = shortageItems.reduce((s, i) => s + i.availableCodes, 0);
  const totalReqCodes = shortageItems.reduce((s, i) => s + i.requestedCodes, 0);

  const handleFulfillSubmit = () => {
    const entries: Array<{
      templateId: string;
      catalogItemId?: string | null;
      templateName: string;
      itemsForSale: Array<{ values: Record<string, string> }>;
      itemsSurplus?: Array<{ values: Record<string, string> }>;
    }> = [];

    for (const item of shortageItems) {
      const fieldVals = fulfillValues[item.lineKey] || {};
      const fieldNames = item.fieldsSchema.map((f) => f.name);
      const linesByField: Record<string, string[]> = {};
      let maxLines = 0;
      for (const fname of fieldNames) {
        const raw = (fieldVals[fname] || "").trim();
        const lines = raw ? raw.split("\n").map((l) => l.trim()).filter(Boolean) : [];
        linesByField[fname] = lines;
        maxLines = Math.max(maxLines, lines.length);
      }

      if (maxLines === 0) continue;

      const needBundles = item.shortage > 0 ? item.shortage : maxLines;
      const rowsForSale: Array<{ values: Record<string, string> }> = [];
      const rowsSurplus: Array<{ values: Record<string, string> }> = [];
      for (let i = 0; i < maxLines; i++) {
        const values: Record<string, string> = {};
        for (const fname of fieldNames) {
          values[fname] = linesByField[fname]?.[i] || "";
        }
        const row = { values };
        if (i < needBundles) rowsForSale.push(row);
        else rowsSurplus.push(row);
      }

      entries.push({
        templateId: item.templateId,
        catalogItemId: item.catalogItemId,
        templateName: item.templateName,
        itemsForSale: rowsForSale,
        ...(rowsSurplus.length > 0 ? { itemsSurplus: rowsSurplus } : {}),
      });
    }

    if (entries.length === 0 || entries.every((e) => e.itemsForSale.length === 0)) {
      toast.error("Please paste at least one code to fulfill");
      return;
    }

    void onFulfillAndSell(entries);
  };

  const tabs = [
    { key: "sell" as const, label: "Sell directly" },
    { key: "fulfill" as const, label: "Fulfill directly" },
    { key: "pending" as const, label: "Pending order" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-foreground">Stock Shortage</h3>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Units: {totalAvailable}/{totalRequested} available
            {totalReqCodes > 0 && (
              <span className="block mt-1">
                Codes: {totalAvailCodes}/{totalReqCodes} in pool (short {Math.max(0, totalReqCodes - totalAvailCodes)})
              </span>
            )}
          </p>

          {/* Shortage breakdown */}
          <div className="mt-3 space-y-1.5">
            {shortageItems.map((item) => (
              <div key={item.lineKey} className="flex flex-col gap-0.5 text-xs p-2 bg-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{item.templateName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    units {item.available}/{item.requested}
                    <span className="text-warning font-medium ml-1">(-{item.shortage})</span>
                  </span>
                </div>
                <span className="text-muted-foreground tabular-nums">
                  codes {item.availableCodes}/{item.requestedCodes}
                  {item.shortageCodes > 0 && (
                    <span className="text-warning font-medium ml-1">(-{item.shortageCodes})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "sell" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sell only what you can fulfill now ({totalAvailable} units, {totalAvailCodes} codes). Order completes
                immediately with partial fulfillment.
              </p>
              <button
                type="button"
                onClick={() => void onSellAvailable()}
                disabled={processing}
                className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? "Processing…" : `Sell available (${totalAvailable} units)`}
              </button>
            </div>
          )}

          {activeTab === "fulfill" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste codes (one per line per field). The first lines up to the shortage count are used to complete the
                sale; any extra lines are added as available stock only.
              </p>
              {shortageItems.map((item) => (
                <div key={item.lineKey} className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">{item.templateName}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Need {item.shortage} more unit{item.shortage !== 1 ? "s" : ""} and {item.shortageCodes} more code
                    {item.shortageCodes !== 1 ? "s" : ""}. Paste one code per line per field (unless the field is
                    &quot;whole field one item&quot; — then one pasted block = one unit):
                  </p>
                  <div className="grid gap-2">
                    {item.fieldsSchema.map((field) => (
                      <div key={field.name}>
                        <label className="text-xs font-medium text-foreground mb-1 block">
                          {field.label}
                        </label>
                        <textarea
                          rows={Math.min(item.shortage, 6)}
                          placeholder={`Paste ${field.label} codes (one per line)…`}
                          value={fulfillValues[item.lineKey]?.[field.name] || ""}
                          onChange={(e) =>
                            setFulfillValues((prev) => ({
                              ...prev,
                              [item.lineKey]: {
                                ...(prev[item.lineKey] || {}),
                                [field.name]: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleFulfillSubmit}
                disabled={processing}
                className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? "Processing…" : "Add to inventory & sell all"}
              </button>
            </div>
          )}

          {activeTab === "pending" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a pending order for all {totalRequested} units. Available stock ({totalAvailable}) will be delivered now; the rest will be fulfilled later from the Orders page.
              </p>
              <button
                type="button"
                onClick={() => void onCreatePending()}
                disabled={processing}
                className="w-full py-3 bg-warning/20 text-warning hover:bg-warning/30 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? "Processing…" : `Create pending order (${totalRequested} units)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Shortage Modal (products)
// ============================================================================

function ShortageModal({
  data,
  cart,
  processing,
  onSellAvailable,
  onCreatePending,
  onAddInventoryAndComplete,
  onCancel,
}: {
  data: { items: ShortageInfo[]; potentialDelivery: any[] };
  cart: CartItem[];
  processing: boolean;
  onSellAvailable: () => void;
  onCreatePending: () => void;
  onAddInventoryAndComplete: () => void;
  onCancel: () => void;
}) {
  const availableSum = data.items.reduce((s, i) => s + i.available, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">نقص في المخزون</h3>
        <p className="text-sm text-muted-foreground mb-4">
          بعض المنتجات أقل من الكمية المطلوبة. اختر كيف تريد إتمام البيع:
        </p>

        <div className="space-y-2 mb-6">
          {data.items.map((item) => (
            <div key={item.productId} className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm font-medium text-foreground">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                مطلوب: {item.requested} · متاح: {item.available} ·{" "}
                <span className="text-warning">النقص: {item.shortage}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onSellAvailable}
            disabled={processing}
            className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {processing
              ? "جاري المعالجة…"
              : `بيع المتاح فقط (${availableSum} وحدة) — إتمام الطلب بالمخزون الحالي`}
          </button>
          <button
            type="button"
            onClick={onCreatePending}
            disabled={processing}
            className="w-full py-3 bg-warning/20 text-warning hover:bg-warning/30 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {processing ? "جاري المعالجة…" : "طلب معلّق — تسليم الباقي لاحقاً من الطلبات"}
          </button>
          <button
            type="button"
            onClick={onAddInventoryAndComplete}
            disabled={processing}
            className="w-full py-3 border border-border bg-card hover:bg-muted font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {processing
              ? "جاري المعالجة…"
              : "إنشاء مخزون تلقائياً (قيم مؤقتة) وإتمام البيع"}
          </button>
          <div className="text-center">
            <Link href="/dashboard/products" className="text-xs font-medium text-primary hover:underline">
              أو أدِر منتجات المتجر من «المنتجات»
            </Link>
            <span className="text-muted-foreground mx-1">·</span>
            <Link href="/dashboard/orders" className="text-xs text-muted-foreground hover:underline">
              الطلبات
            </Link>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            إلغاء والرجوع للسلة
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

      {result.stockLinesSold != null && result.stockLinesSold > 0 && result.deliveryItems.length === 0 && (
        <div className="mb-5 p-4 bg-muted/60 rounded-lg border border-border text-center">
          <p className="text-sm font-medium text-foreground">
            {result.stockLinesSold} inventory line{result.stockLinesSold === 1 ? "" : "s"} sold
          </p>
          {(result.stockSaleGrandTotal != null || result.order?.total != null) && (
            <p className="text-lg font-bold text-foreground tabular-nums mt-2">
              {formatCurrency(
                String(
                  result.stockSaleGrandTotal != null ? result.stockSaleGrandTotal : result.order.total
                )
              )}
            </p>
          )}
          {result.stockTemplateOrderCount != null && result.stockTemplateOrderCount > 1 && (
            <p className="text-xs text-muted-foreground mt-2">
              {result.stockTemplateOrderCount} orders created (one per template)
            </p>
          )}
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
                          .filter(([k]) => k !== "_metadata" && k !== "values")
                          .map(([k, v]) => {
                            const s =
                              v !== null && typeof v === "object"
                                ? JSON.stringify(v)
                                : String(v ?? "");
                            return `${k}: ${s}`;
                          })
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

