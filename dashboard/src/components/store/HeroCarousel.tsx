"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreOffer } from "@/lib/store-queries";
import { CountdownTimer } from "@/components/store/CountdownTimer";

interface HeroCarouselProps {
  offers: StoreOffer[];
  /** Edge-to-edge hero (parent should use negative horizontal margin if needed). */
  fullBleed?: boolean;
}

export function HeroCarousel({ offers, fullBleed }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [barKey, setBarKey] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % offers.length);
    setBarKey((k) => k + 1);
  }, [offers.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + offers.length) % offers.length);
    setBarKey((k) => k + 1);
  }, [offers.length]);

  const go = useCallback(
    (i: number) => {
      setCurrent(i);
      setBarKey((k) => k + 1);
    },
    [],
  );

  useEffect(() => {
    if (offers.length <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, offers.length]);

  if (offers.length === 0) return null;

  const offer = offers[current];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none md:rounded-2xl",
        fullBleed && "md:rounded-none",
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35 }}
          className="relative min-h-[300px] md:min-h-[380px]"
          style={{
            backgroundColor: offer.backgroundColor || "#0c1222",
            color: offer.textColor || "#ffffff",
          }}
        >
          {(offer.featuredImage || offer.banner) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent md:from-black/60 md:via-black/25 md:to-transparent" />
              <img
                src={offer.featuredImage || offer.banner!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40 md:opacity-50"
              />
            </>
          )}

          <div className="relative z-10 mx-auto grid h-full max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:px-8 lg:px-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                {offer.name}
              </h2>
              {offer.description && (
                <p className="mt-3 text-base leading-relaxed opacity-90 md:text-lg">{offer.description}</p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {offer.ctaText && offer.ctaLink && (
                  <a
                    href={offer.ctaLink}
                    className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  >
                    {offer.ctaText}
                  </a>
                )}
                {offer.showCountdown && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                    <span className="opacity-80">Ends in</span>
                    <CountdownTimer endAt={offer.endDate} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {(offer.featuredImage || offer.banner) && (
              <div className="relative hidden min-h-[220px] md:block">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 to-transparent" />
                <img
                  src={offer.featuredImage || offer.banner!}
                  alt={offer.name}
                  className="h-full max-h-[320px] w-full rounded-2xl object-cover object-center shadow-2xl ring-1 ring-white/10"
                />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {offers.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 backdrop-blur-sm transition-colors hover:bg-white/25 sm:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 backdrop-blur-sm transition-colors hover:bg-white/25 sm:block"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 px-4 pb-3 pt-2">
              <div
              key={barKey}
              className="h-1 w-full overflow-hidden rounded-full bg-white/20"
              aria-hidden
            >
              <div
                className="h-full w-full origin-left bg-primary"
                style={{
                  animation: "hero-progress 5s linear forwards",
                }}
              />
            </div>
            <div className="flex justify-center gap-2">
              {offers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === current ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
                  )}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
