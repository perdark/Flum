# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin dashboard for the Fulmen Empire digital product store. Built with Next.js 16 (App Router) + Drizzle ORM + Neon PostgreSQL. The dashboard and a separate storefront project share the same database (`src/db/schema.ts`).

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build (note: tsconfig ignores TS build errors)
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration files from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema directly (skip migration files)
npm run db:studio    # Open Drizzle Studio browser UI
```

No test framework is configured.

One-off scripts can be run with `npx tsx <script>.ts` (tsx is a devDependency).

## Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string (required)
- `NODE_ENV` — controls `secure` flag on session cookies

## Architecture

### Database Layer
- **Schema**: `src/db/schema.ts` — single file defining all tables (shared with storefront)
- **Connection**: `src/db/index.ts` — `getDb()` returns a Drizzle instance over Neon serverless with connection pooling (max 10)
- **Migrations**: `drizzle/` directory, configured in `drizzle.config.ts`
- All IDs are UUIDs. Products use soft deletes (`deletedAt` timestamp).

### Authentication & Authorization
- **Auth logic**: `src/lib/auth.ts` — cookie-based sessions (`session_token` cookie, 7-day expiry, stored in DB, HttpOnly + SameSite lax)
- **Permissions**: `src/types/index.ts` defines `ROLE_PERMISSIONS` map and `PERMISSIONS` constants
- Three roles with fixed permission sets:
  - `admin` — all permissions including staff management, settings, analytics, coupons, offers
  - `staff` — view products, manage inventory, view and process orders
  - `merchant` — read-only access to products and orders
- API routes protect themselves by calling `requirePermission(PERMISSIONS.X)` or `requireAuth()` at the top of the handler. These throw on failure. No `middleware.ts` — all auth is per-route.

### API Routes (`src/app/api/`)
All routes use Next.js Route Handlers (`NextRequest`/`NextResponse`). Standard pattern:
1. Call `requirePermission()` for auth
2. Parse request body/params
3. Query via Drizzle (`getDb()`)
4. Return `NextResponse.json()` — responses use `{ success, data }` or `{ success, error }` shape
5. Log activity via `src/services/activityLog.ts`

Key route groups: `auth`, `products`, `inventory`, `orders`, `manual-sell`, `costs`, `coupons`, `offers`, `categories`, `currencies`, `customers`, `reviews`, `staff`, `analytics`, `activity-logs`, `store-settings`, `admin`.

### Services (`src/services/`)
Business logic extracted from routes — use these instead of duplicating logic in routes:
- **activityLog.ts** — `logActivity()` for audit trail (all admin actions must log here)
- **autoDelivery.ts** — `pickOneInventoryLine()` uses DB row locking to allocate inventory; handles multi-sell `saleCount` increment and `cooldown_until`
- **multiSell.ts** — `getVirtualStock()` for sellable quantity on multi-sell items; `getCooldownDisplay()` for UI
- **pricing.ts** — `getProductPricing()` for tiered pricing by customer type (retail/merchant/admin)
- **bundles.ts** — `getBundleComposition()`, `flattenBundleForOrder()` for composite product logic
- **stockValidation.ts** — validate inventory stock counts against linked field totals
- **fieldVisibility.ts** — filter inventory field visibility by context (admin/merchant/customer)

### Utility Modules
- `src/utils/security.ts` — `generateSessionToken()`, `isValidUuid()` for auth and input validation
- `src/lib/inventoryCodes.ts` — counts atomic values (codes) per inventory row for multi-line/array fields
- `src/lib/inventoryLineSummary.ts` — summarises inventory line data for display
- `src/lib/inventoryProductScope.ts` — scopes inventory queries by product context

### Frontend
- **Pages**: `src/app/dashboard/` — protected by auth check in `layout.tsx` (redirects to `/login`)
- **Components**: `src/components/dashboard/` for feature components, `src/components/ui/` for Radix UI primitives
- **Styling**: Tailwind CSS v4 via PostCSS, dark/light theme via `next-themes`, CSS variables in `globals.css`
- **Utilities**: `src/lib/utils.ts` — `cn()` for class merging, `formatCurrency()`, `generateSlug()`, etc.
- **Animations**: Framer Motion variants defined in `src/lib/animations.ts`
- **Notifications**: `sonner` toast library (via `<Toaster>` in root layout)

### Key Domain Concepts
- **Inventory templates**: define the custom field schema for inventory items. Each product references a template; items store dynamic field values. Field groups and visibility rules control what's shown per customer type.
- **Multi-sell**: a single inventory item can be sold up to N times before entering a cooldown period. `saleCount` tracks usage; `cooldown_until` gates re-use. `autoDelivery.ts` handles the locking.
- **Bundle products**: composed of `bundleItems` referencing other products/templates. `bundles.ts` handles flattening into order line items, grouping by template field.
- **Manual sell**: staff creates orders manually via `/manual-sell`. Fulfillment can be auto (template-based allocation via `autoDelivery.ts`) or manual (staff selects specific inventory items).
- **Tiered pricing**: `productPricing` table stores cost/wholesale/retail prices per product. `pricing.ts` resolves the right tier based on the requesting customer type.
- **Product variants**: `productOptionGroups` → `productOptionValues` define option axes; `productVariants` store SKU/price per combination.
- **Offers & coupons**: `offers` drive promotional banners/hero/modal display on the storefront; `coupons` are discount codes with usage tracking.
- **Activity logs**: all mutations should call `logActivity()` — this is the audit trail visible at `/activity-logs`.
