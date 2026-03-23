import { Metadata } from 'next';
import Link from 'next/link';
import {
  Gamepad2,
  Gamepad,
  MonitorPlay,
  Laptop,
  Gift,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  HeadphonesIcon,
  Sparkles,
  TrendingUp,
  Flame,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FeaturedProducts } from '@/components/store/featured-products';
import { CategoriesList } from '@/components/store/categories-list';
import { OffersSection } from '@/components/store/offers/offers-section';
import { cn, getLocalizedValue } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar'
      ? 'فولمن إمباير - متجر المنتجات الرقمية'
      : 'Fulmen Empire - Digital Products Store',
    description: locale === 'ar'
      ? 'أفضل متجر للمنتجات الرقمية. ألعاب، اشتراكات، برامج، والمزيد من أفضل المنصات.'
      : 'Best digital products store. Games, subscriptions, software, and more from top categories.',
  };
}

// Featured products and categories are now loaded from API via client components

// Categories are now loaded from API via CategoriesList component

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Delivery',
    titleAr: 'توصيل فوري',
    description: 'Get your products instantly after purchase',
    descriptionAr: 'احصل على منتجاتك فوراً بعد الشراء',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    titleAr: 'دفع آمن',
    description: '100% secure payment processing',
    descriptionAr: 'معالجة دفع آمنة 100%',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    titleAr: 'دعم على مدار الساعة',
    description: 'Round the clock customer support',
    descriptionAr: 'دعم العملاء على مدار الساعة',
  },
  {
    icon: HeadphonesIcon,
    title: 'Guaranteed Quality',
    titleAr: 'جودة مضمونة',
    description: 'All products verified and tested',
    descriptionAr: 'جميع المنتجات موثقة ومختبرة',
  },
];

