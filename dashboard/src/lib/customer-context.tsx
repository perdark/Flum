"use client";

import * as React from "react";

export type StoreCustomerPublic = {
  id: string;
  email: string;
  name: string;
  type: string;
  businessName: string | null;
};

type Ctx = {
  customer: StoreCustomerPublic | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isMerchant: boolean;
};

const CustomerContext = React.createContext<Ctx>({
  customer: null,
  loading: true,
  refresh: async () => {},
  isMerchant: false,
});

export function CustomerProvider({ children }: React.PropsWithChildren) {
  const [customer, setCustomer] = React.useState<StoreCustomerPublic | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/store/customer/me", { credentials: "include" });
      const j = await res.json();
      setCustomer(j.success && j.data ? j.data : null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo<Ctx>(
    () => ({
      customer,
      loading,
      refresh,
      isMerchant: customer?.type === "merchant",
    }),
    [customer, loading, refresh],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer(): Ctx {
  return React.useContext(CustomerContext);
}
