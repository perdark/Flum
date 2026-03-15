'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, ArrowUp } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface FooterProps {
  locale: Locale;
}

interface FooterSection {
  title: string;
  titleAr: string;
  links: Array<{
    label: string;
    labelAr: string;
    href: string;
  }>;
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Shop',
    titleAr: 'المتجر',
    links: [
      { label: 'All Products', labelAr: 'جميع المنتجات', href: '/products' },
      { label: 'Platforms', labelAr: 'المنصات', href: '/platforms' },
      { label: 'New Arrivals', labelAr: 'وصل حديثاً', href: '/products?sort=newest' },
      { label: 'Special Offers', labelAr: 'عروض خاصة', href: '/offers' },
    ],
  },
  {
    title: 'Support',
    titleAr: 'الدعم',
    links: [
      { label: 'Contact Us', labelAr: 'اتصل بنا', href: '/contact' },
      { label: 'FAQ', labelAr: 'الأسئلة الشائعة', href: '/faq' },
      { label: 'Track Order', labelAr: 'تتبع الطلب', href: '/profile/orders' },
      { label: 'Delivery Info', labelAr: 'معلومات التوصيل', href: '/delivery' },
    ],
  },
  {
    title: 'Legal',
    titleAr: 'قانوني',
    links: [
      { label: 'Terms of Service', labelAr: 'شروط الخدمة', href: '/terms' },
      { label: 'Privacy Policy', labelAr: 'سياسة الخصوصية', href: '/privacy' },
      { label: 'Refund Policy', labelAr: 'سياسة الاسترجاع', href: '/refunds' },
      { label: 'Cookie Policy', labelAr: 'سياسة ملفات الارتباط', href: '/cookies' },
    ],
  },
];

export function Footer({ locale }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const isRTL = locale === 'ar';

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-background-light border-t border-border/50 mt-auto">
      {/* Newsletter Section */}
      <div className="bg-gradient-primary py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-2">
              {locale === 'ar' ? 'اشترك في نشرتنا الإخبارية' : 'Subscribe to Our Newsletter'}
            </h3>
            <p className="text-text-muted mb-6">
              {locale === 'ar'
                ? 'احصل على أحدث العروض والخصومات مباشرة إلى بريدك الإلكتروني'
                : 'Get the latest offers and discounts delivered to your inbox'}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder={locale === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" variant="accent">
                {subscribed
                  ? locale === 'ar'
                    ? 'تم الاشتراك!'
                    : 'Subscribed!'
                  : locale === 'ar'
                    ? 'اشتراك'
                    : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Logo variant="full" className="mb-4" />
            <p className="text-text-muted mb-6 max-w-sm">
              {locale === 'ar'
                ? 'وجهتك الأولى للمنتجات الرقمية. ألعاب، اشتراكات، برامج، والمزيد من أفضل المنصات.'
                : 'Your first destination for digital products. Games, subscriptions, software, and more from the best platforms.'}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background-lighter flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background-lighter flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background-lighter flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background-lighter flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Footer Links */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">
                {locale === 'ar' ? section.titleAr : section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={`/${locale}${link.href}`}
                      className="text-text-muted hover:text-primary transition-colors text-sm"
                    >
                      {locale === 'ar' ? link.labelAr : link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bottom Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-sm">
            © {new Date().getFullYear()} {locale === 'ar' ? 'فولمن إمباير' : 'Fulmen Empire'}.{' '}
            {locale === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
          </p>

          {/* Payment Methods */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-background-lighter rounded-lg">
              <div className="w-8 h-5 bg-white rounded flex items-center justify-center text-[10px] text-black font-bold">
                VISA
              </div>
              <div className="w-8 h-5 bg-white rounded flex items-center justify-center text-[10px] text-black font-bold">
                MC
              </div>
              <div className="w-8 h-5 bg-white rounded flex items-center justify-center text-[10px] text-black font-bold">
                AMX
              </div>
              <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">
                PP
              </div>
            </div>
          </div>

          {/* Scroll to Top */}
          <button
            onClick={scrollToTop}
            className="p-2 rounded-lg bg-background-lighter hover:bg-primary hover:text-white transition-all"
            aria-label={locale === 'ar' ? 'العودة للأعلى' : 'Scroll to top'}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
