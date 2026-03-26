import { cn, formatCurrency } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number | string;
  currency?: CurrencyCode;
  locale?: string;
  showCurrency?: boolean;
  className?: string;
}

/**
 * Display formatted currency value
 */
export function CurrencyDisplay({
  amount,
  currency = 'USD',
  locale = 'en-US',
  showCurrency = true,
  className,
}: CurrencyDisplayProps) {
  const formatted = formatCurrency(amount, currency, locale);

  return (
    <span className={cn('font-semibold text-foreground', className)}>
      {formatted}
    </span>
  );
}

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'EGP';

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  currency?: CurrencyCode;
  locale?: string;
  className?: string;
}

/**
 * Display price with optional discount comparison
 */
export function PriceDisplay({
  price,
  compareAtPrice,
  currency = 'USD',
  locale = 'en-US',
  className,
}: PriceDisplayProps) {
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="text-lg font-bold text-foreground">
        {formatCurrency(price, currency, locale)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(compareAtPrice!, currency, locale)}
          </span>
          <span className="text-sm font-semibold text-orange-400">
            {Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)}% OFF
          </span>
        </>
      )}
    </div>
  );
}
