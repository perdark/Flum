'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/api-client';
import { getCategories } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoriesListProps {
  locale: string;
  limit?: number;
}

const CATEGORY_COLORS: string[] = [
  'from-blue-600 to-blue-800',
  'from-blue-500 to-indigo-600',
  'from-green-500 to-green-700',
  'from-red-600 to-red-800',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-700',
  'from-orange-500 to-orange-700',
  'from-pink-500 to-pink-700',
  'from-cyan-500 to-cyan-700',
  'from-yellow-500 to-yellow-700',
];

const CATEGORY_ICONS: Record<string, string> = {
  steam: '🎮',
  playstation: '🎯',
  xbox: '🟢',
  netflix: '🎬',
  spotify: '🎵',
  ai: '🤖',
  nintendo: '🍄',
  discord: '💬',
  xbox_game_pass: '☁️',
  ea_app: '🎨',
};

function getCategoryIcon(slug: string | null | undefined): string {
  if (!slug) return '📦';
  return CATEGORY_ICONS[slug] || '📦';
}

function getCategoryColor(slug: string | null | undefined): string {
  if (!slug) return CATEGORY_COLORS[0];
  const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

export function CategoriesList({ locale, limit }: CategoriesListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const result = await getCategories({ locale, includeChildren: false });
      if (result.success && result.data) {
        // Flatten tree structure if returned as tree
        const flatCategories = result.data.flatMap((p: any) => {
          if (p.children?.length > 0) {
            return [p, ...p.children];
          }
          return p;
        });
        setCategories(limit ? flatCategories.slice(0, limit) : flatCategories);
      }
      setLoading(false);
    }
    fetchCategories();
  }, [locale, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="w-20 h-20 mx-auto rounded-2xl" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="group"
        >
          <Card className="card-glow text-center">
            <CardContent className="p-6">
              <div
                className={cn(
                  'w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl',
                  'transition-all duration-300 group-hover:scale-110',
                  getCategoryColor(category.slug)
                )}
              >
                {category.icon || getCategoryIcon(category.slug)}
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {locale === 'ar' && category.nameAr
                  ? category.nameAr
                  : category.name}
              </h3>
              <p className="text-xs text-text-muted">
                {locale === 'ar' ? 'منتجات' : 'products'}
              </p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
