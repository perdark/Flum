'use client';

/**
 * HeroOffers Component
 *
 * Full-width hero carousel for featured offers with animated transitions
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { CountdownTimer } from './countdown-timer';
import { cn, getLocalizedValue } from '@/lib/utils';
import { heroCarousel } from '@/lib/animations';
import type { Locale } from '@/lib/i18n';

interface Offer {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  endDate: Date;
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
}

interface HeroOffersProps {
  locale: Locale;
  offers: Offer[];
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function HeroOffers({
  locale,
  offers,
  className,
  autoPlay = true,
  autoPlayInterval = 5000,
}: HeroOffersProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);

  // Filter offers for hero display and sort by position
  const heroOffers = offers
    .sort((a, b) => a.displayPosition - b.displayPosition);

  const offerIndex = page % heroOffers.length;
  const currentOffer = heroOffers[offerIndex];

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isPaused || heroOffers.length <= 1) return;

    const timer = setInterval(() => {
      paginate(1);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [page, autoPlay, isPaused, autoPlayInterval, heroOffers.length]);

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  const goToSlide = useCallback((index: number) => {
    setPage([index, index > offerIndex ? 1 : -1]);
  }, [offerIndex]);

  if (!heroOffers.length) return null;
  if (!currentOffer) return null;

  // Get background style
  const backgroundStyle = currentOffer.backgroundColor
    ? { backgroundColor: currentOffer.backgroundColor }
    : { background: 'linear-gradient(135deg, #FF7F50 0%, #FFB800 50%, #F88379 100%)' };

  const textColor = currentOffer.textColor || '#FFFFFF';

  // Get CTA text
  const ctaText = getLocalizedValue(currentOffer.ctaText, currentOffer.ctaTextAr, locale) ||
    (locale === 'ar' ? 'تسوق الآن' : 'Shop Now');

  const offerValue = currentOffer.type === 'percentage'
    ? `${currentOffer.value}%`
    : `$${currentOffer.value}`;

  const isRTL = locale === 'ar';
  const localizedDescription = getLocalizedValue(currentOffer.description, currentOffer.descriptionAr, locale);
  const textAlignClass = isRTL ? 'md:text-right' : 'md:text-start';

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden rounded-2xl md:rounded-3xl',
        className
      )}
      style={backgroundStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            custom={direction}
            variants={heroCarousel}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -10000) paginate(1);
              else if (swipe > 10000) paginate(-1);
            }}
          >
            <div className="container mx-auto px-4 md:px-8 lg:px-12 py-12 md:py-16">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className={`text-center ${textAlignClass} z-10`}
                >
                  {/* Discount Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/30"
                  >
                    <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: textColor }}>
                      {locale === 'ar' ? 'عرض خاص' : 'Special Offer'}
                    </span>
                    <span className="text-lg font-bold" style={{ color: textColor }}>
                      {offerValue} {locale === 'ar' ? 'خصم' : 'OFF'}
                    </span>
                  </motion.div>

                  {/* Heading */}
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight"
                    style={{ color: textColor }}
                  >
                    {getLocalizedValue(currentOffer.name, currentOffer.nameAr, locale)}
                  </motion.h1>

                  {/* Description */}
                  {localizedDescription && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-base md:text-lg mb-6 opacity-90 max-w-xl"
                      style={{ color: textColor }}
                    >
                      {localizedDescription}
                    </motion.p>
                  )}

                  {/* Countdown */}
                  {currentOffer.showCountdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mb-6"
                    >
                      <CountdownTimer
                        endDate={currentOffer.endDate}
                        variant="compact"
                        size="lg"
                        className="inline-flex"
                      />
                    </motion.div>
                  )}

                  {/* CTA Button */}
                  {currentOffer.ctaLink && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Link href={currentOffer.ctaLink}>
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
                  )}
                </motion.div>

                {/* Featured Image */}
                {currentOffer.featuredImage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="relative h-64 md:h-80 lg:h-96 w-full flex items-center justify-center"
                  >
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 2, -2, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src={currentOffer.featuredImage}
                        alt={getLocalizedValue(currentOffer.name, currentOffer.nameAr, locale)}
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                      />
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {heroOffers.length > 1 && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => paginate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/30"
            >
              <ChevronLeft className={cn('w-6 h-6', isRTL && 'rotate-180')} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => paginate(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors border border-white/30"
            >
              <ChevronRight className={cn('w-6 h-6', isRTL && 'rotate-180')} />
            </motion.button>
          </>
        )}

        {/* Pagination Dots */}
        {heroOffers.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroOffers.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === offerIndex
                    ? 'w-8 bg-white'
                    : 'bg-white/50 hover:bg-white/70'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Helper for swipe detection
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
