import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Gamepad2, Film, Music, Smartphone, Cpu, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface PlatformsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PlatformsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'المنصات' : 'Platforms',
    description: locale === 'ar'
      ? 'تصفح جميع المنصات المتاحة'
      : 'Browse all available platforms',
  };
}

interface PlatformCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  description: string;
  descriptionAr: string;
  platforms: Platform[];
}

interface Platform {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon: string;
  productCount: number;
  color: string;
}

const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    nameAr: 'الألعاب',
    icon: <Gamepad2 className="w-6 h-6" />,
    description: 'Game keys, gift cards, and subscriptions',
    descriptionAr: 'مفاتيح الألعاب، بطاقات الهدايا، والاشتراكات',
    platforms: [
      { id: 'steam', name: 'Steam', nameAr: 'ستيم', slug: 'steam', icon: '🎮', productCount: 450, color: 'from-blue-600 to-blue-800' },
      { id: 'playstation', name: 'PlayStation', nameAr: 'بلايستيشن', slug: 'playstation', icon: '🎯', productCount: 320, color: 'from-blue-500 to-indigo-600' },
      { id: 'xbox', name: 'Xbox', nameAr: 'إكس بوكس', slug: 'xbox', icon: '🟢', productCount: 280, color: 'from-green-500 to-green-700' },
      { id: 'nintendo', name: 'Nintendo', nameAr: 'نينتندو', slug: 'nintendo', icon: '🔴', productCount: 150, color: 'from-red-500 to-red-700' },
      { id: 'epic', name: 'Epic Games', nameAr: 'إيبك جيمز', slug: 'epic', icon: '🚀', productCount: 120, color: 'from-purple-500 to-purple-700' },
    ],
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    nameAr: 'الاشتراكات',
    icon: <Film className="w-6 h-6" />,
    description: 'Streaming and entertainment services',
    descriptionAr: 'خدمات البث والترفيه',
    platforms: [
      { id: 'netflix', name: 'Netflix', nameAr: 'نتفليكس', slug: 'netflix', icon: '🎬', productCount: 45, color: 'from-red-600 to-red-800' },
      { id: 'spotify', name: 'Spotify', nameAr: 'سبوتيفاي', slug: 'spotify', icon: '🎵', productCount: 32, color: 'from-green-500 to-green-600' },
      { id: 'disney', name: 'Disney+', nameAr: 'ديزني+', slug: 'disney', icon: '🏰', productCount: 28, color: 'from-blue-800 to-indigo-900' },
      { id: 'hbo', name: 'HBO Max', nameAr: 'إتش بي أو ماكس', slug: 'hbo', icon: '🟣', productCount: 22, color: 'from-purple-600 to-purple-800' },
      { id: 'youtube', name: 'YouTube Premium', nameAr: 'يوتيوب بريميوم', slug: 'youtube', icon: '▶️', productCount: 35, color: 'from-red-500 to-red-600' },
    ],
  },
  {
    id: 'software',
    name: 'Software',
    nameAr: 'البرمجيات',
    icon: <Cpu className="w-6 h-6" />,
    description: 'Productivity and utility software',
    descriptionAr: 'برمجيات الإنتاجية والأدوات',
    platforms: [
      { id: 'microsoft', name: 'Microsoft', nameAr: 'مايكروسوفت', slug: 'microsoft', icon: '🪟', productCount: 85, color: 'from-blue-500 to-blue-700' },
      { id: 'adobe', name: 'Adobe', nameAr: 'أدوبي', slug: 'adobe', icon: '🎨', productCount: 65, color: 'from-orange-500 to-red-600' },
      { id: 'antivirus', name: 'Antivirus', nameAr: 'الحماية', slug: 'antivirus', icon: '🛡️', productCount: 45, color: 'from-green-600 to-green-800' },
      { id: 'vpn', name: 'VPN Services', nameAr: 'خدمات VPN', slug: 'vpn', icon: '🔒', productCount: 38, color: 'from-cyan-500 to-blue-600' },
    ],
  },
  {
    id: 'ai',
    name: 'AI & Tools',
    nameAr: 'الذكاء الاصطناعي والأدوات',
    icon: <Sparkles className="w-6 h-6" />,
    description: 'AI tools and digital services',
    descriptionAr: 'أدوات الذكاء الاصطناعي والخدمات الرقمية',
    platforms: [
      { id: 'chatgpt', name: 'ChatGPT', nameAr: 'شات جي بي تي', slug: 'chatgpt', icon: '🤖', productCount: 25, color: 'from-green-500 to-emerald-600' },
      { id: 'midjourney', name: 'Midjourney', nameAr: 'ميدجورني', slug: 'midjourney', icon: '🎨', productCount: 18, color: 'from-purple-500 to-pink-600' },
      { id: 'claude', name: 'Claude', nameAr: 'كلاود', slug: 'claude', icon: '🧠', productCount: 12, color: 'from-orange-500 to-amber-600' },
      { id: 'other-ai', name: 'Other AI', nameAr: 'ذكاء اصطناعي آخر', slug: 'other-ai', icon: '✨', productCount: 23, color: 'from-cyan-500 to-blue-600' },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile',
    nameAr: 'الموبايل',
    icon: <Smartphone className="w-6 h-6" />,
    description: 'App store gift cards and credits',
    descriptionAr: 'بطاقات هدايا متاجر التطبيقات',
    platforms: [
      { id: 'apple', name: 'App Store', nameAr: 'آب ستور', slug: 'apple', icon: '🍎', productCount: 55, color: 'from-gray-600 to-gray-800' },
      { id: 'google', name: 'Google Play', nameAr: 'جوجل بلاي', slug: 'google', icon: '🟢', productCount: 48, color: 'from-green-500 to-green-700' },
      { id: 'playstation-mobile', name: 'PlayStation Mobile', nameAr: 'بلايستيشن موبايل', slug: 'playstation-mobile', icon: '🎮', productCount: 15, color: 'from-blue-500 to-indigo-600' },
    ],
  },
];

