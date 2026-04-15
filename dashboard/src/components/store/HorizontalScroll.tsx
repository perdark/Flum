"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HorizontalScroll({
  children,
  className,
  gapClassName = "gap-4",
}: {
  children: React.ReactNode;
  className?: string;
  gapClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 360) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={cn("relative group/scroll", className)}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 shadow-md transition-opacity hover:bg-secondary md:flex opacity-0 pointer-events-none group-hover/scroll:opacity-100 group-hover/scroll:pointer-events-auto"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 shadow-md transition-opacity hover:bg-secondary md:flex opacity-0 pointer-events-none group-hover/scroll:opacity-100 group-hover/scroll:pointer-events-auto"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto pb-2 scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          gapClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