const CATEGORIES = [
  {
    name: 'Games',
    nameAr: 'الألعاب',
    slug: 'games',
    icon: <Gamepad2 className="w-8 h-8" />,
    color: 'bg-primary/20',
    itemCount: 524,
  },
  {
    name: 'Subscriptions',
    nameAr: 'الاشتراكات',
    slug: 'subscriptions',
    icon: <MonitorPlay className="w-8 h-8" />,
    color: 'bg-primary/20',
    itemCount: 86,
  },
  {
    name: 'Software',
    nameAr: 'البرمجيات',
    slug: 'software',
    icon: <Laptop className="w-8 h-8" />,
    color: 'bg-primary/20',
    itemCount: 143,
  },
  {
    name: 'Gift Cards',
    nameAr: 'بطاقات الهدايا',
    slug: 'gift-cards',
    icon: <Gift className="w-8 h-8" />,
    color: 'bg-primary/20',
    itemCount: 67,
  },
];

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl animate-fade-in">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <Badge variant="outline" className="gap-2 px-4 py-1.5 border-border bg-card text-text-muted backdrop-blur-sm shadow-sm rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'وصول جديد كل يوم' : 'New arrivals every day'}
            </Badge>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-text">
              {locale === 'ar' ? 'أفضل منصة ' : 'The Premier Category '}
              <br className="hidden md:block" />
            </span>
            <span className="text-primary-light">
              {locale === 'ar' ? 'للمنتجات الرقمية' : 'for Digital Products'}
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            {locale === 'ar'
              ? 'قم بتوسيع نطاق أعمالك وإنتاجيتك مع مجموعتنا الواسعة من الاشتراكات والبرمجيات والمزيد.'
              : 'Scale your business and productivity with our curated collection of enterprise subscriptions, software, and APIs.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href={`/${locale}/products`}>
              <Button size="lg" className="w-full sm:w-auto px-8 bg-primary hover:bg-primary-hover text-white gap-2 rounded-lg transition-colors duration-200">
                {locale === 'ar' ? 'استكشف الكتالوج' : 'Explore Catalog'}
                <ArrowRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
              </Button>
            </Link>
            <Link href={`/${locale}/categories`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 gap-2 rounded-lg bg-card border-border hover:bg-border transition-colors duration-200">
                {locale === 'ar' ? 'تصفح المنصات' : 'View Categories'}
              </Button>
            </Link>
          </div>

          {/* Hero Clean Dashboard Mockup */}
          <div className="relative mx-auto w-full max-w-5xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden mt-10">
            {/* Mockup Header */}
            <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-background">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
            </div>
            {/* Mockup Body Content */}
            <div className="p-8 aspect-[16/9] md:aspect-[21/9] flex items-center justify-center bg-card">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-xl bg-background border border-border flex items-center justify-center mb-4">
                  <Gamepad2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold opacity-90 text-text">
                  {locale === 'ar' ? 'لوحة تحكم المنتجات' : 'Enterprise Product Dashboard'}
                </h3>
                <p className="text-text-muted max-w-md mx-auto">
                  {locale === 'ar' ? 'واجهة مستخدم حديثة لإدارة جميع أصولك الرقمية' : 'A modern interface to manage and browse your complete digital inventory'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Offers Carousel */}
      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <OffersSection locale={locale} variant="hero" limit={5} />
        </div>
      </section>

      {/* SaaS Feature Bento Grid */}
      <section className="relative z-20 py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-12 text-center md:text-left">
            <Badge variant="outline" className="mb-4 shadow-sm backdrop-blur-sm">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              {locale === 'ar' ? 'مميزات المنصة' : 'Category Features'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              {locale === 'ar' ? 'مصمم للسرعة والموثوقية' : 'Engineered for Speed & Reliability'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Feature Block */}
            <Card className="md:col-span-2 group relative overflow-hidden bg-card border-border hover:border-primary transition-colors duration-200">
              <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {locale === 'ar' ? 'توصيل فوري ومدفوعات آمنة' : 'Instant Delivery & Secure Payments'}
                  </h3>
                  <p className="text-text-muted">
                    {locale === 'ar'
                      ? 'لا داعي للانتظار. احصل على مفاتيح المنتجات والاشتراكات فوراً بعد إتمام الدفع.'
                      : 'Zero waiting time. Receive your product keys and subscription credentials instantly upon payment confirmation.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Small Feature Block 1 */}
            <Card className="group relative overflow-hidden bg-card border-border hover:border-primary transition-colors duration-200">
              <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {locale === 'ar' ? 'دعم 24/7' : '24/7 Support'}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {locale === 'ar'
                      ? 'فريق متخصص متاح دائماً'
                      : 'Dedicated team always available'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Categories Bento (combines features + categories visually) */}
            {CATEGORIES.slice(0, 3).map((category, index) => (
              <Link key={category.slug} href={`/${locale}/products?category=${category.slug}`} className="block">
                <Card className="group relative overflow-hidden bg-card border-border hover:border-primary transition-colors duration-200 h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-primary">{category.icon}</div>
                      <Badge variant="secondary" className="bg-background text-text-muted border-border">
                        {category.itemCount}+
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{isRTL ? category.nameAr : category.name}</h4>
                    <p className="text-sm text-text-muted">
                      {locale === 'ar' ? 'تصفح الكتالوج' : 'Browse Catalog'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge variant="new" className="mb-4">
                <Flame className="w-4 h-4 mr-1" />
                {locale === 'ar' ? 'مميز' : 'Featured'}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                {locale === 'ar' ? 'منتجات مميزة' : 'Featured Products'}
              </h2>
              <p className="text-text-muted max-w-xl">
                {locale === 'ar'
                  ? 'اختياراتنا لأفضل المنتجات هذا الأسبوع'
                  : 'Our top picks for this week'}
              </p>
            </div>
            <Link href={`/${locale}/products?featured=true`}>
              <Button variant="outline" className="gap-2">
                {locale === 'ar' ? 'عرض الكل' : 'View All'}
                <ArrowRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
              </Button>
            </Link>
          </div>

          <FeaturedProducts locale={locale} limit={4} featured={true} />
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {locale === 'ar' ? 'المنصات' : 'Categories'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {locale === 'ar' ? 'تصفح حسب المنصة' : 'Browse by Category'}
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              {locale === 'ar'
                ? 'اختر منصتك المفضلة واكتشف مجموعة واسعة من المنتجات الرقمية'
                : 'Choose your favorite category and discover a wide range of digital products'}
            </p>
          </div>

          <CategoriesList locale={locale} limit={6} />

          <div className="text-center mt-12">
            <Link href={`/${locale}/categories`}>
              <Button variant="outline" size="lg" className="gap-2">
                {locale === 'ar' ? 'عرض جميع المنصات' : 'View All Categories'}
                <ArrowRight className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Offer Cards Grid */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="sale" className="mb-4">
              <Flame className="w-4 h-4 mr-1" />
              {locale === 'ar' ? 'عروض خاصة' : 'Special Deals'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {locale === 'ar' ? 'استفد من العروض الحصرية' : 'Exclusive Offers'}
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              {locale === 'ar'
                ? 'عروض محدودة لفترة قصيرة. لا تفوت الفرصة!'
                : 'Limited time deals. Don\'t miss out!'}
            </p>
          </div>
          <OffersSection locale={locale} variant="cards" limit={6} />
        </div>
      </section>

      {/* Special Offers Banner - Dynamic */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <OffersSection locale={locale} variant="banner" limit={3} />
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge variant="sale" className="mb-4">
                <TrendingUp className="w-4 h-4 mr-1" />
                {locale === 'ar' ? 'رائج' : 'Trending'}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                {locale === 'ar' ? 'الرائج الآن' : 'Trending Now'}
              </h2>
              <p className="text-text-muted max-w-xl">
                {locale === 'ar' ? 'الأكثر مبيعاً هذا الشهر' : 'Best sellers this month'}
              </p>
            </div>
            <Link href={`/${locale}/products?sort=popular`}>
              <Button variant="ghost" className="gap-2">
                {locale === 'ar' ? 'عرض الكل' : 'View All'}
                <ArrowRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
              </Button>
            </Link>
          </div>

          <FeaturedProducts locale={locale} limit={4} featured={false} sort="popular" />
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {locale === 'ar'
                ? 'احصل على عروض حصرية'
                : 'Get Exclusive Deals'}
            </h2>
            <p className="text-text-muted mb-8 max-w-xl mx-auto">
              {locale === 'ar'
                ? 'اشترك في نشرتنا البريدية لتصلك أحدث العروض والخصومات الحصرية'
                : 'Subscribe to our newsletter for the latest deals and exclusive discounts'}
            </p>

            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder={locale === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
                className={cn(
                  'flex-1 px-6 py-4 bg-background border border-border rounded-lg',
                  'focus:border-primary focus:ring-1 focus:ring-primary transition-colors',
                  'placeholder:text-text-muted'
                )}
              />
              <Button size="lg" className="bg-primary text-white hover:bg-primary-hover rounded-lg whitespace-nowrap transition-colors duration-200">
                {locale === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}
              </Button>
            </form>

            <p className="text-xs text-text-muted mt-4">
              {locale === 'ar'
                ? 'بالاشتراك، أنت توافق على استلام رسائل بريد إلكتروني تسويقية'
                : 'By subscribing, you agree to receive marketing emails'}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="overflow-hidden bg-card border border-border shadow-md">
            <CardContent className="p-12 md:p-16 text-center relative">
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                  {locale === 'ar'
                    ? 'هل أنت مستعد للبدء؟'
                    : 'Ready to modernize your operations?'}
                </h2>
                <p className="text-lg text-text-muted mb-10 max-w-xl mx-auto">
                  {locale === 'ar'
                    ? 'انضم إلى آلاف الشركات التي تثق في منصتنا يومياً.'
                    : 'Join thousands of forward-thinking companies trusting Fulmen Empire daily.'}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href={`/${locale}/auth/signup`}>
                    <Button size="lg" className="w-full sm:w-auto px-8 bg-primary hover:bg-primary-hover gap-2 rounded-lg text-white transition-colors duration-200">
                      {locale === 'ar' ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                      <Zap className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/${locale}/products`}>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 gap-2 border-border bg-background hover:bg-border rounded-lg transition-colors duration-200">
                      {locale === 'ar' ? 'تواصل مع المبيعات' : 'Contact Sales'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
