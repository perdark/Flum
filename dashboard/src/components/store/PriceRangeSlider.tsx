"use client";

import { cn } from "@/lib/utils";

export interface PriceRangeSliderProps {
  boundMin: number;
  boundMax: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  className?: string;
}

export function PriceRangeSlider({
  boundMin,
  boundMax,
  valueMin,
  valueMax,
  onChange,
  className,
}: PriceRangeSliderProps) {
  const step = 1;

  if (boundMax <= boundMin) {
    return (
      <p className={cn("border-0 p-0 text-xs text-muted-foreground", className)}>
        No price range for filters.
      </p>
    );
  }

  let lo = Math.min(Math.max(valueMin, boundMin), boundMax);
  let hi = Math.max(Math.min(valueMax, boundMax), boundMin);
  if (hi <= lo) {
    hi = Math.min(boundMax, lo + step);
  }
  if (hi <= lo) {
    lo = Math.max(boundMin, hi - step);
  }

  const minTrackMax = Math.max(boundMin, hi - step);
  const maxTrackMin = Math.min(boundMax, lo + step);

  return (
    <fieldset className={cn("space-y-3 border-0 p-0", className)}>
      <legend className="sr-only">Price range</legend>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
      <div className="grid gap-3">
        <label className="block text-[11px] font-medium text-muted-foreground">
          Min
          <input
            type="range"
            min={boundMin}
            max={minTrackMax}
            step={step}
            value={Math.min(lo, minTrackMax)}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(Math.max(boundMin, Math.min(v, hi - step)), hi);
            }}
            className="mt-1 w-full accent-primary"
          />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Max
          <input
            type="range"
            min={maxTrackMin}
            max={boundMax}
            step={step}
            value={Math.max(hi, maxTrackMin)}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange(lo, Math.min(boundMax, Math.max(v, lo + step)));
            }}
            className="mt-1 w-full accent-primary"
          />
        </label>
      </div>
    </fieldset>
  );
}
