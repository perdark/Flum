'use client';

/**
 * OffersSection Component
 *
 * Client component that fetches and renders offers
 */

import { useEffect, useState } from 'react';
import { HeroOffers, OfferCards, MultipleBanners } from './index';
import type { Locale } from '@/lib/i18n';

interface Offer {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  endDate: string;
  displayPosition: number;
  backgroundColor: string | null;
  textColor: string | null;
  showCountdown: boolean;
  ctaText: string | null;
  ctaTextAr: string | null;
  ctaLink: string | null;
  featuredImage: string | null;
  value: string;
  type: string;
  displayType: string;
}

interface OffersSectionProps {
  locale: Locale;
  variant?: 'hero' | 'banner' | 'cards' | 'all';
  limit?: number;
  className?: string;
}

export function OffersSection({
  locale,
  variant = 'all',
  limit = 10,
  className,
}: OffersSectionProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isStale = false;
    const controller = new AbortController();

    async function fetchOffers() {
      setLoading(true);
      try {
        const response = await fetch(`/api/offers?locale=${locale}&limit=${limit}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setOffers([]);
            return;
          }
          setError('Failed to load offers');
          return;
        }

        const data = await response.json();

        if (isStale || controller.signal.aborted) {
          return;
        }

        if (data.success) {
          setOffers(data.data);
          setError(null);
        } else {
          setError('Failed to load offers');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        setError('Failed to load offers');
        console.error('Error fetching offers:', err);
      } finally {
        if (!isStale) {
          setLoading(false);
        }
      }
    }

    fetchOffers();

    return () => {
      isStale = true;
      controller.abort();
    };
  }, [locale, limit]);

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse bg-card/50 rounded-2xl h-[400px]" />
      </div>
    );
  }

  if (error || offers.length === 0) {
    return null;
  }

  const heroOffers = offers.filter(o => o.displayType === 'hero');
  const bannerOffers = offers.filter(o => o.displayType === 'banner');
  const cardOffers = offers.filter(o => o.displayType === 'card');

  if (variant === 'hero') {
    if (heroOffers.length > 0) {
      return <HeroOffers locale={locale} offers={heroOffers} className={className} />;
    }
    return null;
  }

  if (variant === 'banner') {
    if (bannerOffers.length > 0) {
      return <MultipleBanners locale={locale} offers={bannerOffers} className={className} />;
    }
    return null;
  }

  if (variant === 'cards') {
    if (cardOffers.length > 0) {
      return <OfferCards locale={locale} offers={cardOffers} className={className} />;
    }
    return null;
  }

  // 'all' variant - render all types
  return (
    <div className={className}>
      {heroOffers.length > 0 && (
        <div className="mb-12">
          <HeroOffers locale={locale} offers={heroOffers} />
        </div>
      )}
      {bannerOffers.length > 0 && (
        <div className="mb-12">
          <MultipleBanners locale={locale} offers={bannerOffers} />
        </div>
      )}
      {cardOffers.length > 0 && (
        <div>
          <OfferCards locale={locale} offers={cardOffers} />
        </div>
      )}
    </div>
  );
}

/**
 * HeroOffersOnly Component
 * Displays only hero-type offers
 */
export function HeroOffersOnly({ locale, className }: { locale: Locale; className?: string }) {
  return <OffersSection locale={locale} variant="hero" className={className} />;
}

/**
 * BannerOffersOnly Component
 * Displays only banner-type offers
 */
export function BannerOffersOnly({ locale, className }: { locale: Locale; className?: string }) {
  return <OffersSection locale={locale} variant="banner" className={className} />;
}

/**
 * CardOffersOnly Component
 * Displays only card-type offers
 */
export function CardOffersOnly({ locale, className }: { locale: Locale; className?: string }) {
  return <OffersSection locale={locale} variant="cards" className={className} />;
}
