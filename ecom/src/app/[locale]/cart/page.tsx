import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Zap,
  Shield,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface CartPageProps {
  params: Promise<{ locale: string }>;
}

// Mock cart items - replace with actual cart from database/localStorage
const CART_ITEMS = [
  {
    id: '1',
    product: {
      id: '1',
      name: 'Elden Ring',
      nameAr: 'إلدن رينج',
      slug: 'elden-ring',
      price: 59.99,
      compareAtPrice: 69.99,
      image: '/elden-ring.jpg',
      platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
      deliveryType: 'auto_key' as const,
    },
    quantity: 1,
    pointsReward: 60,
  },
  {
    id: '2',
    product: {
      id: '4',
      name: 'Netflix Premium 1 Month',
      nameAr: 'نتفليكس بريميوم شهر',
      slug: 'netflix-premium',
      price: 15.99,
      compareAtPrice: 19.99,
      image: '/netflix.jpg',
      platform: { name: 'Netflix', nameAr: 'نتفليكس', slug: 'netflix' },
      deliveryType: 'manual' as const,
    },
    quantity: 2,
    pointsReward: 16,
  },
  {
    id: '3',
    product: {
      id: '7',
      name: 'ChatGPT Plus Subscription',
      nameAr: 'اشتراك شات جي بي تي بلس',
      slug: 'chatgpt-plus',
      price: 20,
      image: '/chatgpt.jpg',
      platform: { name: 'AI', nameAr: 'ذكاء اصطناعي', slug: 'ai' },
      deliveryType: 'auto_account' as const,
    },
    quantity: 1,
    pointsReward: 20,
  },
];

