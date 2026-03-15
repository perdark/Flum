import { Metadata } from 'next';
import Link from 'next/link';
import { Search as SearchIcon, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/ui/rating-stars';
import { PriceDisplay } from '@/components/ui/currency-display';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

// Mock search results
const performSearch = (query: string) => {
  if (!query) return { results: [], suggestions: [], trending: [] };

  // Mock results - in real app, query database
  return {
    results: [
      {
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
        category: { name: 'Games', nameAr: 'ألعاب', slug: 'games' },
      },
    ],
    suggestions: [
      { text: 'Elden Ring', slug: 'elden-ring' },
      { text: 'Elden Ring DLC', slug: 'elden-ring-dlc' },
    ],
    trending: [],
  };
};

const TRENDING_SEARCHES = [
  { text: 'Elden Ring', slug: 'elden-ring' },
  { text: 'GTA 5', slug: 'gta-5' },
  { text: 'Netflix Premium', slug: 'netflix-premium' },
  { text: 'PlayStation Plus', slug: 'playstation-plus' },
  { text: 'ChatGPT Plus', slug: 'chatgpt-plus' },
];

const RECENT_SEARCHES = [
  { text: 'Cyberpunk 2077', slug: 'cyberpunk-2077' },
  { text: 'Steam Gift Card', slug: 'steam-gift-card' },
];

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'بحث' : 'Search',
  };
};

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const query = search.q || '';
  const isRTL = locale === 'ar';

  const { results, suggestions, trending } = performSearch(query);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Search Header */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <Input
                type="text"
                defaultValue={query}
                placeholder={locale === 'ar' ? 'ابحث عن منتجات...' : 'Search for products...'}
                className="pl-12 h-14 text-lg"
                name="q"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                {locale === 'ar' ? 'بحث' : 'Search'}
              </Button>
            </div>

            {/* Search Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm">
                {locale === 'ar' ? 'الكل' : 'All'}
              </Button>
              <Button variant="ghost" size="sm">
                {locale === 'ar' ? 'ألعاب' : 'Games'}
              </Button>
              <Button variant="ghost" size="sm">
                {locale === 'ar' ? 'اشتراكات' : 'Subscriptions'}
              </Button>
              <Button variant="ghost" size="sm">
                Steam
              </Button>
              <Button variant="ghost" size="sm">
                {locale === 'ar' ? 'ذكاء اصطناعي' : 'AI'}
              </Button>
            </div>
          </div>
        </div>

        {/* No Query - Show Suggestions */}
        {!query && (
          <div className="max-w-2xl mx-auto">
            {/* Recent Searches */}
            {RECENT_SEARCHES.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-text-muted" />
                    <h3 className="font-semibold">
                      {locale === 'ar' ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RECENT_SEARCHES.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/${locale}/search?q=${encodeURIComponent(item.text)}`}
                      >
                        <Badge variant="outline" className="hover:bg-background-lighter cursor-pointer">
                          {item.text}
                          <button className="ml-2 hover:text-error">×</button>
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trending Searches */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-accent-orange" />
                  <h3 className="font-semibold">
                    {locale === 'ar' ? 'عمليات البحث الرائجة' : 'Trending Searches'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRENDING_SEARCHES.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/${locale}/search?q=${encodeURIComponent(item.text)}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-lighter transition-colors"
                    >
                      <span className="text-lg">🔍</span>
                      <span>{item.text}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* With Query - Show Results */}
        {query && (
          <div>
            <div className="mb-6">
              <p className="text-text-muted">
                {locale === 'ar'
                  ? `نتائج البحث عن "${query}"`
                  : `Search results for "${query}"`}
                <span className="ml-2 text-text">({results.length} results)</span>
              </p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Card className="mb-6 bg-accent-amber/10 border-accent-amber/20">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">
                    {locale === 'ar' ? 'هل تقصد؟' : 'Did you mean?'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <Link
                        key={suggestion.slug}
                        href={`/${locale}/search?q=${encodeURIComponent(suggestion.text)}`}
                      >
                        <Badge variant="accent" className="cursor-pointer">
                          {suggestion.text}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {results.length === 0 ? (
              <Card className="p-12 text-center">
                <SearchIcon className="w-16 h-16 mx-auto mb-4 text-text-muted" />
                <h2 className="text-xl font-semibold mb-2">
                  {locale === 'ar'
                    ? `لا توجد نتائج لـ "${query}"`
                    : `No results for "${query}"`}
                </h2>
                <p className="text-text-muted mb-6">
                  {locale === 'ar'
                    ? 'جرب كلمات مفتاحية مختلفة أو تصفح الفئات'
                    : 'Try different keywords or browse categories'}
                </p>
                <Link href={`/${locale}/products`}>
                  <Button variant="outline">
                    {locale === 'ar' ? 'تصفح جميع المنتجات' : 'Browse All Products'}
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {results.map((product) => (
                  <Link key={product.id} href={`/${locale}/products/${product.slug}`}>
                    <Card className="group h-full hover:scale-105 transition-transform">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-background-lighter rounded-lg mb-3 flex items-center justify-center text-5xl">
                          🎮
                        </div>
                        <div className="text-xs text-primary mb-1">
                          {isRTL ? product.platform.nameAr : product.platform.name}
                        </div>
                        <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-primary">
                          {isRTL ? product.nameAr : product.name}
                        </h3>
                        <PriceDisplay
                          price={product.price}
                          compareAtPrice={product.compareAtPrice}
                        />
                        <RatingStars rating={product.rating} count={product.ratingCount} size="sm" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
