"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn, debounce } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SearchAutocomplete,
  type SearchHit,
} from "@/components/store/SearchAutocomplete";

const POPULAR = ["Steam", "Xbox", "PlayStation", "Gift card", "Nintendo"];

interface SearchBarProps {
  className?: string;
  defaultValue?: string;
}

function PopularChips({ onPick }: { onPick: (term: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {POPULAR.map((p) => (
        <button
          key={p}
          type="button"
          className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium hover:bg-secondary"
          onClick={() => onPick(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function SearchBar({ className, defaultValue = "" }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/store/search?q=${encodeURIComponent(t)}`);
      const json = await res.json();
      setResults(json.success && Array.isArray(json.data) ? json.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(
    debounce((q: unknown) => {
      void runSearch(String(q));
    }, 280),
  ).current;

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const openSearch = () => setMobileOpen(true);
    window.addEventListener("store-open-search", openSearch);
    return () => window.removeEventListener("store-open-search", openSearch);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        setOpen(false);
        setMobileOpen(false);
        router.push(`/store/products?search=${encodeURIComponent(trimmed)}`);
      }
    },
    [value, router],
  );

  const applyPopular = (term: string) => {
    setValue(term);
    setOpen(true);
    void runSearch(term);
  };

  const desktopDropdown =
    open && (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {value.trim().length < 2 ? (
          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Popular searches
            </p>
            <PopularChips onPick={applyPopular} />
          </div>
        ) : (
          <SearchAutocomplete
            results={results}
            loading={loading}
            query={value}
            onPick={() => setOpen(false)}
            className="relative top-auto mt-0 max-h-[min(65vh,20rem)] border-0 shadow-none"
          />
        )}
      </div>
    );

  return (
    <>
      <div
        ref={wrapRef}
        className={cn("relative hidden min-w-0 flex-1 md:block", className)}
      >
        <form onSubmit={handleSubmit}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search products..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        {desktopDropdown}
      </div>

      <button
        type="button"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card md:hidden",
          className,
        )}
        aria-label="Open search"
        onClick={() => setMobileOpen(true)}
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          hideClose
          className={cn(
            "fixed left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-4",
            "data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-out-to-bottom-0",
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search products</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Search</span>
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit} className="relative shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-11 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>
          <div className="mt-4 shrink-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Popular searches
            </p>
            <PopularChips
              onPick={(term) => {
                setValue(term);
                void runSearch(term);
              }}
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card">
            <SearchAutocomplete
              results={results}
              loading={loading}
              query={value}
              onPick={() => setMobileOpen(false)}
              className="relative top-auto mt-0 max-h-none border-0 shadow-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
