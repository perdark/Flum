"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X, Filter } from "lucide-react";
import { PriceRangeSlider } from "@/components/store/PriceRangeSlider";

interface FilterCategory {
  name: string;
  slug: string;
}

export interface ProductFiltersProps {
  categories: FilterCategory[];
  /** Min/max sale price across active products (for range slider bounds) */
  priceBounds: { min: number; max: number };
  /** Where filter navigation applies (default: all products page) */
  listingPath?: string;
  /** When true, omit category list (e.g. on a fixed category route) */
  hideCategoryPicker?: boolean;
  className?: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "featured", label: "Featured" },
];

const PLATFORM_OPTIONS = [
  { value: "Steam", label: "Steam" },
  { value: "Xbox", label: "Xbox" },
  { value: "PlayStation", label: "PlayStation" },
  { value: "Nintendo", label: "Nintendo" },
];

const REGION_OPTIONS = [
  { value: "Global", label: "Global" },
  { value: "EU", label: "EU" },
  { value: "US", label: "US" },
  { value: "MENA", label: "MENA" },
];

const TYPE_OPTIONS = [
  { value: "game_keys", label: "Game keys" },
  { value: "gift_cards", label: "Gift cards" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "top_ups", label: "Top-ups" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any" },
  { value: "3", label: "3+ stars" },
  { value: "4", label: "4+ stars" },
  { value: "4.5", label: "4.5+ stars" },
];

function splitCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinCsv(arr: string[]): string | null {
  return arr.length ? arr.join(",") : null;
}

type Draft = {
  category: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  platforms: string[];
  regions: string[];
  types: string[];
  onSale: boolean;
  inStock: boolean;
  bundle: boolean;
  minRating: string;
};

function draftFromSearchParams(sp: URLSearchParams): Draft {
  return {
    category: sp.get("category") ?? "",
    sort: sp.get("sort") ?? "newest",
    minPrice: sp.get("minPrice") ?? "",
    maxPrice: sp.get("maxPrice") ?? "",
    platforms: splitCsv(sp.get("platforms")),
    regions: splitCsv(sp.get("regions")),
    types: splitCsv(sp.get("types")),
    onSale: sp.get("onSale") === "1" || sp.get("deals") === "1",
    inStock: sp.get("inStock") === "1",
    bundle: sp.get("bundle") === "1",
    minRating: sp.get("minRating") ?? "",
  };
}

function draftToParams(
  draft: Draft,
  preserve: URLSearchParams,
  opts?: { omitCategory?: boolean },
): URLSearchParams {
  const p = new URLSearchParams(preserve.toString());
  const filterKeys = [
    "category",
    "sort",
    "minPrice",
    "maxPrice",
    "platforms",
    "regions",
    "types",
    "onSale",
    "deals",
    "inStock",
    "bundle",
    "minRating",
    "page",
  ];
  for (const k of filterKeys) p.delete(k);

  if (!opts?.omitCategory && draft.category) p.set("category", draft.category);
  if (draft.sort && draft.sort !== "newest") p.set("sort", draft.sort);
  if (draft.minPrice) p.set("minPrice", draft.minPrice);
  if (draft.maxPrice) p.set("maxPrice", draft.maxPrice);
  const pl = joinCsv(draft.platforms);
  if (pl) p.set("platforms", pl);
  const rg = joinCsv(draft.regions);
  if (rg) p.set("regions", rg);
  const ty = joinCsv(draft.types);
  if (ty) p.set("types", ty);
  if (draft.onSale) p.set("onSale", "1");
  if (draft.inStock) p.set("inStock", "1");
  if (draft.bundle) p.set("bundle", "1");
  if (draft.minRating) p.set("minRating", draft.minRating);

  return p;
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border text-primary focus:ring-primary/30"
      />
      <span>{label}</span>
    </label>
  );
}

