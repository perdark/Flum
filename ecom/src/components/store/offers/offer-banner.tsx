'use client';

/**
 * OfferBanner Component
 *
 * Horizontal banner for displaying offers with countdown timer
 */

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { CountdownTimer } from './countdown-timer';
import { cn, getLocalizedValue } from '@/lib/utils';
import { fadeUp } from '@/lib/animations';
import type { Locale } from '@/lib/i18n';

interface Offer {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  endDate: Date;
  backgroundColor: string | null;
  textColor: string | null;
  showCountdown: boolean;
  ctaText: string | null;
  ctaTextAr: string | null;
  ctaLink: string | null;
  featuredImage: string | null;
  value: string;
  type: string;
}

interface OfferBannerProps {
  locale: Locale;
  offer: Offer;
  className?: string;
  variant?: 'default' | 'compact' | 'prominent';
}

export function OfferBanner({
  locale,
  offer,
  className,
  variant = 'default',
}: OfferBannerProps) {
  const isRTL = locale === 'ar';
  const textColor = offer.textColor || '#FFFFFF';

  // Get background style
  const backgroundStyle = offer.backgroundColor
    ? { backgroundColor: offer.backgroundColor }
    : { background: 'linear-gradient(90deg, #FF7F50 0%, #FFB800 100%)' };

  const ctaText = getLocalizedValue(offer.ctaText, offer.ctaTextAr, locale) ||
    (locale === 'ar' ? 'احصل على العرض' : 'Get the Deal');

  const localizedDescription = getLocalizedValue(offer.description, offer.descriptionAr, locale);

  const offerValue = offer.type === 'percentage'
    ? `${offer.value}%`
    : `$${offer.value}`;

  // Variant styles
  const variantStyles = {
    default: 'min-h-[180px] py-8',
    compact: 'min-h-[140px] py-5',
    prominent: 'min-h-[220px] py-10',
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={cn('relative overflow-hidden rounded-2xl md:rounded-3xl', variantStyles[variant], className)}
      style={backgroundStyle}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            x: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left side - Text */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-3">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30"
              >
                <Sparkles className="w-4 h-4" style={{ color: textColor }} />
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: textColor }}>
                  {locale === 'ar' ? 'عرض محدود' : 'Limited Time'}
                </span>
                <span className="text-lg font-bold" style={{ color: textColor }}>
                  {offerValue} {locale === 'ar' ? 'خصم' : 'OFF'}
                </span>
              </motion.div>

              {/* Countdown */}
              {offer.showCountdown && (
                <CountdownTimer
                  endDate={offer.endDate}
                  variant="compact"
                  size="md"
                />
              )}
            </div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2"
              style={{ color: textColor }}
            >
              {getLocalizedValue(offer.name, offer.nameAr, locale)}
            </motion.h2>

            {/* Description */}
            {localizedDescription && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base md:text-lg opacity-90 max-w-2xl"
                style={{ color: textColor }}
              >
                {localizedDescription}
              </motion.p>
            )}
          </div>

          {/* Right side - CTA */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href={offer.ctaLink || '#'}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {ctaText}
                <ArrowRight className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Decorative pulse border */}
      <motion.div
        className="absolute inset-0 rounded-2xl md:rounded-3xl pointer-events-none"
        animate={{
          boxShadow: [
            'inset 0 0 0 0px rgba(255, 255, 255, 0)',
            'inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
            'inset 0 0 0 0px rgba(255, 255, 255, 0)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

/**
 * MultipleBanners Component
 *
 * Renders multiple offer banners in a stack
 */
interface MultipleBannersProps {
  locale: Locale;
  offers: Offer[];
  className?: string;
}

export function MultipleBanners({ locale, offers, className }: MultipleBannersProps) {
  if (offers.length === 0) return null;

  return (
    <div className={cn('space-y-6', className)}>
      {offers.map((offer) => (
        <OfferBanner
          key={offer.id}
          locale={locale}
          offer={offer}
        />
      ))}
    </div>
  );
}
