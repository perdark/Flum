'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/api-client';
import { getPlatforms } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface PlatformsListProps {
  locale: string;
  limit?: number;
}

const PLATFORM_COLORS: string[] = [
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

const PLATFORM_ICONS: Record<string, string> = {
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

function getPlatformIcon(slug: string | null | undefined): string {
  if (!slug) return '📦';
  return PLATFORM_ICONS[slug] || '📦';
}

function getPlatformColor(slug: string | null | undefined): string {
  if (!slug) return PLATFORM_COLORS[0];
  const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PLATFORM_COLORS[hash % PLATFORM_COLORS.length];
}

export function PlatformsList({ locale, limit }: PlatformsListProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatforms() {
      setLoading(true);
      const result = await getPlatforms({ locale, includeChildren: false });
      if (result.success && result.data) {
        // Flatten tree structure if returned as tree
        const flatPlatforms = result.data.flatMap((p: any) => {
          if (p.children?.length > 0) {
            return [p, ...p.children];
          }
          return p;
        });
        setPlatforms(limit ? flatPlatforms.slice(0, limit) : flatPlatforms);
      }
      setLoading(false);
    }
    fetchPlatforms();
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

  if (platforms.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {platforms.map((platform) => (
        <div
          key={platform.id}
          className="group"
        >
          <Card className="card-glow text-center">
            <CardContent className="p-6">
              <div
                className={cn(
                  'w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl',
                  'transition-all duration-300 group-hover:scale-110',
                  getPlatformColor(platform.slug)
                )}
              >
                {platform.icon || getPlatformIcon(platform.slug)}
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {locale === 'ar' && platform.nameAr
                  ? platform.nameAr
                  : platform.name}
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