function FilterFields({
  draft,
  setDraft,
  categories,
  priceBounds,
  liveCommit,
  hideCategoryPicker,
}: {
  draft: Draft;
  setDraft?: Dispatch<SetStateAction<Draft>>;
  categories: FilterCategory[];
  priceBounds: { min: number; max: number };
  liveCommit?: (nextDraft: Draft) => void;
  hideCategoryPicker?: boolean;
}) {
  const sync = (next: Draft) => {
    if (liveCommit) liveCommit(next);
    else setDraft?.(() => next);
  };

  const minNum = draft.minPrice ? parseFloat(draft.minPrice) : priceBounds.min;
  const maxNum = draft.maxPrice ? parseFloat(draft.maxPrice) : priceBounds.max;

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Sort by</label>
        <select
          value={draft.sort}
          onChange={(e) => {
            const v = e.target.value;
            sync({ ...draft, sort: v });
          }}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {!hideCategoryPicker && categories.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Category</label>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => sync({ ...draft, category: "" })}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                !draft.category ? "bg-primary/10 font-medium text-primary" : "text-foreground/70 hover:bg-secondary",
              )}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => sync({ ...draft, category: cat.slug })}
                className={cn(
                  "block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                  draft.category === cat.slug
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground/70 hover:bg-secondary",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Price range</label>
        <PriceRangeSlider
          boundMin={priceBounds.min}
          boundMax={priceBounds.max}
          valueMin={Number.isFinite(minNum) ? minNum : priceBounds.min}
          valueMax={Number.isFinite(maxNum) ? maxNum : priceBounds.max}
          onChange={(lo, hi) => {
            sync({
              ...draft,
              minPrice: lo > priceBounds.min ? String(lo) : "",
              maxPrice: hi < priceBounds.max ? String(hi) : "",
            });
          }}
        />
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Platform</span>
        <div className="space-y-0.5">
          {PLATFORM_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              checked={draft.platforms.includes(opt.value)}
              onChange={(on) => {
                const next = on
                  ? [...draft.platforms, opt.value]
                  : draft.platforms.filter((x) => x !== opt.value);
                sync({ ...draft, platforms: next });
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Region</span>
        <div className="space-y-0.5">
          {REGION_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              checked={draft.regions.includes(opt.value)}
              onChange={(on) => {
                const next = on
                  ? [...draft.regions, opt.value]
                  : draft.regions.filter((x) => x !== opt.value);
                sync({ ...draft, regions: next });
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Product type</span>
        <div className="space-y-0.5">
          {TYPE_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              checked={draft.types.includes(opt.value)}
              onChange={(on) => {
                const next = on
                  ? [...draft.types, opt.value]
                  : draft.types.filter((x) => x !== opt.value);
                sync({ ...draft, types: next });
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Minimum rating</label>
        <select
          value={draft.minRating}
          onChange={(e) => sync({ ...draft, minRating: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value || "any"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3">
        <CheckboxRow label="On sale" checked={draft.onSale} onChange={(on) => sync({ ...draft, onSale: on })} />
        <CheckboxRow label="In stock" checked={draft.inStock} onChange={(on) => sync({ ...draft, inStock: on })} />
        <CheckboxRow label="Bundles only" checked={draft.bundle} onChange={(on) => sync({ ...draft, bundle: on })} />
      </div>
    </div>
  );
}

export function ProductFilters({
  categories,
  priceBounds,
  listingPath = "/store/products",
  hideCategoryPicker,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDraft, setMobileDraft] = useState<Draft>(() => draftFromSearchParams(searchParams));

  useEffect(() => {
    if (mobileOpen) {
      let d = draftFromSearchParams(searchParams);
      if (hideCategoryPicker) d = { ...d, category: "" };
      setMobileDraft(d);
    }
  }, [mobileOpen, searchParams, hideCategoryPicker]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const liveDraft = useMemo(() => {
    const d = draftFromSearchParams(searchParams);
    if (hideCategoryPicker) return { ...d, category: "" };
    return d;
  }, [searchParams, hideCategoryPicker]);

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.push(qs ? `${listingPath}?${qs}` : listingPath);
    },
    [router, listingPath],
  );

  const liveCommit = useCallback(
    (d: Draft) => {
      const p = draftToParams(d, searchParams, { omitCategory: hideCategoryPicker });
      pushParams(p);
    },
    [pushParams, searchParams, hideCategoryPicker],
  );

  const activeCategory = searchParams.get("category") || "";
  const activeSort = searchParams.get("sort") || "newest";
  const searchQuery = searchParams.get("search") || "";
  const hasPrice = !!(searchParams.get("minPrice") || searchParams.get("maxPrice"));
  const hasPlatforms = !!searchParams.get("platforms");
  const hasRegions = !!searchParams.get("regions");
  const hasTypes = !!searchParams.get("types");
  const hasOnSale = searchParams.get("onSale") === "1" || searchParams.get("deals") === "1";
  const hasInStock = searchParams.get("inStock") === "1";
  const hasBundle = searchParams.get("bundle") === "1";
  const hasRating = !!searchParams.get("minRating");

  const hasFilters =
    activeCategory ||
    searchQuery ||
    activeSort !== "newest" ||
    hasPrice ||
    hasPlatforms ||
    hasRegions ||
    hasTypes ||
    hasOnSale ||
    hasInStock ||
    hasBundle ||
    hasRating;

  const clearFilters = useCallback(() => {
    const p = new URLSearchParams();
    const preserve = ["search", "featured", "new", "bundle"] as const;
    for (const k of preserve) {
      const v = searchParams.get(k);
      if (v) p.set(k, v);
    }
    pushParams(p);
    setMobileOpen(false);
  }, [pushParams, searchParams]);

  const applyMobile = useCallback(() => {
    const d = hideCategoryPicker ? { ...mobileDraft, category: "" } : mobileDraft;
    const p = draftToParams(d, searchParams, { omitCategory: hideCategoryPicker });
    pushParams(p);
    setMobileOpen(false);
  }, [mobileDraft, pushParams, searchParams, hideCategoryPicker]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </h3>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          <Filter className="h-4 w-4" />
          Open filters
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close filters"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-product-filters-title"
            className={cn(
              "relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <h2 id="store-product-filters-title" className="text-base font-bold text-foreground">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FilterFields
                draft={mobileDraft}
                setDraft={setMobileDraft}
                categories={categories}
                priceBounds={priceBounds}
                hideCategoryPicker={hideCategoryPicker}
              />
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={applyMobile}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h3>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="mt-4">
          <FilterFields
            draft={liveDraft}
            categories={categories}
            priceBounds={priceBounds}
            liveCommit={liveCommit}
            hideCategoryPicker={hideCategoryPicker}
          />
        </div>
      </div>
    </div>
  );
}
