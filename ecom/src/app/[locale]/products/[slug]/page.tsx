import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RatingStars } from '@/components/ui/rating-stars';
import { PriceDisplay, CurrencyDisplay } from '@/components/ui/currency-display';
import { cn, calculateDiscount } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Mock product data - replace with database query
const getProduct = (slug: string) => {
  const products: Record<string, {
    id: string;
    name: string;
    nameAr: string;
    slug: string;
    description: string;
    descriptionAr: string;
    price: number;
    compareAtPrice?: number;
    rating: number;
    ratingCount: number;
    reviewsCount: number;
    pointsReward: number;
    maxQuantity: number;
    deliveryType: 'auto_key' | 'auto_account' | 'manual' | 'contact';
    isNew: boolean;
    isFeatured: boolean;
    videoUrl?: string;
    images: string[];
    platforms: Array<{
      id: string;
      name: string;
      nameAr: string;
      slug: string;
      price: number;
      isPrimary: boolean;
    }>;
    specifications: Record<string, string>;
    category: {
      name: string;
      nameAr: string;
      slug: string;
    };
  }> = {
    'elden-ring': {
      id: '1',
      name: 'Elden Ring',
      nameAr: 'إلدن رينج',
      slug: 'elden-ring',
      description: 'An expansive fantasy action-RPG game developed by FromSoftware. Embark on a journey across a vast world filled with mysterious lands, dangerous enemies, and hidden treasures. Created by Hidetaka Miyazaki, with George R.R. Martin contributing to the mythos.',
      descriptionAr: 'لعبة تقمص أدوار فانتازيا واسعة النطاق مطورة بواسطة FromSoftware. انطلق في رحلة عبر عالم واسع مليء بالأراضي الغامضة والأعداء الخطرون والكنوز المخفية.',
      price: 59.99,
      compareAtPrice: 69.99,
      rating: 4.8,
      ratingCount: 1250,
      reviewsCount: 542,
      pointsReward: 60,
      maxQuantity: 5,
      deliveryType: 'auto_key',
      isNew: true,
      isFeatured: true,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      images: ['/elden-ring-1.jpg', '/elden-ring-2.jpg', '/elden-ring-3.jpg', '/elden-ring-4.jpg'],
      platforms: [
        { id: 'steam', name: 'Steam', nameAr: 'ستيم', slug: 'steam', price: 59.99, isPrimary: true },
        { id: 'playstation', name: 'PlayStation', nameAr: 'بلايستيشن', slug: 'playstation', price: 59.99, isPrimary: false },
        { id: 'xbox', name: 'Xbox', nameAr: 'إكس بوكس', slug: 'xbox', price: 59.99, isPrimary: false },
      ],
      specifications: {
        'Developer': 'FromSoftware',
        'Publisher': 'Bandai Namco Entertainment',
        'Release Date': 'February 25, 2022',
        'Genre': 'Action RPG',
        'Platform': 'PC, PlayStation, Xbox',
        'Region': 'Global',
      },
      category: { name: 'Games', nameAr: 'ألعاب', slug: 'games' },
    },
  };

  return products[slug] || null;
};

