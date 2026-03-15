import { Metadata } from 'next';
import Link from 'next/link';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PriceDisplay } from '@/components/ui/currency-display';
import { RatingStars } from '@/components/ui/rating-stars';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface WishlistPageProps {
  params: Promise<{ locale: string }>;
};

// Mock wishlist items
const WISHLIST_ITEMS = [
  {
    id: '1',
    product: {
      id: '1',
      name: 'Elden Ring',
      nameAr: 'إلدن رينج',
      slug: 'elden-ring',
      price: 59.99,
      compareAtPrice: 69.99,
      rating: 4.8,
      ratingCount: 1250,
      image: '/elden-ring.jpg',
      platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
    },
    platformId: 'steam',
    priceAlert: 55,
    addedAt: '2024-03-01',
  },
  {
    id: '3',
    product: {
      id: '3',
      name: 'Baldur\'s Gate 3',
      nameAr: 'بالدور جيت 3',
      slug: 'baldurs-gate-3',
      price: 59.99,
      rating: 4.9,
      ratingCount: 2100,
      image: '/bg3.jpg',
      platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
    },
    platformId: 'steam',
    priceAlert: null,
    addedAt: '2024-03-05',
  },
  {
    id: '7',
    product: {
      id: '7',
      name: 'ChatGPT Plus Subscription',
      nameAr: 'اشتراك شات جي بي تي بلس',
      slug: 'chatgpt-plus',
      price: 20,
      rating: 4.9,
      ratingCount: 5400,
      image: '/chatgpt.jpg',
      platform: { name: 'AI', nameAr: 'ذكاء اصطناعي', slug: 'ai' },
    },
    platformId: 'ai',
    priceAlert: 15,
    addedAt: '2024-03-10',
  },
];

export async function generateMetadata({ params }: WishlistPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'المفضلة' : 'Wishlist',
  };
};

export default async function WishlistPage({ params }: WishlistPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Heart className="w-8 h-8 text-accent-orange" />
                {locale === 'ar' ? 'قائمة المفضلة' : 'My Wishlist'}
              </h1>
              <p className="text-text-muted">
                {locale === 'ar'
                  ? `لديك ${WISHLIST_ITEMS.length} منتجات في قائمتك`
                  : `You have ${WISHLIST_ITEMS.length} items in your wishlist`}
              </p>
            </div>
          </div>
        </div>

        {WISHLIST_ITEMS.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <h2 className="text-xl font-semibold mb-2">
              {locale === 'ar' ? 'قائمة المفضلة فارغة' : 'Your wishlist is empty'}
            </h2>
            <p className="text-text-muted mb-6">
              {locale === 'ar'
                ? 'احفظ المنتجات التي تحبها لعرضها لاحقاً'
                : 'Save products you love to view later'}
            </p>
            <Link href={`/${locale}/products`}>
              <Button variant="primary">
                <ShoppingBag className="w-5 h-5 mr-2" />
                {locale === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Price Alert Notice */}
            <Card className="mb-6 bg-accent-amber/10 border-accent-amber/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {locale === 'ar' ? 'تنبيهات الأسعار' : 'Price Alerts'}
                    </h4>
                    <p className="text-sm text-text-muted">
                      {locale === 'ar'
                        ? 'سنرسل لك بريداً إلكترونياً عند انخفاض سعر المنتجات في قائمتك'
                        : 'We\'ll email you when prices drop for items in your wishlist'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {WISHLIST_ITEMS.map((item) => (
                <WishlistItem key={item.id} item={item} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WishlistItem({
  item,
  locale,
}: {
  item: typeof WISHLIST_ITEMS[number];
  locale: string;
}) {
  const isRTL = locale === 'ar';

  return (
    <Card className="group relative">
      {/* Remove Button */}
      <button
        className={cn(
          'absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-error flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity',
          isRTL && 'right-auto left-3'
        )}
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="p-4">
        <Link href={`/${locale}/products/${item.product.slug}`} className="block">
          {/* Product Image */}
          <div className="relative aspect-square bg-background-lighter rounded-lg overflow-hidden mb-4">
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              🎮
            </div>
            {item.product.compareAtPrice && (
              <div className="absolute top-2 left-2">
                <span className="bg-accent-orange text-white text-xs font-bold px-2 py-1 rounded">
                  -{Math.round(((item.product.compareAtPrice - item.product.price) / item.product.compareAtPrice) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="text-xs text-primary mb-1">
            {isRTL ? item.product.platform.nameAr : item.product.platform.name}
          </div>
          <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {isRTL ? item.product.nameAr : item.product.name}
          </h3>

          <PriceDisplay
            price={item.product.price}
            compareAtPrice={item.product.compareAtPrice}
          />

          <RatingStars rating={item.product.rating} count={item.product.ratingCount} size="sm" />
        </Link>

        {/* Price Alert */}
        {item.priceAlert && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-accent-amber">
              <span>🔔</span>
              <span>
                {locale === 'ar'
                  ? `تنبيه عند ${item.priceAlert}$`
                  : `Alert at $${item.priceAlert}`}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="primary" size="sm" className="flex-1">
            <ShoppingBag className="w-4 h-4 mr-1" />
            {locale === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
