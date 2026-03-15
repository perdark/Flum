'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  ShoppingCart,
  Heart,
  Scale,
  Eye,
  Star,
  Zap,
  ChevronDown,
  Gamepad2,
  Gamepad,
  MonitorPlay,
  Headset,
  Disc,
  Bot,
  Gem
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';
import { PriceDisplay } from '@/components/ui/currency-display';
import { cn, getLocalizedValue } from '@/lib/utils';

interface Platform {
  name: string;
  nameAr: string;
  slug: string;
  icon?: string;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  ratingCount: number;
  platform: Platform;
  isNew?: boolean;
  isFeatured?: boolean;
  onSale?: boolean;
  pointsReward: number;
  deliveryType?: 'auto_key' | 'auto_account' | 'manual' | 'contact';
  image?: string;
}

interface ProductCardProps {
  product: Product;
  locale: string;
  onAddToCart?: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  onToggleCompare?: (productId: string) => void;
  isWishlisted?: boolean;
  isComparing?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

// Extracted Platform Icon Component
function PlatformIcon({ platform }: { platform?: Platform }) {
  const platformIcons: Record<string, React.ReactNode> = {
    steam: <Gamepad2 className="w-6 h-6" />,
    playstation: <Gamepad className="w-6 h-6" />,
    ps: <Gamepad className="w-6 h-6" />,
    psn: <Gamepad className="w-6 h-6" />,
    xbox: <Gamepad className="w-6 h-6" />,
    nintendo: <Gamepad2 className="w-6 h-6" />,
    switch: <Gamepad2 className="w-6 h-6" />,
    netflix: <MonitorPlay className="w-6 h-6" />,
    spotify: <Headset className="w-6 h-6" />,
    ai: <Bot className="w-6 h-6" />,
    default: <Gem className="w-6 h-6" />,
  };

  const icon =
    (platform?.slug && platformIcons[platform.slug.toLowerCase()]) ||
    platformIcons.default;

  return <span className="text-primary flex items-center justify-center">{icon}</span>;
}

// Extracted Delivery Badge Component
function DeliveryBadge({ type, locale }: { type?: Product['deliveryType'], locale: string }) {
  if (!type) return null;

  const deliveryConfig = {
    auto_key: {
      icon: Zap,
      label: locale === 'ar' ? 'توصيل فوري' : 'Instant',
      variant: 'secondary' as const,
    },
    auto_account: {
      icon: Zap,
      label: locale === 'ar' ? 'حساب فوري' : 'Instant Account',
      variant: 'secondary' as const,
    },
    manual: {
      icon: ChevronDown,
      label: locale === 'ar' ? 'يدوي' : 'Manual',
      variant: 'outline' as const,
    },
    contact: {
      icon: null,
      label: locale === 'ar' ? 'تواصل' : 'Contact',
      variant: 'outline' as const,
    },
  };

  const config = deliveryConfig[type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      size="sm"
      className="gap-1 bg-background text-text-muted border-border"
    >
      {Icon && <Icon className="w-3 h-3 text-primary" />}
      {config.label}
    </Badge>
  );
}

export function ProductCard({
  product,
  locale,
  onAddToCart,
  onToggleWishlist,
  onToggleCompare,
  isWishlisted = false,
  isComparing = false,
  variant = 'default',
}: ProductCardProps) {
  const isRTL = locale === 'ar';
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const discountPercent =
    product.compareAtPrice && product.price < product.compareAtPrice
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  // Card Content based on variant
  if (variant === 'compact') {
    return (
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="block group"
      >
        <div className="flex gap-4 p-3 rounded-xl bg-card hover:bg-card-hover transition-all duration-300 border border-border/50 hover:border-border">
          {/* Image */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-background-lighter">
            {product.image ? (
              <img
                src={product.image}
                alt={getLocalizedValue(product.name, product.nameAr, locale)}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-500',
                  isImageLoaded && 'loaded'
                )}
                onLoad={() => setIsImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background border border-border">
                <PlatformIcon platform={product.platform} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {product.platform && (
                  <span className="text-xs text-primary">
                    {getLocalizedValue(product.platform.name, product.platform.nameAr, locale)}
                  </span>
                )}
                <DeliveryBadge type={product.deliveryType} locale={locale} />
              </div>
              <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {getLocalizedValue(product.name, product.nameAr, locale)}
              </h3>
            </div>

            <div className="flex items-center justify-between">
              <PriceDisplay
                price={product.price}
                compareAtPrice={product.compareAtPrice}
              />
              {product.pointsReward > 0 && (
                <span className="text-xs text-accent-amber flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />
                  {product.pointsReward}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default / Featured Card
  return (
    <div
      className="group"
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
    >
      <Card className="card-glow h-full overflow-hidden border-border/50">
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative aspect-square bg-background-lighter overflow-hidden">
            {/* Product Image */}
            <div className="relative z-10 w-full h-full flex items-center justify-center bg-card">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={getLocalizedValue(product.name, product.nameAr, locale)}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className={cn(
                    'object-cover transition-transform duration-500 group-hover:scale-110',
                    !isImageLoaded && 'opacity-0'
                  )}
                  onLoad={() => setIsImageLoaded(true)}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-background border border-border">
                  <PlatformIcon platform={product.platform} />
                </div>
              )}
            </div>

            {/* Badges */}
            <div className={cn(
              'absolute top-3 z-20 flex flex-col gap-2',
              isRTL ? 'right-3' : 'left-3'
            )}>
              {product.isNew && (
                <Badge variant="secondary" size="sm" className="bg-background text-text-muted border border-border">
                  {locale === 'ar' ? 'جديد' : 'NEW'}
                </Badge>
              )}
              {discountPercent > 0 && (
                <Badge variant="sale" size="sm">
                  -{discountPercent}%
                </Badge>
              )}
              {product.isFeatured && (
                <Badge variant="featured" size="sm">
                  {locale === 'ar' ? 'مميز' : 'Featured'}
                </Badge>
              )}
            </div>

            {/* Quick Actions Overlay */}
            <div
              className={cn(
                'absolute inset-0 z-20 bg-gradient-to-t from-background/90 via-background/50 to-transparent',
                'transition-opacity duration-300',
                showQuickActions ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className={cn(
                'absolute bottom-3 left-3 right-3 flex items-center justify-between',
                isRTL && 'flex-row-reverse'
              )}>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.preventDefault();
                      onAddToCart?.(product.id);
                    }}
                    className="bg-primary hover:bg-primary-hover text-white transition-colors duration-200"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleWishlist?.(product.id);
                    }}
                    className={cn(
                      'transition-colors',
                      isWishlisted && 'bg-error hover:bg-error/80'
                    )}
                  >
                    <Heart className={cn('w-4 h-4', isWishlisted && 'fill-current')} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleCompare?.(product.id);
                    }}
                    className={cn(
                      'transition-colors bg-card border-border hover:bg-border',
                      isComparing && 'bg-primary text-white hover:bg-primary-hover'
                    )}
                  >
                    <Scale className="w-4 h-4" />
                  </Button>
                </div>
                <Link href={`/${locale}/products/${product.slug}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Platform Badge */}
            <div
              className={cn(
                'absolute top-3 z-20',
                isRTL ? 'left-3' : 'right-3'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                <PlatformIcon platform={product.platform} />
              </div>
            </div>

            {/* Rating Badge */}
            {product.rating > 0 && (
              <div
                className={cn(
                  'absolute bottom-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg',
                  'bg-card border border-border text-xs font-medium',
                  showQuickActions ? 'opacity-0' : 'opacity-100',
                  'transition-opacity duration-300',
                  isRTL ? 'right-3' : 'left-3'
                )}
              >
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span>{product.rating.toFixed(1)}</span>
                <span className="text-text-muted">({product.ratingCount})</span>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4">
            {/* Platform & Delivery */}
            <div className="flex items-center justify-between mb-2">
              {product.platform && (
                <span className="text-xs text-primary font-medium">
                  {getLocalizedValue(product.platform.name, product.platform.nameAr, locale)}
                </span>
              )}
              <DeliveryBadge type={product.deliveryType} locale={locale} />
            </div>

            {/* Title */}
            <Link href={`/${locale}/products/${product.slug}`}>
              <h3 className="font-semibold mb-3 line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                {getLocalizedValue(product.name, product.nameAr, locale)}
              </h3>
            </Link>

            {/* Rating */}
            <div className="mb-3">
              <RatingStars rating={product.rating} count={product.ratingCount} size="sm" />
            </div>

            {/* Price & Actions */}
            <div className="flex items-center justify-between">
              <div>
                <PriceDisplay
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                />
                {product.pointsReward > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-accent-amber">
                    <Zap className="w-3 h-3" />
                    <span>+{product.pointsReward} {locale === 'ar' ? 'نقطة' : 'points'}</span>
                  </div>
                )}
              </div>

              <Link href={`/${locale}/products/${product.slug}`}>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-primary hover:bg-primary-hover text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  {locale === 'ar' ? 'عرض' : 'View'}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export a hook for managing product comparisons
export function useProductComparison() {
  const [compareList, setCompareList] = useState<string[]>([]);

  const toggleCompare = (productId: string) => {
    setCompareList((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : prev.length < 4
        ? [...prev, productId]
        : prev
    );
  };

  const isComparing = (productId: string) => compareList.includes(productId);

  const clearCompare = () => setCompareList([]);

  return { compareList, toggleCompare, isComparing, clearCompare };
}
