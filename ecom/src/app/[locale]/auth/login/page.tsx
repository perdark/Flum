import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'تسجيل الدخول | فولمن إمباير' : 'Login | Fulmen Empire',
    description: locale === 'ar'
      ? 'سجل دخولك إلى حسابك في فولمن إمباير'
      : 'Sign in to your Fulmen Empire account',
  };
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Logo */}
          <div className="text-center">
            <Logo variant="full" href={`/${locale}`} className="mx-auto mb-6" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {locale === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
            </h1>
            <p className="text-text-muted">
              {locale === 'ar'
                ? 'سجل دخولك للوصول إلى حسابك'
                : 'Sign in to access your account'}
            </p>
          </div>

          {/* Form Card */}
          <div className="card-glow">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
              {/* Social Login Options */}
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
                  Continue with Google
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

              {/* Login Form */}
              <form className="space-y-5">
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {locale === 'ar' ? 'كلمة المرور' : 'Password'}
                    </label>
                    <Link
                      href={`/${locale}/auth/forgot-password`}
                      className="text-sm text-primary hover:underline"
                    >
                      {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="password"
                      placeholder={locale === 'ar' ? '••••••••' : '••••••••'}
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
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label htmlFor="remember" className="text-sm text-text-muted">
                    {locale === 'ar' ? 'تذكرني' : 'Remember me'}
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full btn-electric lightning-glow"
                >
                  {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                  <Zap className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-text-muted">
                {locale === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                <Link
                  href={`/${locale}/auth/signup`}
                  className="font-semibold text-primary hover:underline"
                >
                  {locale === 'ar' ? 'أنشئ حساباً جديد' : 'Create a new account'}
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center text-xs text-text-muted space-y-2">
            <p>
              {locale === 'ar'
                ? 'بالمتابعة، أنت توافق على'
                : 'By continuing, you agree to our'}{' '}
              <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
              </Link>{' '}
              {locale === 'ar' ? 'و' : 'and'}{' '}
              <Link href={`/${locale}/privacy`} className="text-primary hover:underline">
                {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 mesh-gradient opacity-50" />

        {/* Lightning Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <pattern
              id="login-lightning"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M10 0L5 10H8L6 20L15 8H12L14 0Z"
                fill="currentColor"
                className="text-white"
              />
            </pattern>
            <rect width="100" height="100" fill="url(#login-lightning)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center space-y-8">
          {/* Floating Logo */}
          <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center animate-float">
            <Zap className="w-16 h-16 text-accent-amber" />
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-bold">
              {locale === 'ar' ? 'انضم إلى فولمن إمباير' : 'Join Fulmen Empire'}
            </h2>
            <p className="text-lg text-white/80">
              {locale === 'ar'
                ? 'اكتشف عالماً من المنتجات الرقمية المتميزة بأسعار تنافسية'
                : 'Discover a world of premium digital products at competitive prices'}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-lg bg-accent-amber/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-accent-amber" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">
                  {locale === 'ar' ? 'تسليم فوري' : 'Instant Delivery'}
                </h3>
                <p className="text-sm text-white/70">
                  {locale === 'ar' ? 'احصل على منتجاتك فوراً' : 'Get your products instantly'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary-light" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">
                  {locale === 'ar' ? 'دفع آمن' : 'Secure Payment'}
                </h3>
                <p className="text-sm text-white/70">
                  {locale === 'ar' ? 'معاملات آمنة 100%' : '100% secure transactions'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-accent-amber/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
