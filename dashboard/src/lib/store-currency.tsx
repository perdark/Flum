"use client";

import * as React from "react";

const STORAGE_KEY = "store-currency-code";

type CurrencyInfo = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  exchangeRate: string;
};

type Ctx = {
  code: string;
  setCode: (code: string) => void;
  ready: boolean;
  /** Exchange rate relative to base currency (USD=1). Use for display conversion. */
  rate: number;
  /** Convert a base-currency amount to the selected display currency */
  convert: (baseAmount: number) => number;
  /** All available currencies */
  currencies: CurrencyInfo[];
};

const StoreCurrencyContext = React.createContext<Ctx>({
  code: "USD",
  setCode: () => {},
  ready: false,
  rate: 1,
  convert: (n) => n,
  currencies: [],
});

export function StoreCurrencyProvider({ children }: React.PropsWithChildren) {
  const [code, setCodeState] = React.useState("USD");
  const [ready, setReady] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<CurrencyInfo[]>([]);
  const [rateMap, setRateMap] = React.useState<Record<string, number>>({});

  React.useLayoutEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/currencies");
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data?.currencies)) return;

        const list: CurrencyInfo[] = json.data.currencies;
        setCurrencies(list);

        const defaultId = json.data.defaultCurrencyId as string | null;
        const defaultRow =
          (defaultId && list.find((c) => c.id === defaultId)) || list[0];
        const fallbackCode = defaultRow?.code ?? "USD";

        // Build exchange rate map
        const rates: Record<string, number> = {};
        for (const c of list) {
          rates[c.code] = Number(c.exchangeRate) || 1;
        }

        let next = fallbackCode;

        // 1. Check localStorage for user override
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored && list.some((c) => c.code === stored)) {
            next = stored;
          } else {
            // 2. Try geo-detected currency (first visit)
            const detected = json.data.detectedCurrency as string | null;
            if (detected && list.some((c) => c.code === detected)) {
              next = detected;
            }
          }
        } catch {
          /* ignore */
        }

        if (!cancelled) {
          setCodeState(next);
          setRateMap(rates);
          setReady(true);
          // Persist the auto-detected choice
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch { /* ignore */ }
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCode = React.useCallback((next: string) => {
    setCodeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const rate = rateMap[code] || 1;

  const convert = React.useCallback(
    (baseAmount: number) => baseAmount * rate,
    [rate],
  );

  const value = React.useMemo<Ctx>(
    () => ({ code, setCode, ready, rate, convert, currencies }),
    [code, setCode, ready, rate, convert, currencies],
  );

  return (
    <StoreCurrencyContext.Provider value={value}>
      {children}
    </StoreCurrencyContext.Provider>
  );
}

export function useStoreCurrency(): Ctx {
  return React.useContext(StoreCurrencyContext);
}