// Recommended products
const RECOMMENDED_PRODUCTS = [
  {
    id: '4',
    name: 'PlayStation Plus 12 Months',
    nameAr: 'بلايستيشن بلس 12 شهر',
    slug: 'playstation-plus-12m',
    price: 49.99,
    compareAtPrice: 59.99,
    rating: 4.6,
    ratingCount: 890,
    platform: { name: 'PlayStation', nameAr: 'بلايستيشن', slug: 'playstation' },
    pointsReward: 50,
    deliveryType: 'auto_key' as const,
  },
  {
    id: '5',
    name: 'Xbox Game Pass Ultimate',
    nameAr: 'إكس بوكس جيم باس الترا',
    slug: 'xbox-gamepass',
    price: 14.99,
    rating: 4.8,
    ratingCount: 2100,
    platform: { name: 'Xbox', nameAr: 'إكس بوكس', slug: 'xbox' },
    pointsReward: 15,
    deliveryType: 'auto_key' as const,
  },
];

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'سلة التسوق | فولمن إمباير' : 'Shopping Cart | Fulmen Empire',
    description: locale === 'ar' ? 'راجع سلة التسوق الخاصة بك' : 'Review your shopping cart',
  };
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  // Calculate totals
  const subtotal = CART_ITEMS.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discount = CART_ITEMS.reduce(
    (sum, item) =>
      sum +
      ((item.product.compareAtPrice || item.product.price) - item.product.price) *
        item.quantity,
    0
  );
  const tax = 0; // No tax for digital products
  const total = subtotal - discount + tax;
  const totalPoints = CART_ITEMS.reduce(
    (sum, item) => sum + item.pointsReward * item.quantity,
    0
  );

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="py-8 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 text-sm text-text-muted mb-4">
            <Link href={`/${locale}`} className="hover:text-primary transition-colors">
              {locale === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <span className="text-text">
              {locale === 'ar' ? 'سلة التسوق' : 'Shopping Cart'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {locale === 'ar' ? 'سلة التسوق' : 'Shopping Cart'}
              </h1>
              <p className="text-text-muted">
                {locale === 'ar'
                  ? `${CART_ITEMS.length} منتجات في سلتك`
                  : `${CART_ITEMS.length} item${CART_ITEMS.length > 1 ? 's' : ''} in your cart`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {CART_ITEMS.length === 0 ? (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-background-lighter flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-text-muted" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                {locale === 'ar' ? 'سلة التسوق فارغة' : 'Your cart is empty'}
              </h2>
              <p className="text-text-muted mb-8">
                {locale === 'ar'
                  ? 'يبدو أنك لم تضف أي منتجات بعد. ابدأ التسوق الآن!'
                  : "Looks like you haven't added any products yet. Start shopping now!"}
              </p>
              <Link href={`/${locale}/products`}>
                <Button variant="primary" size="lg" className="btn-electric gap-2">
                  {locale === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
                  <ArrowRight className={cn('w-5 h-5', isRTL && 'rotate-180')} />
                </Button>
              </Link>
            </Card>
          </div>
        </section>
      ) : (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-6">
                {CART_ITEMS.map((item, index) => (
                  <CartItem key={item.id} item={item} locale={locale} index={index} />
                ))}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  {/* Order Summary Card */}
                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        {locale === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                      </h2>

                      {/* Coupon Code */}
                      <div className="mb-6">
                        <label className="text-sm font-medium mb-2 block">
                          {locale === 'ar' ? 'كود الخصم' : 'Coupon Code'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={locale === 'ar' ? 'أدخل الكود' : 'Enter code'}
                            className={cn(
                              'flex-1 px-4 py-3 bg-background border border-border rounded-xl',
                              'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                              'placeholder:text-text-muted text-sm'
                            )}
                          />
                          <Button variant="outline" className="shrink-0">
                            {locale === 'ar' ? 'تطبيق' : 'Apply'}
                          </Button>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">
                            {locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                          </span>
                          <CurrencyDisplay amount={subtotal} />
                        </div>

                        {discount > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-success">
                              {locale === 'ar' ? 'الخصم' : 'Discount'}
                            </span>
                            <span className="text-success font-medium">
                              -<CurrencyDisplay amount={discount} />
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">
                            {locale === 'ar' ? 'الضريبة' : 'Tax'}
                          </span>
                          <span>{locale === 'ar' ? 'غير مطبق' : 'N/A'}</span>
                        </div>

                        {totalPoints > 0 && (
                          <div className="flex items-center justify-between p-3 bg-accent-amber/10 rounded-xl">
                            <span className="text-sm font-medium text-accent-amber flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              {locale === 'ar' ? 'النقاط المكسبة' : 'Points Earned'}
                            </span>
                            <span className="font-bold text-accent-amber">
                              +{totalPoints}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="border-t border-border/50 pt-4 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">
                            {locale === 'ar' ? 'المجموع' : 'Total'}
                          </span>
                          <CurrencyDisplay
                            amount={total}
                            className="text-2xl font-bold text-primary"
                          />
                        </div>
                        {discount > 0 && (
                          <p className="text-xs text-success mt-1">
                            {locale === 'ar'
                              ? `توفر $${discount.toFixed(2)} على هذا الطلب`
                              : `You save $${discount.toFixed(2)} on this order`}
                          </p>
                        )}
                      </div>

                      {/* Checkout Button */}
                      <Link href={`/${locale}/checkout`} className="block">
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full btn-electric lightning-glow gap-2"
                        >
                          {locale === 'ar' ? 'إتمام الشراء' : 'Proceed to Checkout'}
                          <ArrowRight className={cn('w-5 h-5', isRTL && 'rotate-180')} />
                        </Button>
                      </Link>

                      <Link href={`/${locale}/products`}>
                        <Button variant="ghost" className="w-full">
                          {locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Trust Badges */}
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-xs font-medium">
                            {locale === 'ar' ? 'دفع آمن' : 'Secure Payment'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-accent-amber/10 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-accent-amber" />
                          </div>
                          <p className="text-xs font-medium">
                            {locale === 'ar' ? 'توصيل فوري' : 'Instant Delivery'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-success/10 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-success" />
                          </div>
                          <p className="text-xs font-medium">
                            {locale === 'ar' ? 'دعم 24/7' : '24/7 Support'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            {RECOMMENDED_PRODUCTS.length > 0 && (
              <section className="mt-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {locale === 'ar' ? 'قد يعجبك أيضاً' : 'You might also like'}
                    </h2>
                    <p className="text-text-muted text-sm">
                      {locale === 'ar'
                        ? 'منتجات موصى بها بناءً على سلتك'
                        : 'Recommended products based on your cart'}
                    </p>
                  </div>
                  <Link href={`/${locale}/products`}>
                    <Button variant="ghost" className="gap-2">
                      {locale === 'ar' ? 'عرض الكل' : 'View All'}
                      <ArrowRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {RECOMMENDED_PRODUCTS.map((product) => (
                    <RecommendedProduct key={product.id} product={product} locale={locale} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function CartItem({
  item,
  locale,
  index,
}: {
  item: typeof CART_ITEMS[number];
  locale: string;
  index: number;
}) {
  const isRTL = locale === 'ar';

  return (
    <Card className="card-interactive overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-4 p-4">
          {/* Product Image */}
          <Link
            href={`/${locale}/products/${item.product.slug}`}
            className="shrink-0"
          >
            <div className="relative w-full sm:w-28 aspect-square sm:aspect-auto sm:h-28 bg-background-lighter rounded-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                {item.product.platform.slug === 'steam' && '🎮'}
                {item.product.platform.slug === 'netflix' && '🎬'}
                {item.product.platform.slug === 'ai' && '🤖'}
              </div>
              {/* Quantity Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-lg text-xs font-medium">
                ×{item.quantity}
              </div>
            </div>
          </Link>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" size="sm">
                    {isRTL
                      ? item.product.platform.nameAr
                      : item.product.platform.name}
                  </Badge>
                  {item.product.deliveryType === 'auto_key' && (
                    <Badge variant="success" size="sm">
                      {locale === 'ar' ? 'توصيل فوري' : 'Instant'}
                    </Badge>
                  )}
                </div>
                <Link href={`/${locale}/products/${item.product.slug}`}>
                  <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1 mb-1">
                    {isRTL ? item.product.nameAr : item.product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-3 flex-wrap">
                  <PriceDisplay
                    price={item.product.price}
                    compareAtPrice={item.product.compareAtPrice}
                  />
                  {item.pointsReward > 0 && (
                    <span className="text-xs text-accent-amber flex items-center gap-0.5">
                      <Zap className="w-3 h-3" />
                      +{item.pointsReward * item.quantity}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-text-muted hover:text-error hover:bg-error/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Quantity Controls & Total */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button
                  className="w-10 h-10 flex items-center justify-center hover:bg-background-lighter transition-colors"
                  aria-label={locale === 'ar' ? 'إنقاص' : 'Decrease'}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <button
                  className="w-10 h-10 flex items-center justify-center hover:bg-background-lighter transition-colors"
                  aria-label={locale === 'ar' ? 'زيادة' : 'Increase'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs text-text-muted mb-0.5">
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </p>
                <CurrencyDisplay
                  amount={item.product.price * item.quantity}
                  className="text-lg font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendedProduct({
  product,
  locale,
}: {
  product: typeof RECOMMENDED_PRODUCTS[number];
  locale: string;
}) {
  const isRTL = locale === 'ar';

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="block group">
      <Card className="card-glow h-full">
        <CardContent className="p-4">
          {/* Image */}
          <div className="relative aspect-square bg-background-lighter rounded-xl overflow-hidden mb-4">
            <div className="absolute inset-0 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300">
              {product.platform.slug === 'playstation' && '🎯'}
              {product.platform.slug === 'xbox' && '🟢'}
            </div>

            {/* Quick Add Button */}
            <button className="absolute bottom-2 right-2 w-10 h-10 rounded-xl bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-xs text-primary">
              {isRTL ? product.platform.nameAr : product.platform.name}
            </p>
            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {isRTL ? product.nameAr : product.name}
            </h3>
            <div className="flex items-center justify-between">
              <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} />
              {product.pointsReward > 0 && (
                <span className="text-xs text-accent-amber">
                  +{product.pointsReward} ⚡
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
