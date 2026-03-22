import { Metadata } from 'next';
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, Zap, Check, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface SignupPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: SignupPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'إنشاء حساب | فولمن إمباير' : 'Sign Up | Fulmen Empire',
    description: locale === 'ar'
      ? 'أنشئ حساباً جديداً في فولمن إمباير'
      : 'Create a new account at Fulmen Empire',
  };
}

export default async function SignupPage({ params }: SignupPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  const benefits = [
    {
      icon: Zap,
      title: locale === 'ar' ? 'نقاط الولاء' : 'Loyalty Points',
      description: locale === 'ar'
        ? 'اكسب نقاط مع كل عملية شراء'
        : 'Earn points with every purchase',
    },
    {
      icon: Gift,
      title: locale === 'ar' ? 'عروض حصرية' : 'Exclusive Deals',
      description: locale === 'ar'
        ? 'احصل على عروض خاصة للأعضاء'
        : 'Get members-only exclusive deals',
    },
    {
      icon: Check,
      title: locale === 'ar' ? 'تسليم فوري' : 'Instant Delivery',
      description: locale === 'ar'
        ? 'منتجاتك الرقمية فوراً'
        : 'Your digital products instantly',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Logo */}
          <div className="text-center">
            {/* <Logo variant="full" href={`/${locale}`} className="mx-auto mb-6" /> */}
            <h1 className="text-2xl md:text-3xl font-bold mb-2 mt-16">
              {locale === 'ar' ? 'أنشئ حساباً جديداً' : 'Create an account'}
            </h1>
            <p className="text-text-muted">
              {locale === 'ar'
                ? 'انضم إلى فولمن إمباير وابدأ رحلتك'
                : 'Join Fulmen Empire and start your journey'}
            </p>
          </div>

          {/* Form Card */}
          <div className="card-glow">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
              {/* Social Signup Options */}
              <div className="space-y-3">
                <Button variant="outline" className="w-full" size="lg">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {locale === 'ar' ? 'التسجيل بواسطة جوجل' : 'Sign up with Google'}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-text-muted">
                    {locale === 'ar' ? 'أو' : 'or'}
                  </span>
                </div>
              </div>

              {/* Signup Form */}
              <form className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {locale === 'ar' ? 'الاسم الأول' : 'First Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        placeholder={locale === 'ar' ? 'أحمد' : 'John'}
                        className={cn(
                          'w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl',
                          'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                          'placeholder:text-text-muted'
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {locale === 'ar' ? 'اسم العائلة' : 'Last Name'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={locale === 'ar' ? 'محمد' : 'Doe'}
                        className={cn(
                          'w-full px-4 py-3 bg-background border border-border rounded-xl',
                          'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                          'placeholder:text-text-muted'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      placeholder={locale === 'ar' ? 'example@email.com' : 'example@email.com'}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                        'placeholder:text-text-muted'
                      )}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {locale === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={cn(
                        'w-full pl-10 pr-12 py-3 bg-background border border-border rounded-xl',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                        'placeholder:text-text-muted'
                      )}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-background-lighter rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-warning rounded-full" />
                    </div>
                    <span className="text-xs text-text-muted">
                      {locale === 'ar' ? 'متوسط' : 'Medium'}
                    </span>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label htmlFor="terms" className="text-sm text-text-muted">
                    {locale === 'ar'
                      ? 'أوافق على '
                      : 'I agree to the '}
                    <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                      {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                    </Link>
                    {' '}{locale === 'ar' ? 'و ' : 'and '}
                    <Link href={`/${locale}/privacy`} className="text-primary hover:underline">
                      {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                    </Link>
                  </label>
                </div>

                {/* Newsletter */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="newsletter"
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label htmlFor="newsletter" className="text-sm text-text-muted">
                    {locale === 'ar'
                      ? 'أرغب في تلقي العروض والتحديثات عبر البريد الإلكتروني'
                      : 'I want to receive offers and updates via email'}
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full btn-electric lightning-glow"
                >
                  {locale === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
                  <Zap className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Sign In Link */}
              <p className="text-center text-sm text-text-muted">
                {locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <Link
                  href={`/${locale}/auth/login`}
                  className="font-semibold text-primary hover:underline"
                >
                  {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-medium">{benefit.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-accent" />
        <div className="absolute inset-0 opacity-20">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <pattern
              id="signup-lightning"
              x="0"
              y="0"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M15 0L8 15H12L10 30L22 12H18L20 0Z"
                fill="currentColor"
                className="text-white"
              />
            </pattern>
            <rect width="100" height="100" fill="url(#signup-lightning)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center space-y-8">
          {/* Offer Badge */}
          <div className="animate-float">
            <div className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <p className="text-sm font-medium">
                {locale === 'ar' ? '🎉 مكافأة ترحيبية' : '🎉 Welcome Bonus'}
              </p>
              <p className="text-2xl font-bold">
                {locale === 'ar' ? '100 نقطة مجانية' : '100 Free Points'}
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-bold text-text-dark">
              {locale === 'ar'
                ? 'ابدأ بجمع النقاط اليوم'
                : 'Start Collecting Points Today'}
            </h2>
            <p className="text-lg text-text-dark/80">
              {locale === 'ar'
                ? 'كل دولار يمنحك نقطة واحدة. استبدل نقاطك بمنتجات مجانية!'
                : 'Every dollar earns you one point. Redeem points for free products!'}
            </p>
          </div>

          {/* Points Display */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-dark/80">
                {locale === 'ar' ? 'مكافأة التسجيل' : 'Signup Bonus'}
              </span>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-orange" />
                <span className="text-2xl font-bold text-text-dark">100</span>
              </div>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="w-full h-full bg-accent-orange rounded-full animate-pulse" />
            </div>
            <p className="mt-3 text-sm text-text-dark/70">
              {locale === 'ar'
                ? 'يكفي للحصول على خصم 10% على أول طلب'
                : 'Enough for 10% off your first order'}
            </p>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-sm">
            <p className="text-text-dark/90 text-sm">
              {locale === 'ar'
                ? '«أفضل متجر للمنتجات الرقمية! التسليم سريع والأسعار ممتازة»'
                : '"The best digital products store! Fast delivery and great prices"'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-accent-amber">★</span>
                ))}
              </div>
              <span className="text-xs text-text-dark/70">
                {locale === 'ar' ? '+5,000 عميل سعيد' : '+5,000 happy customers'}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-32 left-16 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-16 w-64 h-64 bg-primary/40 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
