import { Metadata } from 'next';
import Link from 'next/link';
import {
  SlidersHorizontal,
  X,
  Grid3x3,
  List,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/store/product-card';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Mock products data
const PRODUCTS = [
  {
    id: '1',
    name: 'Elden Ring',
    nameAr: 'إلدن رينج',
    slug: 'elden-ring',
    price: 59.99,
    compareAtPrice: 69.99,
    rating: 4.8,
    ratingCount: 1250,
    isNew: true,
    isFeatured: true,
    onSale: true,
    pointsReward: 60,
    deliveryType: 'auto_key' as const,
    platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
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
    onSale: true,
    pointsReward: 50,
    deliveryType: 'auto_key' as const,
    platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
  },
  {
    id: '3',
    name: "Baldur's Gate 3",
    nameAr: 'بالدور جيت 3',
    slug: 'baldurs-gate-3',
    price: 59.99,
    rating: 4.9,
    ratingCount: 2100,
    isNew: true,
    pointsReward: 60,
    deliveryType: 'auto_key' as const,
    platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
  },
  {
    id: '4',
    name: 'Netflix Premium 1 Month',
    nameAr: 'نتفليكس بريميوم شهر',
    slug: 'netflix-premium',
    price: 15.99,
    compareAtPrice: 19.99,
    rating: 4.7,
    ratingCount: 3200,
    onSale: true,
    pointsReward: 16,
    deliveryType: 'manual' as const,
    platform: { name: 'Netflix', nameAr: 'نتفليكس', slug: 'netflix' },
  },
  {
    id: '5',
    name: 'Spotify Premium 3 Months',
    nameAr: 'سبوتيفاي بريميوم 3 أشهر',
    slug: 'spotify-3m',
    price: 29.99,
    rating: 4.8,
    ratingCount: 1800,
    pointsReward: 30,
    deliveryType: 'auto_account' as const,
    platform: { name: 'Spotify', nameAr: 'سبوتيفاي', slug: 'spotify' },
  },
  {
    id: '6',
    name: 'PlayStation Plus 12 Months',
    nameAr: 'بلايستيشن بلس 12 شهر',
    slug: 'playstation-plus-12m',
    price: 49.99,
    compareAtPrice: 59.99,
    rating: 4.6,
    ratingCount: 890,
    onSale: true,
    pointsReward: 50,
    deliveryType: 'auto_key' as const,
    platform: { name: 'PlayStation', nameAr: 'بلايستيشن', slug: 'playstation' },
  },
  {
    id: '7',
    name: 'ChatGPT Plus Subscription',
    nameAr: 'اشتراك شات جي بي تي بلس',
    slug: 'chatgpt-plus',
    price: 20,
    rating: 4.9,
    ratingCount: 5400,
    isFeatured: true,
    pointsReward: 20,
    deliveryType: 'auto_account' as const,
    platform: { name: 'AI', nameAr: 'ذكاء اصطناعي', slug: 'ai' },
  },
  {
    id: '8',
    name: 'Midjourney Subscription',
    nameAr: 'اشتراك ميدجورني',
    slug: 'midjourney',
    price: 35,
    rating: 4.7,
    ratingCount: 650,
    pointsReward: 35,
    deliveryType: 'manual' as const,
    platform: { name: 'AI', nameAr: 'ذكاء اصطناعي', slug: 'ai' },
  },
  {
    id: '9',
    name: 'Xbox Game Pass Ultimate',
    nameAr: 'إكس بوكس جيم باس الترا',
    slug: 'xbox-gamepass',
    price: 14.99,
    compareAtPrice: 16.99,
    rating: 4.8,
    ratingCount: 2100,
    onSale: true,
    pointsReward: 15,
    deliveryType: 'auto_key' as const,
    platform: { name: 'Xbox', nameAr: 'إكس بوكس', slug: 'xbox' },
  },
  {
    id: '10',
    name: 'Nintendo Switch Online',
    nameAr: 'نينتندو سويتش أونلاين',
    slug: 'switch-online',
    price: 19.99,
    rating: 4.5,
    ratingCount: 890,
    pointsReward: 20,
    deliveryType: 'auto_key' as const,
    platform: { name: 'Nintendo', nameAr: 'نينتندو', slug: 'nintendo' },
  },
  {
    id: '11',
    name: 'Adobe Creative Cloud',
    nameAr: 'أدوبي كريتيف كلاود',
    slug: 'adobe-cc',
    price: 54.99,
    rating: 4.6,
    ratingCount: 1200,
    pointsReward: 55,
    deliveryType: 'auto_account' as const,
    platform: { name: 'Software', nameAr: 'برمجيات', slug: 'software' },
  },
  {
    id: '12',
    name: 'Disney+ Premium',
    nameAr: 'ديزني بلس بريميوم',
    slug: 'disney-plus',
    price: 10.99,
    compareAtPrice: 13.99,
    rating: 4.7,
    ratingCount: 1800,
    onSale: true,
    pointsReward: 11,
    deliveryType: 'manual' as const,
    platform: { name: 'Disney+', nameAr: 'ديزني+', slug: 'disney' },
  },
];

const FILTERS = {
  categories: [
    { id: 'games', name: 'Games', nameAr: 'ألعاب', count: 120, icon: '🎮' },
    { id: 'subscriptions', name: 'Subscriptions', nameAr: 'اشتراكات', count: 85, icon: '📺' },
    { id: 'ai-tools', name: 'AI Tools', nameAr: 'أدوات ذكاء اصطناعي', count: 45, icon: '🤖' },
    { id: 'software', name: 'Software', nameAr: 'برمجيات', count: 62, icon: '💻' },
  ],
  platforms: [
    { id: 'steam', name: 'Steam', nameAr: 'ستيم', count: 150, icon: '🎮' },
    { id: 'playstation', name: 'PlayStation', nameAr: 'بلايستيشن', count: 95, icon: '🎯' },
    { id: 'xbox', name: 'Xbox', nameAr: 'إكس بوكس', count: 78, icon: '🟢' },
    { id: 'netflix', name: 'Netflix', nameAr: 'نتفليكس', count: 35, icon: '🎬' },
    { id: 'spotify', name: 'Spotify', nameAr: 'سبوتيفاي', count: 28, icon: '🎵' },
    { id: 'ai', name: 'AI Tools', nameAr: 'أدوات ذكاء اصطناعي', count: 45, icon: '🤖' },
  ],
  priceRanges: [
    { id: 'under-25', name: 'Under $25', nameAr: 'أقل من 25$', min: 0, max: 25 },
    { id: '25-50', name: '$25 - $50', nameAr: '25$ - 50$', min: 25, max: 50 },
    { id: '50-100', name: '$50 - $100', nameAr: '50$ - 100$', min: 50, max: 100 },
    { id: 'over-100', name: 'Over $100', nameAr: 'أكثر من 100$', min: 100, max: Infinity },
  ],
  ratings: [
    { id: '4', name: '4 & Up', nameAr: '4 فأعلى', value: 4 },
    { id: '3', name: '3 & Up', nameAr: '3 فأعلى', value: 3 },
    { id: '2', name: '2 & Up', nameAr: '2 فأعلى', value: 2 },
  ],
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', labelAr: 'الأحدث' },
  { value: 'price_low', label: 'Price: Low to High', labelAr: 'السعر: من الأقل للأعلى' },
  { value: 'price_high', label: 'Price: High to Low', labelAr: 'السعر: من الأعلى للأقل' },
  { value: 'popular', label: 'Popularity', labelAr: 'الشعبية' },
  { value: 'rating', label: 'Rating', labelAr: 'التقييم' },
];

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'المنتجات | فولمن إمباير' : 'Products | Fulmen Empire',
    description: locale === 'ar' ? 'تصفح جميع منتجاتنا' : 'Browse all our products',
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { locale } = await params;
  const search = await searchParams;

  const isRTL = locale === 'ar';
  const sort = (search.sort as string) || 'newest';
  const category = search.category as string | undefined;
  const platform = search.platform as string | undefined;
  const minPrice = search.minPrice ? Number(search.minPrice) : undefined;
  const maxPrice = search.maxPrice ? Number(search.maxPrice) : undefined;
  const minRating = search.minRating ? Number(search.minRating) : undefined;

  // Filter products
  let filtered = [...PRODUCTS];
  if (category) {
    filtered = filtered.filter((p) => p.platform.slug === category);
  }
  if (platform) {
    filtered = filtered.filter((p) => p.platform.slug === platform);
  }
  if (minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= minPrice);
  }
  if (maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= maxPrice);
  }
  if (minRating !== undefined) {
    filtered = filtered.filter((p) => p.rating >= minRating);
  }

  // Sort products
  switch (sort) {
    case 'price_low':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price_high':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'popular':
      filtered.sort((a, b) => b.ratingCount - a.ratingCount);
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      break;
  }

  const buildUrl = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  const activeFilters = {
    category,
    platform,
    minPrice: minPrice?.toString(),
    maxPrice: maxPrice?.toString(),
    minRating: minRating?.toString(),
  };

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== undefined);

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="py-12 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {locale === 'ar' ? 'المنتجات' : 'Products'}
            </h1>
            <p className="text-text-muted text-lg">
              {locale === 'ar'
                ? 'اكتشف مجموعتنا الواسعة من المنتجات الرقمية المتميزة'
                : 'Discover our wide collection of premium digital products'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 mt-8">
            <div>
              <span className="text-2xl font-bold text-primary">{filtered.length}</span>
              <span className="text-text-muted ml-2">
                {locale === 'ar' ? 'منتج' : 'products'}
              </span>
            </div>
            {hasActiveFilters && (
              <Link href={`/${locale}/products`}>
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-background-lighter">
                  <X className="w-3 h-3" />
                  {locale === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <Button variant="outline" className="w-full gap-2">
                  <Filter className="w-4 h-4" />
                  {locale === 'ar' ? 'الفلاتر' : 'Filters'}
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </Button>
              </div>

              {/* Filter Card */}
              <Card className="hidden lg:block">
                <CardContent className="p-6 space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                        📁
                      </span>
                      {locale === 'ar' ? 'الفئات' : 'Categories'}
                    </h3>
                    <div className="space-y-2">
                      {FILTERS.categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={buildUrl({
                            ...activeFilters,
                            category: cat.id === category ? '' : cat.id,
                          })}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg transition-colors',
                            category === cat.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-background-lighter'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span className="text-sm">{isRTL ? cat.nameAr : cat.name}</span>
                          </span>
                          <span className="text-xs text-text-muted bg-background-lighter px-2 py-0.5 rounded-full">
                            {cat.count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="pt-4 border-t border-border/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-accent-amber/10 flex items-center justify-center text-sm">
                        🎮
                      </span>
                      {locale === 'ar' ? 'المنصات' : 'Platforms'}
                    </h3>
                    <div className="space-y-2">
                      {FILTERS.platforms.map((plat) => (
                        <Link
                          key={plat.id}
                          href={buildUrl({
                            ...activeFilters,
                            platform: plat.id === platform ? '' : plat.id,
                          })}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg transition-colors',
                            platform === plat.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-background-lighter'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span>{plat.icon}</span>
                            <span className="text-sm">{isRTL ? plat.nameAr : plat.name}</span>
                          </span>
                          <span className="text-xs text-text-muted bg-background-lighter px-2 py-0.5 rounded-full">
                            {plat.count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="pt-4 border-t border-border/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-sm">
                        💰
                      </span>
                      {locale === 'ar' ? 'نطاق السعر' : 'Price Range'}
                    </h3>
                    <div className="space-y-2">
                      {FILTERS.priceRanges.map((range) => {
                        const isActive =
                          minPrice === range.min && maxPrice === range.max;
                        return (
                          <Link
                            key={range.id}
                            href={buildUrl({
                              ...activeFilters,
                              minPrice: range.min === 0 ? '' : String(range.min),
                              maxPrice: range.max === Infinity ? '' : String(range.max),
                            })}
                            className={cn(
                              'block p-2 rounded-lg transition-colors text-sm',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-background-lighter text-text-muted'
                            )}
                          >
                            {isRTL ? range.nameAr : range.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="pt-4 border-t border-border/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center text-sm">
                        ⭐
                      </span>
                      {locale === 'ar' ? 'التقييم' : 'Rating'}
                    </h3>
                    <div className="space-y-2">
                      {FILTERS.ratings.map((rating) => (
                        <Link
                          key={rating.id}
                          href={buildUrl({
                            ...activeFilters,
                            minRating:
                              rating.value === minRating ? '' : String(rating.value),
                          })}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg transition-colors',
                            minRating === rating.value
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-background-lighter text-text-muted'
                          )}
                        >
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={cn(
                                  star <= rating.value
                                    ? 'text-accent-amber'
                                    : 'text-text-muted'
                                )}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm">{isRTL ? rating.nameAr : rating.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 space-y-6">
            {/* Sort & View Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border/50">
                <button className="p-2 rounded-md bg-primary text-white">
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-md text-text-muted hover:text-text transition-colors">
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted">
                  {locale === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}
                </span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => {
                      window.location.href = buildUrl({
                        ...activeFilters,
                        sort: e.target.value,
                      });
                    }}
                    className={cn(
                      'appearance-none pr-10 pl-4 py-2 bg-card border border-border rounded-lg',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                      'text-sm font-medium cursor-pointer'
                    )}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {isRTL ? option.labelAr : option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Filters Pills */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 p-4 bg-card rounded-xl border border-border/50">
                <span className="text-sm font-medium text-text-muted">
                  {locale === 'ar' ? 'الفلاتر النشطة:' : 'Active Filters:'}
                </span>
                {category && (
                  <Badge variant="outline" className="gap-1">
                    {isRTL
                      ? FILTERS.categories.find((c) => c.id === category)?.nameAr
                      : FILTERS.categories.find((c) => c.id === category)?.name}
                    <Link href={buildUrl({ ...activeFilters, category: '' })}>
                      <X className="w-3 h-3 hover:text-error" />
                    </Link>
                  </Badge>
                )}
                {platform && (
                  <Badge variant="outline" className="gap-1">
                    {isRTL
                      ? FILTERS.platforms.find((p) => p.id === platform)?.nameAr
                      : FILTERS.platforms.find((p) => p.id === platform)?.name}
                    <Link href={buildUrl({ ...activeFilters, platform: '' })}>
                      <X className="w-3 h-3 hover:text-error" />
                    </Link>
                  </Badge>
                )}
                {(minPrice || maxPrice) && (
                  <Badge variant="outline" className="gap-1">
                    ${minPrice || 0} - ${maxPrice || '∞'}
                    <Link
                      href={buildUrl({ ...activeFilters, minPrice: '', maxPrice: '' })}
                    >
                      <X className="w-3 h-3 hover:text-error" />
                    </Link>
                  </Badge>
                )}
                {minRating && (
                  <Badge variant="outline" className="gap-1">
                    {minRating}+ {locale === 'ar' ? 'نجوم' : 'stars'}
                    <Link href={buildUrl({ ...activeFilters, minRating: '' })}>
                      <X className="w-3 h-3 hover:text-error" />
                    </Link>
                  </Badge>
                )}
                <Link href={`/${locale}/products`}>
                  <Button variant="ghost" size="sm">
                    {locale === 'ar' ? 'مسح الكل' : 'Clear All'}
                  </Button>
                </Link>
              </div>
            )}

            {/* Products Grid */}
            {filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background-lighter flex items-center justify-center">
                  <Filter className="w-10 h-10 text-text-muted" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                </h3>
                <p className="text-text-muted mb-6 max-w-md mx-auto">
                  {locale === 'ar'
                    ? 'لم نجد أي منتجات تطابق فلاترك الحالية. حاول تعديل الفلاتر للعثور على ما تبحث عنه.'
                    : "We couldn't find any products matching your filters. Try adjusting your filters to find what you're looking for."}
                </p>
                <Link href={`/${locale}/products`}>
                  <Button variant="outline">
                    {locale === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} locale={locale} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center pt-8">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>
                      {locale === 'ar' ? 'السابق' : 'Previous'}
                    </Button>
                    {[1, 2, 3].map((page) => (
                      <button
                        key={page}
                        className={cn(
                          'w-10 h-10 rounded-lg font-medium transition-all',
                          page === 1
                            ? 'bg-primary text-white'
                            : 'bg-card hover:bg-background-lighter text-text-muted'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    <Button variant="outline" size="sm">
                      {locale === 'ar' ? 'التالي' : 'Next'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
