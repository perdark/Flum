import Link from "next/link";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  {
    name: "Steam",
    slug: "steam",
    gradient: "from-[#1b2838] to-[#2a475e]",
    accent: "PC games & wallet",
  },
  {
    name: "PlayStation",
    slug: "playstation",
    gradient: "from-[#003087] to-[#0070d1]",
    accent: "Gift cards & subs",
  },
  {
    name: "Xbox",
    slug: "xbox",
    gradient: "from-[#107c10] to-[#0e5a0e]",
    accent: "Game Pass & codes",
  },
  {
    name: "Nintendo",
    slug: "nintendo",
    gradient: "from-[#e60012] to-[#b3000e]",
    accent: "eShop & memberships",
  },
] as const;

export function PlatformShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-2xl font-bold text-foreground">Shop by platform</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORMS.map((p) => (
          <Link
            key={p.slug}
            href={`/store/categories/${p.slug}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border p-6 text-white shadow-lg transition-transform hover:scale-[1.02]",
              "bg-gradient-to-br",
              p.gradient,
            )}
          >
            <div className="relative z-10">
              <h3 className="text-xl font-bold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-white/80">{p.accent}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-white/90 underline-offset-4 group-hover:underline">
                Browse →
              </span>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          </Link>
        ))}
      </div>
    </section>
  );
}