// Mock related products
const getRelatedProducts = (productSlug: string, platformSlug: string) => {
  return [
    {
      id: '2',
      name: 'Dark Souls III',
      nameAr: 'دارك سولز 3',
      slug: 'dark-souls-3',
      price: 44.99,
      compareAtPrice: 59.99,
      rating: 4.7,
      ratingCount: 3200,
      image: '/placeholder-game2.jpg',
      platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
    },
    {
      id: '3',
      name: 'Sekiro: Shadows Die Twice',
      nameAr: 'سيكيرو',
      slug: 'sekiro',
      price: 49.99,
      rating: 4.8,
      ratingCount: 1800,
      image: '/placeholder-game3.jpg',
      platform: { name: 'Steam', nameAr: 'ستيم', slug: 'steam' },
    },
    {
      id: '4',
      name: 'Bloodborne',
      nameAr: 'بلادبورن',
      slug: 'bloodborne',
      price: 39.99,
      rating: 4.9,
      ratingCount: 2400,
      image: '/placeholder-game4.jpg',
      platform: { name: 'PlayStation', nameAr: 'بلايستيشن', slug: 'playstation' },
    },
  ];
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = getProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${locale === 'ar' ? product.nameAr : product.name} - Fulmen Empire`,
    description: locale === 'ar' ? product.descriptionAr : product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images,
    },
  };
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(slug, product.platforms[0]?.slug || '');
  const isRTL = locale === 'ar';
  const discount = product.compareAtPrice
    ? calculateDiscount(product.compareAtPrice, product.price)
    : 0;

  const DELIVERY_INFO = {
    auto_key: {
      icon: <Clock className="w-5 h-5" />,
      title: locale === 'ar' ? 'تسليم المفتاح التلقائي' : 'Instant Key Delivery',
      description: locale === 'ar'
        ? 'يتم إرسال المفتاح تلقائياً إلى بريدك الإلكتروني ولوحة التحكم بعد تأكيد الدفع'
        : 'Key will be automatically sent to your email and dashboard after payment confirmation',
    },
    auto_account: {
      icon: <Shield className="w-5 h-5" />,
      title: locale === 'ar' ? 'تسليم الحساب التلقائي' : 'Instant Account Delivery',
      description: locale === 'ar'
        ? 'بيانات الحساب يتم إرسالها تلقائياً بعد تأكيد الدفع'
        : 'Account details will be automatically sent after payment confirmation',
    },
    manual: {
      icon: <Truck className="w-5 h-5" />,
      title: locale === 'ar' ? 'تسليم يدوي' : 'Manual Delivery',
      description: locale === 'ar'
        ? 'سيتم تسليم المنتج يدوياً خلال 24 ساعة'
        : 'Product will be manually delivered within 24 hours',
    },
    contact: {
      icon: <Share2 className="w-5 h-5" />,
      title: locale === 'ar' ? 'تواصل للتسليم' : 'Contact for Delivery',
      description: locale === 'ar'
        ? 'يرجى التواصل معنا لاستلام المنتج'
        : 'Please contact us to receive the product',
    },
  };

  const deliveryInfo = DELIVERY_INFO[product.deliveryType];

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center gap-2 text-sm text-text-muted">
          <Link href={`/${locale}`} className="hover:text-primary">
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span>{isRTL ? '←' : '→'}</span>
          <Link href={`/${locale}/products`} className="hover:text-primary">
            {locale === 'ar' ? 'المنتجات' : 'Products'}
          </Link>
          <span>{isRTL ? '←' : '→'}</span>
          <Link href={`/${locale}/platforms/${product.platforms[0]?.slug}`} className="hover:text-primary">
            {isRTL ? product.platforms[0]?.nameAr : product.platforms[0]?.name}
          </Link>
          <span>{isRTL ? '←' : '→'}</span>
          <span className="text-text">{isRTL ? product.nameAr : product.name}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Images & Video */}
          <div className="space-y-4">
            {/* Main Image/Video */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-background-lighter relative">
                  {/* Image placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center text-9xl">
                    🎮
                  </div>

                  {/* Video trailer button */}
                  {product.videoUrl && (
                    <button className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group">
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-background-lighter flex items-center justify-center text-3xl">
                      🎮
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              {product.isNew && <Badge variant="new">{locale === 'ar' ? 'جديد' : 'NEW'}</Badge>}
              {product.isFeatured && <Badge variant="featured">{locale === 'ar' ? 'مميز' : 'Featured'}</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <div className="text-primary text-sm mb-2">
                {isRTL ? product.category.nameAr : product.category.name}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {isRTL ? product.nameAr : product.name}
              </h1>
              <RatingStars rating={product.rating} count={product.ratingCount} size="md" />
            </div>

            {/* Price */}
            <Card className="bg-background-light">
              <CardContent className="p-6">
                <PriceDisplay
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                  className="text-2xl"
                />
                {product.pointsReward > 0 && (
                  <div className="flex items-center gap-2 text-accent-amber mt-2">
                    <span className="text-lg">⚡</span>
                    <span className="font-medium">
                      {locale === 'ar'
                        ? `اكسب ${product.pointsReward} نقطة`
                        : `Earn ${product.pointsReward} points`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Selector */}
            {product.platforms.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {locale === 'ar' ? 'اختر المنصة:' : 'Select Platform:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.platforms.map((platform) => (
                    <button
                      key={platform.id}
                      className={cn(
                        'px-4 py-2 rounded-lg border-2 transition-all',
                        platform.isPrimary
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {isRTL ? platform.nameAr : platform.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 btn-electric">
                <ShoppingCart className="w-5 h-5" />
                {locale === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
              </Button>
              <Button size="lg" variant="accent" className="flex-1">
                {locale === 'ar' ? 'اشتري الآن' : 'Buy Now'}
              </Button>
              <Button size="lg" variant="outline">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Delivery Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary">{deliveryInfo.icon}</div>
                  <div>
                    <h4 className="font-semibold">{deliveryInfo.title}</h4>
                    <p className="text-sm text-text-muted">{deliveryInfo.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">
                  {locale === 'ar' ? 'المواصفات' : 'Specifications'}
                </h3>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <dt className="text-text-muted">{key}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">
                {locale === 'ar' ? 'الوصف' : 'Description'}
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted leading-relaxed">
                {isRTL ? product.descriptionAr : product.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {locale === 'ar' ? 'التقييمات والمراجعات' : 'Reviews'}
            </h2>
            <Button variant="outline">
              <Star className="w-4 h-4 mr-2" />
              {locale === 'ar' ? 'أكتب تقييم' : 'Write a Review'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rating Summary */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-5xl font-bold text-accent-yellow mb-2">
                  {product.rating}
                </div>
                <RatingStars rating={product.rating} size="lg" />
                <p className="text-sm text-text-muted mt-2">
                  {locale === 'ar'
                    ? `بناءً على ${product.reviewsCount} تقييم`
                    : `Based on ${product.reviewsCount} reviews`}
                </p>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="md:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">User {i}</div>
                        <div className="text-xs text-text-muted">
                          {locale === 'ar' ? 'منذ يومين' : '2 days ago'}
                        </div>
                      </div>
                      <RatingStars rating={5 - i * 0.5} size="sm" />
                    </div>
                    <p className="text-sm text-text-muted">
                      {locale === 'ar'
                        ? 'منتج رائع! وصل بسرعة وعمل كما هو متوقع.'
                        : 'Great product! Arrived quickly and worked as expected.'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">
            {locale === 'ar' ? 'منتجات ذات صلة' : 'Related Products'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((related) => (
              <Link key={related.id} href={`/${locale}/products/${related.slug}`}>
                <Card className="group h-full hover:scale-105 transition-transform">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-background-lighter rounded-lg mb-3 flex items-center justify-center text-5xl">
                      🎮
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary">
                      {isRTL ? related.nameAr : related.name}
                    </h3>
                    <PriceDisplay price={related.price} compareAtPrice={related.compareAtPrice} />
                    <RatingStars rating={related.rating} count={related.ratingCount} size="sm" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
