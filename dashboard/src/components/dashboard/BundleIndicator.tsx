"use client";

/**
 * Bundle Indicator Component
 *
 * Displays a visual indicator that a product is a bundle,
 * optionally showing the number of items in the bundle
 */

interface BundleIndicatorProps {
  isBundle: boolean;
  itemCount?: number;
  className?: string;
  showLabel?: boolean;
}

export function BundleIndicator({
  isBundle,
  itemCount,
  className = "",
  showLabel = true,
}: BundleIndicatorProps) {
  if (!isBundle) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-950 text-purple-400 border border-purple-900 ${className}`}
      title="This is a bundle product containing multiple items"
    >
      <span>📦</span>
      {showLabel && <span>Bundle</span>}
      {itemCount !== undefined && itemCount > 0 && (
        <span className="bg-purple-900/50 px-1.5 rounded-full text-xs">
          {itemCount}
        </span>
      )}
    </span>
  );
}

/**
 * Compact version for cards - shows icon only
 */
export function CompactBundleIndicator({ isBundle }: { isBundle: boolean }) {
  if (!isBundle) {
    return null;
  }

  return (
    <span className="text-purple-400" title="Bundle Product">
      📦
    </span>
  );
}

/**
 * Badge for product list showing bundle composition summary
 */
interface BundleBadgeProps {
  fieldCount?: number;
  totalItems?: number;
}

export function BundleBadge({ fieldCount, totalItems }: BundleBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-950 text-purple-400 border border-purple-900">
        📦 Bundle
      </span>
      {fieldCount && (
        <span className="text-xs text-slate-500">{fieldCount} fields</span>
      )}
      {totalItems && (
        <span className="text-xs text-slate-500">{totalItems} items</span>
      )}
    </div>
  );
}
