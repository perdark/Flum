"use client";

import { useEffect, useState } from "react";
import { useStoreCurrency } from "@/lib/store-currency";
import { cn } from "@/lib/utils";

type Row = { id: string; code: string; symbol: string; name: string };

export function CurrencySelector({
  className,
  /** When true, always show (e.g. mobile menu); default hides until `md`. */
  inline = false,
}: {
  className?: string;
  inline?: boolean;
}) {
  const { code, setCode, ready } = useStoreCurrency();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/store/currencies")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data?.currencies)) {
          setRows(j.data.currencies);
        }
      })
      .catch(() => {});
  }, []);

  if (!ready || rows.length <= 1) return null;

  return (
    <div className={cn(!inline && "hidden md:block", className)}>
      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="h-9 max-w-[5.5rem] cursor-pointer rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Currency"
      >
        {rows.map((c) => (
          <option key={c.id} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}
