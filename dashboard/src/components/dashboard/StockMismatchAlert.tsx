/**
 * Stock Mismatch Alert Component
 *
 * Displays warnings when inventory field counts don't match across linked pairs.
 * Example: 120 codes but only 90 passwords (email+password are linked).
 */

import type { StockMismatchField } from "@/types";

interface StockMismatchAlertProps {
  mismatches: StockMismatchField[];
  sellableQuantity: number;
  fieldCounts?: Record<string, number>;
  compact?: boolean;
  className?: string;
}

export function StockMismatchAlert({
  mismatches,
  sellableQuantity,
  fieldCounts,
  compact = false,
  className = "",
}: StockMismatchAlertProps) {
  if (mismatches.length === 0) return null;

  const hasExhausted = mismatches.some((m) => m.unmatchedCount > 0 && m.totalCount === 0);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
          hasExhausted
            ? "bg-error/10 text-error border border-error/20"
            : "bg-warning/10 text-warning border border-warning/20"
        } ${className}`}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>
          {mismatches.length} mismatch{mismatches.length !== 1 ? "es" : ""} - {sellableQuantity} sellable
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        hasExhausted
          ? "bg-error/5 border-error/20"
          : "bg-warning/5 border-warning/20"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            hasExhausted ? "text-error" : "text-warning"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-medium ${
              hasExhausted ? "text-error" : "text-warning"
            }`}
          >
            Stock Mismatch Detected
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {sellableQuantity} complete item{sellableQuantity !== 1 ? "s" : ""} available for sale
          </p>
          <div className="mt-3 space-y-2">
            {mismatches.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs p-2 bg-background/50 rounded"
              >
                <div>
                  <span className="font-medium text-foreground">{m.fieldLabel}</span>
                  {m.linkedFieldName && (
                    <span className="text-muted-foreground">
                      {" "}
                      linked to <span className="font-medium">{m.linkedFieldName}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{m.totalCount}</span>
                  {m.unmatchedCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        m.totalCount === 0
                          ? "bg-error/20 text-error"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {m.unmatchedCount} unmatched
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {fieldCounts && Object.keys(fieldCounts).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Field Counts
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(fieldCounts).map(([field, count]) => (
                  <span
                    key={field}
                    className="px-1.5 py-0.5 bg-background/50 rounded text-xs text-muted-foreground"
                  >
                    {field}: <span className="font-medium text-foreground">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
