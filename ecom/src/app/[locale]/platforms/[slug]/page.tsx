import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/ui/rating-stars';
import { PriceDisplay } from '@/components/ui/currency-display';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface PlatformPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Mock platform data - replace with database query
const PLATFORMS: Record<string, {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  bannerColor: string;
}> = {
  steam: {
    name: 'Steam',
    nameAr: 'ستيم',
    description: 'The largest gaming platform for PC',
    descriptionAr: 'أكبر منصة ألعاب للكمبيوتر',
    icon: '🎮',
    bannerColor: 'from-blue-600 to-blue-800',
  },
  playstation: {
    name: 'PlayStation',
    nameAr: 'بلايستيشن',
    description: 'Sony gaming consoles',
    descriptionAr: 'أجهزة ألعاب سوني',
    icon: '🎯',
    bannerColor: 'from-blue-500 to-indigo-600',
  },
  xbox: {
    name: 'Xbox',
    nameAr: 'إكس بوكس',
    description: 'Microsoft gaming platform',
    descriptionAr: 'منصة ألعاب مايكروسوفت',
    icon: '🟢',
    bannerColor: 'from-green-500 to-green-700',
  },
  netflix: {
    name: 'Netflix',
    nameAr: 'نتفليكس',
    description: 'Streaming entertainment',
    descriptionAr: 'بث ترفيهي',
    icon: '🎬',
    bannerColor: 'from-red-600 to-red-800',
  },
  spotify: {
    name: 'Spotify',
    nameAr: 'سبوتيفاي',
    description: 'Music streaming',
    descriptionAr: 'بث الموسيقى',
    icon: '🎵',
    bannerColor: 'from-green-500 to-green-600',
  },
};

// Mock products data - replace with database query
const getProducts = (platformSlug: string, sort: string = 'newest') => {
  const allProducts = [
    {
      id: '1',
      name: 'Elden Ring',
      nameAr: 'إلدن رينج',
      slug: 'elden-ring',
      price: 59.99,
      compareAtPrice: 69.99,
      rating: 4.8,
      ratingCount: 1250,
      image: '/placeholder-game.jpg',
      isNew: true,
      pointsReward: 60,
    },
    {
      id: '2',
      name: 'Cyberpunk 2077',
      nameAr: 'سايبربانك 2077',
      slug: 'cyberpunk-2077',
      price: 49.99,
      compareAtPrice: 59.99,
      rating: 4.5,
      ratingCount: 3400,
      image: '/placeholder-game2.jpg',
      pointsReward: 50,
    },
    {
      id: '3',
      name: 'Baldur\'s Gate 3',
      nameAr: 'بالدور جيت 3',
      slug: 'baldurs-gate-3',
      price: 59.99,
      rating: 4.9,
      ratingCount: 2100,
      image: '/placeholder-game3.jpg',
      isNew: true,
      pointsReward: 60,
    },
    {
      id: '4',
      name: 'Red Dead Redemption 2',
      nameAr: 'ريد ديد ريدمبشن 2',
      slug: 'rdr2',
      price: 39.99,
      compareAtPrice: 59.99,
      rating: 4.9,
      ratingCount: 5600,
      image: '/placeholder-game4.jpg',
      pointsReward: 40,
    },
    {
      id: '5',
      name: 'God of War',
      nameAr: 'جود أوف وور',
      slug: 'god-of-war',
      price: 44.99,
      compareAtPrice: 49.99,
      rating: 4.8,
      ratingCount: 1800,
      image: '/placeholder-game5.jpg',
      pointsReward: 45,
    },
    {
      id: '6',
      name: 'Horizon Zero Dawn',
      nameAr: 'هورايزون زيرو داون',
      slug: 'horizon-zero-dawn',
      price: 34.99,
      rating: 4.6,
      ratingCount: 980,
      image: '/placeholder-game6.jpg',
      pointsReward: 35,
    },
  ];

  // Apply sorting
  let sorted = [...allProducts];
  switch (sort) {
    case 'price_low':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price_high':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      break;
  }

  return sorted;
};

export async function generateMetadata({ params }: PlatformPageProps): Promise<Metadata> {
  const { slug } = await params;
  const platform = PLATFORMS[slug];

  if (!platform) {
    return {
      title: 'Platform Not Found',
    };
  }

  return {
    title: `${platform.name} - Fulmen Empire`,
    description: platform.description,
  };
};

export default async function PlatformPage({ params, searchParams }: PlatformPageProps) {
  const { locale, slug } = await params;
  const search = await searchParams;
  const sort = (search.sort as string) || 'newest';

  const platform = PLATFORMS[slug];
  if (!platform) {
    notFound();
  }

  const products = getProducts(slug, sort);
  const isRTL = locale === 'ar';

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest', labelAr: 'الأحدث' },
    { value: 'price_low', label: 'Price: Low to High', labelAr: 'السعر: من الأقل للأعلى' },
    { value: 'price_high', label: 'Price: High to Low', labelAr: 'السعر: من الأعلى للأقل' },
    { value: 'rating', label: 'Top Rated', labelAr: 'الأعلى تقييماً' },
  ];

  return (
    <div className="min-h-screen">
      {/* Platform Banner */}
      <section className={cn('bg-gradient-to-br py-16', platform.bannerColor)}>
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-6xl">
              {platform.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">
                  {isRTL ? platform.nameAr : platform.name}
                </h1>
                <Badge variant="featured">{products.length}+ Products</Badge>
              </div>
              <p className="text-white/80 text-lg">
                {isRTL ? platform.descriptionAr : platform.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Sort */}
      <section className="sticky top-0 z-30 bg-background-light border-b border-border/50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4" />
                {locale === 'ar' ? 'فلاتر' : 'Filters'}
              </Button>
              <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
                <span>{products.length}</span>
                <span>{locale === 'ar' ? 'منتج' : 'products'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted hidden sm:inline">
                {locale === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}
              </span>
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={`/${locale}/platforms/${slug}?sort=${option.value}`}
                  >
                    <Button
                      variant={sort === option.value ? 'primary' : 'ghost'}
                      size="sm"
                    >
                      {isRTL ? option.labelAr : option.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-muted text-lg">
                {locale === 'ar' ? 'لا توجد منتجات متاحة' : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  platformSlug={slug}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductCard({
  product,
  platformSlug,
  locale,
}: {
  product: ReturnType<typeof getProducts>[number];
  platformSlug: string;
  locale: string;
}) {
  const isRTL = locale === 'ar';

  return (
    <Link href={`/${locale}/products/${product.slug}`}>
      <Card className="group h-full overflow-hidden">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative aspect-square bg-background-lighter overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              🎮
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isNew && (
                <Badge variant="new" size="sm">
                  {locale === 'ar' ? 'جديد' : 'NEW'}
                </Badge>
              )}
              {product.compareAtPrice && (
                <Badge variant="sale" size="sm">
                  -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="primary"
                asChild
              >
                <Link href={`/${locale}/products/${product.slug}`}>
                  {locale === 'ar' ? 'عرض المنتج' : 'View Product'}
                </Link>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {isRTL ? product.nameAr : product.name}
            </h3>
            <div className="flex items-center justify-between mb-2">
              <PriceDisplay
                price={product.price}
                compareAtPrice={product.compareAtPrice}
              />
              {product.pointsReward > 0 && (
                <span className="text-xs text-accent-amber">
                  +{product.pointsReward} ⚡
                </span>
              )}
            </div>
            <RatingStars rating={product.rating} count={product.ratingCount} size="sm" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
