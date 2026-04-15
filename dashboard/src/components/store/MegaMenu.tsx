"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { StoreCategory } from "@/lib/store-queries";
import { ChevronRight } from "lucide-react";

function categoryTreeActive(cat: StoreCategory, pathname: string): boolean {
  if (pathname === `/store/categories/${cat.slug}`) return true;
  return cat.children.some((c) => categoryTreeActive(c, pathname));
}

function CategoryColumns({ nodes, depth = 0 }: { nodes: StoreCategory[]; depth?: number }) {
  if (nodes.length === 0) return null;
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "border-l border-border pl-3")}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/store/categories/${node.slug}`}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-secondary hover:text-foreground"
          >
            <span className="truncate">{node.name}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
          </Link>
          {node.children.length > 0 && (
            <div className="mt-1">
              <CategoryColumns nodes={node.children} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function MegaMenu({
  categories,
  className,
}: {
  categories: StoreCategory[];
  className?: string;
}) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);

  if (categories.length === 0) return null;

  return (
    <nav
      className={cn(
        "hidden border-t border-border bg-card/90 md:block",
        className,
      )}
      onMouseLeave={() => setOpenId(null)}
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-center gap-1 px-4 lg:px-8">
        {categories.map((cat) => {
          const active = categoryTreeActive(cat, pathname);
          const hasPanel = cat.children.length > 0;

          return (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => hasPanel && setOpenId(cat.id)}
            >
              <Link
                href={`/store/categories/${cat.slug}`}
                className={cn(
                  "flex h-11 items-center px-3 text-sm font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-foreground/80 hover:text-foreground",
                )}
              >
                {cat.name}
              </Link>

              {hasPanel && openId === cat.id && (
                <div className="absolute left-1/2 top-full z-50 mt-0 w-[min(100vw-2rem,42rem)] -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2">
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                      <Link
                        href={`/store/categories/${cat.slug}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="max-h-72 overflow-y-auto pr-1">
                      <CategoryColumns nodes={cat.children} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
