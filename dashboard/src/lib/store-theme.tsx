"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "store-appearance";

export type StoreAppearance = "light" | "dark";

type StoreThemeContextValue = {
  appearance: StoreAppearance;
  setAppearance: (v: StoreAppearance) => void;
  toggle: () => void;
};

const StoreThemeContext = React.createContext<StoreThemeContextValue | undefined>(
  undefined,
);

export function StoreThemeProvider({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  const [appearance, setAppearanceState] = React.useState<StoreAppearance>("dark");

  React.useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as StoreAppearance | null;
      if (stored === "light" || stored === "dark") {
        setAppearanceState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setAppearance = React.useCallback((v: StoreAppearance) => {
    setAppearanceState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setAppearanceState((prev) => {
      const next: StoreAppearance = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ appearance, setAppearance, toggle }),
    [appearance, setAppearance, toggle],
  );

  return (
    <StoreThemeContext.Provider value={value}>
      <div
        className={cn(
          "store-theme flex min-h-screen flex-col",
          appearance === "dark" && "store-dark",
          className,
        )}
      >
        {children}
      </div>
    </StoreThemeContext.Provider>
  );
}

export function useStoreTheme(): StoreThemeContextValue {
  const ctx = React.useContext(StoreThemeContext);
  if (!ctx) {
    return {
      appearance: "dark",
      setAppearance: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
