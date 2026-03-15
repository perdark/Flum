import { cn, formatCurrency } from '@/lib/utils';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/config/constants';

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
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  const formatted = formatCurrency(amount, currency, locale);

  return (
    <span className={cn('font-semibold', className)}>
      {formatted}
    </span>
  );
}

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
      <span className="text-lg font-bold text-text">
        {formatCurrency(price, currency, locale)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-text-muted line-through">
            {formatCurrency(compareAtPrice!, currency, locale)}
          </span>
          <span className="text-sm font-semibold text-accent-orange">
            {Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)}% OFF
          </span>
        </>
      )}
    </div>
  );
}
