'use client';

/**
 * OfferCards Component
 *
 * Grid of offer cards with hover animations
 */

import { motion } from 'framer-motion';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { CountdownTimer } from './countdown-timer';
import { cn, getLocalizedValue } from '@/lib/utils';
import { staggerContainer, fadeUp, cardHover } from '@/lib/animations';
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

interface OfferCardsProps {
  locale: Locale;
  offers: Offer[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function OfferCards({ locale, offers, className, columns = 3 }: OfferCardsProps) {
  const isRTL = locale === 'ar';
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  // Get default gradient based on index
  const getGradient = (index: number, bgColor: string | null) => {
    if (bgColor) return { backgroundColor: bgColor };
    const gradients = [
      'linear-gradient(135deg, #FF7F50 0%, #FFB800 100%)',
      'linear-gradient(135deg, #F88379 0%, #DE6E70 100%)',
      'linear-gradient(135deg, #FFB347 0%, #FFDAB9 100%)',
      'linear-gradient(135deg, #FFB800 0%, #FFF5E6 100%)',
    ];
    return { background: gradients[index % gradients.length] };
  };

  const ctaText = (cta: string | null, ctaAr: string | null) =>
    getLocalizedValue(cta, ctaAr, locale) || (locale === 'ar' ? 'عرض التفاصيل' : 'View Details');

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={cn('grid gap-6', gridCols, className)}
    >
      {offers.map((offer, index) => {
        const textColor = offer.textColor || '#FFFFFF';
        const offerValue = offer.type === 'percentage' ? `${offer.value}%` : `$${offer.value}`;

        return (
          <motion.div
            key={offer.id}
            variants={fadeUp}
            custom={index}
            whileHover="hover"
          >
            <Link href={offer.ctaLink || `/offers/${offer.slug}`}>
              <motion.div
                style={getGradient(index, offer.backgroundColor)}
                className="relative overflow-hidden rounded-2xl h-full min-h-[280px] p-6 cursor-pointer group"
                variants={cardHover}
                initial="rest"
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 h-full flex flex-col">
                  {/* Header with discount */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30">
                      <Tag className="w-4 h-4" style={{ color: textColor }} />
                      <span className="text-sm font-bold" style={{ color: textColor }}>
                        {offerValue} OFF
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3
                      className="text-xl font-bold mb-2 line-clamp-2"
                      style={{ color: textColor }}
                    >
                      {getLocalizedValue(offer.name, offer.nameAr, locale)}
                    </h3>
                    {offer.description && (
                      <p
                        className="text-sm opacity-90 line-clamp-2 mb-4"
                        style={{ color: textColor }}
                      >
                        {getLocalizedValue(offer.description, offer.descriptionAr, locale)}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  {offer.featuredImage && (
                    <div className="relative h-32 mb-4">
                      <Image
                        src={offer.featuredImage}
                        alt={getLocalizedValue(offer.name, offer.nameAr, locale)}
                        fill
                        className="object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    {/* Countdown */}
                    {offer.showCountdown && (
                      <CountdownTimer
                        endDate={offer.endDate}
                        variant="minimal"
                        size="sm"
                        showIcon={false}
                      />
                    )}

                    {/* CTA */}
                    <motion.span
                      className="inline-flex items-center gap-1 text-sm font-semibold"
                      style={{ color: textColor }}
                      whileHover={{ x: isRTL ? -4 : 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {ctaText(offer.ctaText, offer.ctaTextAr)}
                      <ArrowRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
                    </motion.span>
                  </div>
                </div>

                {/* Shine effect on hover */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={false}
                  animate={{
                    background: [
                      'linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%, transparent 100%)',
                      'linear-gradient(115deg, transparent 0%, transparent 60%, rgba(255,255,255,0.1) 70%, transparent 80%, transparent 100%)',
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
                />
              </motion.div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
