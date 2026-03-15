import type { Metadata } from 'next';
import './globals.css';
import { Readex_Pro } from 'next/font/google';

// Google Fonts - Readex Pro
const readexPro = Readex_Pro({
  subsets: ['latin', 'arabic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-readex-pro',
});

// Set metadataBase for proper social open graph and twitter images resolution
// In production, replace with your actual domain
const metadataBase = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : new URL('http://localhost:3000');

export const metadata: Metadata = {
  metadataBase,
  title: {
    template: '%s | Fulmen Empire',
    default: 'Fulmen Empire | Premium Digital Products',
  },
  description: 'The preferred digital marketplace for subscriptions, software, and premium digital products from top platforms.',
  category: 'ecommerce',
  openGraph: {
    title: 'Fulmen Empire',
    description: 'Your destination for premium digital products, subscriptions, and software.',
    url: 'https://fulmen.empire',
    siteName: 'Fulmen Empire',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fulmen Empire Premium Digital Products',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fulmen Empire',
    description: 'Premium digital products, subscriptions, and software.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${readexPro.variable} min-h-screen flex flex-col bg-background text-text font-sans`}>
        {children}
      </body>
    </html>
  );
}
