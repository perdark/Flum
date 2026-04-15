"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface CategoryNavProps {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    children: Array<{ id: string; name: string; slug: string }>;
  }>;
  activeSlug?: string;
}

export function CategoryNav({ categories, activeSlug }: CategoryNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (categories.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="relative"
          onMouseEnter={() => cat.children.length > 0 && setOpenId(cat.id)}
          onMouseLeave={() => setOpenId(null)}
        >
          <Link
            href={`/store/categories/${cat.slug}`}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              activeSlug === cat.slug
                ? "text-primary bg-primary/5"
                : "text-foreground/70 hover:text-foreground hover:bg-secondary",
            )}
          >
            {cat.name}
            {cat.children.length > 0 && <ChevronDown className="h-3.5 w-3.5" />}
          </Link>

          {cat.children.length > 0 && openId === cat.id && (
            <div className="absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-lg border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
              {cat.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/store/categories/${child.slug}`}
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-colors",
                    activeSlug === child.slug
                      ? "text-primary bg-primary/5"
                      : "text-foreground/70 hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
