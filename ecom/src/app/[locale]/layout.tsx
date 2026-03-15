import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import { SUPPORTED_LOCALES } from '@/config/constants';
import { getDirection } from '@/lib/i18n';
import { Navbar } from '@/components/store/navbar';
import { Footer } from '@/components/store/footer';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!SUPPORTED_LOCALES.includes(locale as any)) {
    notFound();
  }

  const direction = getDirection(locale as any);

  return (
    <div lang={locale} dir={direction} className="scroll-smooth">
      <Navbar locale={locale as any} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale as any} />
    </div>
  );
}
