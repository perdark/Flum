'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Scale, Check, AlertCircle, Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  ratingCount: number;
  category: { name: string; nameAr: string; slug: string };
  deliveryType?: string;
  image?: string;
  features?: string[];
  description?: string;
  descriptionAr?: string;
}

interface ProductComparisonProps {
  locale: string;
  products: Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function ProductComparison({
  locale,
  products,
  onRemove,
  onClear,
}: ProductComparisonProps) {
  const isRTL = locale === 'ar';

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-background-lighter flex items-center justify-center mb-6">
          <Scale className="w-12 h-12 text-text-muted" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {locale === 'ar' ? 'لا توجد منتجات للمقارنة' : 'No products to compare'}
        </h3>
        <p className="text-text-muted mb-6 max-w-md">
          {locale === 'ar'
            ? 'أضف منتجات إلى قائمة المقارنة لمقارنة المميزات والأسعار'
            : 'Add products to the comparison list to compare features and prices'}
        </p>
        <Link href={`/${locale}/products`}>
          <Button variant="primary">
            {locale === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
          </Button>
        </Link>
      </div>
    );
  }

  const getLocalizedValue = (en: string, ar: string) => (isRTL ? ar : en);

  // Comparison categories
  const comparisonSections = [
    {
      title: isRTL ? 'السعر' : 'Price',
      items: [
        {
          label: isRTL ? 'السعر' : 'Price',
          key: 'price',
          render: (product: Product) => (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                ${product.price.toFixed(2)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-text-muted line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>
          ),
        },
        {
          label: isRTL ? 'قيمة أفضل سعر' : 'Best Value',
          key: 'bestValue',
          render: (product: Product, index: number) => {
            const prices = products.map((p) => p.price);
            const minPrice = Math.min(...prices);
            const isBest = product.price === minPrice;
            return isBest ? (
              <Badge variant="success" className="gap-1">
                <Check className="w-3 h-3" />
                {isRTL ? 'أفضل قيمة' : 'Best Value'}
              </Badge>
            ) : null;
          },
        },
      ],
    },
    {
      title: isRTL ? 'التقييم' : 'Rating',
      items: [
        {
          label: isRTL ? 'التقييم' : 'Rating',
          key: 'rating',
          render: (product: Product) => (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.floor(product.rating)
                        ? 'fill-accent-amber text-accent-amber'
                        : 'fill-transparent text-text-muted'
                    )}
                  />
                ))}
              </div>
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-text-muted text-sm">
                ({product.ratingCount})
              </span>
            </div>
          ),
        },
        {
          label: isRTL ? 'الأعلى تقييماً' : 'Top Rated',
          key: 'topRated',
          render: (product: Product) => {
            const ratings = products.map((p) => p.rating);
            const maxRating = Math.max(...ratings);
            const isTop = product.rating === maxRating;
            return isTop && product.rating > 0 ? (
              <Badge variant="success" className="gap-1">
                <Check className="w-3 h-3" />
                {isRTL ? 'الأعلى تقييماً' : 'Top Rated'}
              </Badge>
            ) : null;
          },
        },
      ],
    },
    {
      title: isRTL ? 'المنصة' : 'Category',
      items: [
        {
          label: isRTL ? 'المنصة' : 'Category',
          key: 'category',
          render: (product: Product) => (
            <Badge variant="outline" className="text-sm">
              {getLocalizedValue(product.category.name, product.category.nameAr)}
            </Badge>
          ),
        },
        {
          label: isRTL ? 'التسليم' : 'Delivery',
          key: 'delivery',
          render: (product: Product) => {
            const deliveryLabels = {
              auto_key: isRTL ? 'مفتاح تلقائي' : 'Auto Key',
              auto_account: isRTL ? 'حساب تلقائي' : 'Auto Account',
              manual: isRTL ? 'يدوي' : 'Manual',
              contact: isRTL ? 'تواصل' : 'Contact',
            };
            const label = product.deliveryType
              ? deliveryLabels[product.deliveryType as keyof typeof deliveryLabels]
              : '-';
            return <span className="text-sm">{label}</span>;
          },
        },
      ],
    },
    {
      title: isRTL ? 'المميزات' : 'Features',
      items: [
        {
          label: isRTL ? 'المميزات' : 'Features',
          key: 'features',
          render: (product: Product) => (
            <ul className="space-y-2 text-sm">
              {product.features?.slice(0, 4).map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span className="text-text-muted-light">{feature}</span>
                </li>
              )) || <span className="text-text-muted">-</span>}
            </ul>
          ),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {locale === 'ar' ? 'مقارنة المنتجات' : 'Product Comparison'}
          </h2>
          <p className="text-text-muted">
            {locale === 'ar'
              ? `مقارنة ${products.length} منتجات`
              : `Comparing ${products.length} product${products.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="ghost" onClick={onClear}>
          <X className="w-4 h-4 mr-2" />
          {locale === 'ar' ? 'مسح الكل' : 'Clear All'}
        </Button>
      </div>

      {/* Add More Prompt */}
      {products.length < 4 && (
        <Card className="border-dashed border-2 border-border/50 bg-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <AlertCircle className="w-5 h-5 text-accent-amber" />
              <p className="text-text-muted">
                {locale === 'ar'
                  ? `يمكنك إضافة ${4 - products.length} منتجات أخرى للمقارنة`
                  : `You can add ${4 - products.length} more product${4 - products.length > 1 ? 's' : ''} to compare`}
              </p>
              <Link href={`/${locale}/products`}>
                <Button variant="outline" size="sm">
                  {locale === 'ar' ? 'إضافة منتجات' : 'Add Products'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px]">
          {/* Product Headers */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Label Column */}
            <div className="font-semibold text-text-muted">
              {locale === 'ar' ? 'المواصفة' : 'Specification'}
            </div>

            {/* Product Columns */}
            {products.map((product) => (
              <div key={product.id} className="relative">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    {/* Remove Button */}
                    <button
                      onClick={() => onRemove(product.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background hover:bg-error hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Product Image */}
                    <Link
                      href={`/${locale}/products/${product.slug}`}
                      className="block aspect-square bg-background-lighter rounded-lg overflow-hidden mb-3"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={getLocalizedValue(product.name, product.nameAr)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🎮
                        </div>
                      )}
                    </Link>

                    {/* Product Name */}
                    <Link
                      href={`/${locale}/products/${product.slug}`}
                      className="block font-semibold hover:text-primary transition-colors line-clamp-2 mb-2"
                    >
                      {getLocalizedValue(product.name, product.nameAr)}
                    </Link>

                    {/* Category Badge */}
                    <Badge variant="outline" size="sm" className="mb-3">
                      {getLocalizedValue(product.category.name, product.category.nameAr)}
                    </Badge>

                    {/* Add to Cart Button */}
                    <Button variant="primary" size="sm" className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Comparison Sections */}
          {comparisonSections.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <Card className="border-border/50">
                <CardContent className="p-0">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={item.key}
                      className={cn(
                        'grid grid-cols-5 gap-4 p-4',
                        itemIndex > 0 && 'border-t border-border/50'
                      )}
                    >
                      {/* Label */}
                      <div className="font-medium text-text-muted">
                        {item.label}
                      </div>

                      {/* Values */}
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center">
                          {item.render(product, products.indexOf(product))}
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comparison Bar - Fixed bottom bar when products are selected
export function ComparisonBar({
  count,
  locale,
  onOpen,
  onClear,
}: {
  count: number;
  locale: string;
  onOpen: () => void;
  onClear: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(count > 0);
  }, [count]);

  if (!isVisible || count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 fade-in">
      <div className="container mx-auto px-4 pb-4">
        <Card className="shadow-lg border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-amber/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-accent-amber" />
                </div>
                <div>
                  <p className="font-semibold">
                    {locale === 'ar'
                      ? `${count} منتجات للمقارنة`
                      : `${count} product${count > 1 ? 's' : ''} to compare`}
                  </p>
                  <p className="text-sm text-text-muted">
                    {locale === 'ar'
                      ? 'اضغط للمقارنة بين المنتجات'
                      : 'Click to compare products'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClear}>
                  {locale === 'ar' ? 'مسح' : 'Clear'}
                </Button>
                <Button variant="primary" onClick={onOpen}>
                  {locale === 'ar' ? 'قارن الآن' : 'Compare Now'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
