"use client";

import Link from "next/link";
import type { StoreBundleEconomics } from "@/lib/store-queries";
import { formatCurrency } from "@/lib/utils";
import { useStoreCurrency } from "@/lib/store-currency";
import { cn } from "@/lib/utils";

interface BundleContentsProps {
  economics: StoreBundleEconomics;
  bundlePrice: number;
  className?: string;
  /** When true, show full line table; otherwise summary only */
  detailed?: boolean;
}

export function BundleContents({
  economics,
  bundlePrice,
  className,
  detailed = true,
}: BundleContentsProps) {
  const { code: currency, convert } = useStoreCurrency();

  return (
    <div className={cn("rounded-xl border border-border bg-muted/20 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bundle value
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(convert(bundlePrice), currency)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              vs {formatCurrency(convert(economics.itemsTotalAtRetail), currency)} separately
            </span>
          </p>
        </div>
        {economics.savings > 0 && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Save {economics.savingsPercent}% ({formatCurrency(convert(economics.savings), currency)})
          </span>
        )}
      </div>

      {detailed && economics.lines.length > 0 && (
        <ul className="space-y-2">
          {economics.lines.map((line, i) => (
            <li
              key={`${line.productName}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
            >
              <span className="min-w-0 flex-1 text-foreground">
                {line.slug ? (
                  <Link
                    href={`/store/products/${line.slug}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {line.productName}
                  </Link>
                ) : (
                  <span className="font-medium">{line.productName}</span>
                )}
                {line.quantity > 1 && (
                  <span className="text-muted-foreground"> × {line.quantity}</span>
                )}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {formatCurrency(convert(line.lineTotal), currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!detailed && economics.includedNames.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Includes: {economics.includedNames.slice(0, 5).join(" · ")}
          {economics.includedNames.length > 5 && ` +${economics.includedNames.length - 5} more`}
        </p>
      )}
    </div>
  );
}
