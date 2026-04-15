"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PriceDisplay } from "@/components/ui/currency-display";

interface Variant {
  id: string;
  optionCombination: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
  isDefault: boolean;
}

interface OptionGroup {
  id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
}

interface VariantSelectorProps {
  optionGroups: OptionGroup[];
  variants: Variant[];
  basePrice: number;
  compareAtPrice?: number | null;
  onVariantChange?: (variant: Variant | null) => void;
}

export function VariantSelector({
  optionGroups,
  variants,
  basePrice,
  compareAtPrice,
  onVariantChange,
}: VariantSelectorProps) {
  // Find the default variant's selections as initial state
  const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
  const initialSelections: Record<string, string> = {};
  if (defaultVariant) {
    for (const group of optionGroups) {
      initialSelections[group.name] = defaultVariant.optionCombination[group.name] || "";
    }
  }

  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);

  // Find matching variant
  const matchedVariant = useMemo(() => {
    if (optionGroups.length === 0) return null;
    return variants.find((v) =>
      optionGroups.every((g) => v.optionCombination[g.name] === selections[g.name]),
    ) ?? null;
  }, [selections, variants, optionGroups]);

  useEffect(() => {
    onVariantChange?.(matchedVariant);
  }, [matchedVariant, onVariantChange]);

  if (optionGroups.length === 0 || variants.length <= 1) {
    return null;
  }

  const displayPrice = matchedVariant?.price ?? basePrice;
  const displayCompare = matchedVariant?.compareAtPrice ?? compareAtPrice ?? null;

  return (
    <div className="space-y-4">
      {optionGroups.map((group) => (
        <div key={group.id}>
          <label className="text-sm font-medium mb-2 block">
            {group.name}
            {selections[group.name] && (
              <span className="text-muted-foreground font-normal ml-1.5">
                — {selections[group.name]}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {group.values.map((val) => {
              // Check if selecting this value leads to any in-stock variant
              const testSelections = { ...selections, [group.name]: val.value };
              const wouldMatch = variants.some(
                (v) =>
                  optionGroups.every(
                    (g) =>
                      !testSelections[g.name] || v.optionCombination[g.name] === testSelections[g.name],
                  ) && v.inStock,
              );

              const isSelected = selections[group.name] === val.value;

              return (
                <button
                  key={val.id}
                  onClick={() =>
                    setSelections((prev) => ({ ...prev, [group.name]: val.value }))
                  }
                  disabled={!wouldMatch && !isSelected}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : wouldMatch
                        ? "border-border hover:border-primary/50 hover:bg-primary/5"
                        : "border-border/50 text-muted-foreground/50 line-through cursor-not-allowed",
                  )}
                >
                  {val.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Updated price */}
      {matchedVariant && (
        <PriceDisplay
          price={displayPrice}
          compareAtPrice={displayCompare ?? undefined}
          className="pt-2"
        />
      )}

      {matchedVariant && !matchedVariant.inStock && (
        <p className="text-sm text-destructive font-medium">This variant is out of stock</p>
      )}
    </div>
  );
}
