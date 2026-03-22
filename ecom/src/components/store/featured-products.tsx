'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/store/product-card';
import type { Product } from '@/lib/api-client';
import { getProducts } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedProductsProps {
  locale: string;
  limit?: number;
  featured?: boolean;
  sort?: string;
}

export function FeaturedProducts({
  locale,
  limit = 8,
  featured = true,
  sort,
}: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const result = await getProducts({
        locale,
        limit,
        featured,
        sort,
      });
      if (result.success && result.data) {
        setProducts(result.data);
      }
      setLoading(false);
    }
    fetchProducts();
  }, [locale, limit, featured, sort]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">
          {locale === 'ar' ? 'لا توجد منتجات حالياً' : 'No products available'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            id: product.id,
            name: product.name,
            nameAr: product.nameAr || '',
            slug: product.slug,
            price: parseFloat(product.price),
            compareAtPrice: product.compareAtPrice
              ? parseFloat(product.compareAtPrice)
              : undefined,
            rating: parseFloat(product.averageRating || '0'),
            ratingCount: product.reviewCount || 0,
            category: product.categories?.[0]
              ? {
                  name: product.categories[0].categoryName,
                  nameAr: product.categories[0].categoryNameAr || '',
                  slug: product.categories[0].categorySlug,
                }
              : { name: 'Unknown', nameAr: 'غير معروف', slug: 'unknown' },
            isNew: product.isNew,
            isFeatured: product.isFeatured,
            onSale: !!product.compareAtPrice,
            pointsReward: product.pointsReward || 0,
            deliveryType: product.deliveryType as any,
            image: (product.images?.[0] as any)?.url || undefined,
          }}
          locale={locale}
        />
      ))}
    </div>
  );
}