export default async function PlatformsPage({ params }: PlatformsPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {locale === 'ar' ? 'تصفح حسب المنصة' : 'Browse by Platform'}
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            {locale === 'ar'
              ? 'اختر منصتك المفضلة واكتشف مجموعة واسعة من المنتجات الرقمية'
              : 'Choose your favorite platform and discover a wide range of digital products'}
          </p>
        </div>

        {/* Platform Categories */}
        <div className="space-y-12">
          {PLATFORM_CATEGORIES.map((category) => (
            <div key={category.id}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {isRTL ? category.nameAr : category.name}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {isRTL ? category.descriptionAr : category.description}
                  </p>
                </div>
              </div>

              {/* Platform Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {category.platforms.map((platform) => (
                  <Link
                    key={platform.id}
                    href={`/${locale}/platforms/${platform.slug}`}
                  >
                    <Card className="group h-full hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                      <CardContent className="p-6 text-center">
                        <div
                          className={cn(
                            'w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl group-hover:scale-110 transition-transform'
                          )}
                        >
                          {platform.icon}
                        </div>
                        <h3 className="font-semibold mb-1">
                          {isRTL ? platform.nameAr : platform.name}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {platform.productCount}+ {locale === 'ar' ? 'منتج' : 'products'}
                        </p>
                        <div
                          className={cn(
                            'mt-3 text-primary flex items-center justify-center gap-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity'
                          )}
                        >
                          {locale === 'ar' ? 'استكشف' : 'Explore'}
                          <ChevronRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-primary p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {locale === 'ar' ? 'لا تجد ما تبحث عنه؟' : "Can't find what you're looking for?"}
            </h2>
            <p className="text-text-muted mb-6 max-w-xl mx-auto">
              {locale === 'ar'
                ? 'تواصل معنا وسنحاول مساعدتك في العثور على المنتج الذي تريده'
                : 'Contact us and we will try to help you find the product you want'}
            </p>
            <Link href={`/${locale}/contact`}>
              <Button size="lg" variant="accent">
                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
