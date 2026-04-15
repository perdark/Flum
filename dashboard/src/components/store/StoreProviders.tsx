"use client";

import type { ReactNode } from "react";
import { StoreThemeProvider } from "@/lib/store-theme";
import { StoreCurrencyProvider } from "@/lib/store-currency";
import { CustomerProvider } from "@/lib/customer-context";
import { CartProvider } from "@/lib/cart-store";
import { QuickViewProvider, useQuickView } from "@/lib/quick-view-store";
import { CartDrawer } from "@/components/store/CartDrawer";
import { QuickViewModal } from "@/components/store/QuickViewModal";

function QuickViewBridge() {
  const { slug, close } = useQuickView();
  return <QuickViewModal slug={slug} onClose={close} />;
}

export function StoreProviders({ children }: { children: ReactNode }) {
  return (
    <StoreThemeProvider>
      <StoreCurrencyProvider>
        <CustomerProvider>
          <CartProvider>
            <QuickViewProvider>
              {children}
              <CartDrawer />
              <QuickViewBridge />
            </QuickViewProvider>
          </CartProvider>
        </CustomerProvider>
      </StoreCurrencyProvider>
    </StoreThemeProvider>
  );
}
