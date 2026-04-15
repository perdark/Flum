"use client";

import * as React from "react";

type Ctx = {
  slug: string | null;
  open: (slug: string) => void;
  close: () => void;
};

const QuickViewContext = React.createContext<Ctx>({
  slug: null,
  open: () => {},
  close: () => {},
});

export function QuickViewProvider({ children }: React.PropsWithChildren) {
  const [slug, setSlug] = React.useState<string | null>(null);
  const open = React.useCallback((s: string) => setSlug(s), []);
  const close = React.useCallback(() => setSlug(null), []);
  const value = React.useMemo(() => ({ slug, open, close }), [slug, open, close]);
  return (
    <QuickViewContext.Provider value={value}>{children}</QuickViewContext.Provider>
  );
}

export function useQuickView(): Ctx {
  return React.useContext(QuickViewContext);
}
