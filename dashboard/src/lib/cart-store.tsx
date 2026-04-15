"use client";

import * as React from "react";

const STORAGE_KEY = "store-cart-v1";

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  couponCode: string | null;
  couponDiscount: number;
  setCouponCode: (c: string | null) => void;
  applyCoupon: () => Promise<{ ok: boolean; error?: string }>;
  clearCoupon: () => void;
  addProduct: (input: {
    productId: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    price: number;
    quantity?: number;
  }) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  subtotal: number;
};

const CartContext = React.createContext<CartContextValue | undefined>(undefined);

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CartLine =>
        row &&
        typeof row === "object" &&
        typeof (row as CartLine).id === "string" &&
        typeof (row as CartLine).productId === "string",
    );
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }: React.PropsWithChildren) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [ready, setReady] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [couponCode, setCouponCodeState] = React.useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = React.useState(0);

  React.useLayoutEffect(() => {
    setLines(loadLines());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    persist(lines);
  }, [lines, ready]);

  const subtotal = React.useMemo(
    () => lines.reduce((s, l) => s + l.price * l.quantity, 0),
    [lines],
  );

  const itemCount = React.useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines],
  );

  const openDrawer = React.useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = React.useCallback(() => setDrawerOpen((v) => !v), []);

  const setCouponCode = React.useCallback((c: string | null) => {
    setCouponCodeState(c);
    setCouponDiscount(0);
  }, []);

  const clearCoupon = React.useCallback(() => {
    setCouponCodeState(null);
    setCouponDiscount(0);
  }, []);

  const applyCoupon = React.useCallback(async () => {
    if (!couponCode?.trim()) {
      return { ok: false, error: "Enter a code" };
    }
    try {
      const res = await fetch("/api/store/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const j = await res.json();
      if (!j.success) {
        return { ok: false, error: j.error || "Invalid coupon" };
      }
      setCouponDiscount(Number(j.data.discountAmount) || 0);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, [couponCode, subtotal]);

  const addProduct = React.useCallback(
    (input: {
      productId: string;
      slug: string;
      name: string;
      imageUrl: string | null;
      price: number;
      quantity?: number;
    }) => {
      const qty = Math.max(1, input.quantity ?? 1);
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.productId === input.productId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + qty,
            price: input.price,
            name: input.name,
            slug: input.slug,
            imageUrl: input.imageUrl,
          };
          return next;
        }
        const line: CartLine = {
          id: crypto.randomUUID(),
          productId: input.productId,
          slug: input.slug,
          name: input.name,
          imageUrl: input.imageUrl,
          price: input.price,
          quantity: qty,
        };
        return [...prev, line];
      });
      setDrawerOpen(true);
    },
    [],
  );

  const setQuantity = React.useCallback((lineId: string, quantity: number) => {
    const q = Math.max(0, Math.floor(quantity));
    setLines((prev) => {
      if (q === 0) return prev.filter((l) => l.id !== lineId);
      return prev.map((l) => (l.id === lineId ? { ...l, quantity: q } : l));
    });
  }, []);

  const removeLine = React.useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clear = React.useCallback(() => {
    setLines([]);
    clearCoupon();
  }, [clearCoupon]);

  const value = React.useMemo(
    () => ({
      lines,
      itemCount,
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      couponCode,
      couponDiscount,
      setCouponCode,
      applyCoupon,
      clearCoupon,
      addProduct,
      setQuantity,
      removeLine,
      clear,
      subtotal,
    }),
    [
      lines,
      itemCount,
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      couponCode,
      couponDiscount,
      setCouponCode,
      applyCoupon,
      clearCoupon,
      addProduct,
      setQuantity,
      removeLine,
      clear,
      subtotal,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    return {
      lines: [],
      itemCount: 0,
      drawerOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      couponCode: null,
      couponDiscount: 0,
      setCouponCode: () => {},
      applyCoupon: async () => ({ ok: false }),
      clearCoupon: () => {},
      addProduct: () => {},
      setQuantity: () => {},
      removeLine: () => {},
      clear: () => {},
      subtotal: 0,
    };
  }
  return ctx;
}
