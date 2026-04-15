---
name: Store Design Patterns
description: UI conventions, CSS variables, component class signatures, and recurring patterns for the storefront
type: project
---

## CSS Variables (defined in globals.css under .store-theme / .store-theme.store-dark)
- `--store-discount`: amber `#f59e0b` — used for discount badges and price strikethroughs
- `--store-glow`: box-shadow for product card hover glow
- `--background`: `#f8fafc` (light) / `#0c1222` (dark)
- `--card`: `#ffffff` (light) / `#131b2e` (dark)
- `--border`: `#e2e8f0` (light) / `#1e293b` (dark)
- `--primary`: `#3b82f6` (blue, both themes)
- `--success`: `#22c55e`

## Card Patterns
- Rounded: `rounded-xl` (smaller cards) or `rounded-2xl` (page sections, modals)
- Border: `border border-border`
- Background: `bg-card`
- Shadow: `shadow-sm` standard, `shadow-2xl` for modals/drawers

## Status Badge Pattern
- Pending: `bg-amber-500/15 text-amber-600 dark:text-amber-400`
- Processing: `bg-blue-500/15 text-blue-600 dark:text-blue-400`
- Completed: `bg-green-500/15 text-green-600 dark:text-green-400`
- Cancelled: `bg-destructive/15 text-destructive`
- Badge classes: `rounded-full px-2-3 py-0.5-1 text-[10px]-xs font-semibold uppercase tracking-wide`

## Input Pattern (auth forms, checkout, etc.)
```
mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground
placeholder:text-muted-foreground
focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
transition-colors
```

## Auth/Account Page Layout
- Centered card: `flex min-h-[calc(100vh-10rem)] items-center justify-center`
- Card: `rounded-2xl border border-border bg-card p-8 shadow-sm w-full max-w-md`
- Icon header: `h-12 w-12 rounded-xl bg-primary/10 text-primary`

## Trust/Feature Icon Color Convention
- Amber: delivery/speed (Zap)
- Blue: support/info (Headphones)
- Green: security/success (ShieldCheck)
- Primary blue: reviews/quality (Star)

## Empty State Pattern
- Container: `flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center`
- Icon: `mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary`
- CTA: `mt-6 inline-flex rounded-lg/xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground`

## Section Header Pattern (homepage strips)
- Title: `text-xl font-bold text-foreground sm:text-2xl`
- Subtitle: `mt-0.5 text-sm text-muted-foreground`
- View all link: `text-sm font-medium text-primary hover:underline inline-flex items-center gap-1`

## Product Card
- Aspect: `aspect-[3/4]`
- Hover: `whileHover={{ y: -2 }}` + `hover:scale-[1.02] hover:shadow-[var(--store-glow)]`
- Add-to-cart panel slides up on hover via `translate-y-full → translate-y-0`

## Animations
- AnnouncementBar: `AnimatePresence` with `y: 6 → 0` fade-slide for message rotation
- HeroCarousel: Framer Motion `x: 24 → 0` slide between offers, 5s auto-advance with progress bar
- ProductGrid: `staggerContainer` + `fadeUp` from `src/lib/animations.ts`
- QuickViewModal: `scale: 0.95 → 1` with backdrop fade

## Navigation
- Header: sticky, `z-40`, `bg-card/95 backdrop-blur-md`
- MobileTabBar: fixed bottom, `z-40`, safe-area padding
- CartDrawer: fixed right, `z-[100]`, `max-w-md`
- QuickViewModal: `z-[150]`
- Lightbox: `z-[200]`

**Why:** Consistent z-index stacking prevents layering bugs. Always check before adding new fixed/absolute layers.
**How to apply:** Follow the z-index ladder when adding overlays: header 40 → cart 100 → quick view 150 → lightbox 200.
