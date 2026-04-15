# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Flum dashboard + storefront. Self-hosted admin + customer-facing store for digital goods (game accounts, codes, keys). Replaces a manual Telegram/notebook workflow. Single Next.js app serves both the admin dashboard and the public storefront against one Neon Postgres DB.

Repo: github.com/perdark/Flum — this dir is `dashboard/` (the Next.js app).

## Commands

```bash
npm run dev                 # Next dev server
npm run build               # next build
npm run start               # next start (prod)
npm run lint                # eslint (eslint.config.mjs)

# Drizzle / Postgres
npm run db:generate         # generate migration from src/db/schema.ts → drizzle/
npm run db:migrate          # apply generated migrations
npm run db:push             # push schema directly (dev shortcut)
npm run db:studio           # drizzle-kit studio
npm run db:reset            # tsx src/seed.ts reset  (destructive; reseed)

# Ad-hoc schema guards (idempotent, run against live DB)
npm run db:ensure-staff-scope
npm run db:ensure-inventory-catalog
npm run db:ensure-order-schema
npm run db:seed-catalog-demo
```

`DATABASE_URL` required (Neon/Postgres). Loaded via `dotenv/config` in drizzle config and scripts.

No test runner configured. Do not fabricate `npm test`.

## Architecture

### Single Next.js app, two surfaces
- `src/app/dashboard/**` — admin UI (session cookie auth, RBAC).
- `src/app/store/**` — public storefront + customer account (separate customer auth, see `src/lib/customer-auth.ts` + `customer-context.tsx`).
- `src/app/api/**` — route handlers for both surfaces. Cron endpoints under `src/app/api/cron/*` (Vercel cron).
- `src/app/login` — admin login.

### Data layer
- Drizzle ORM + `postgres`/`@neondatabase/serverless`. Single schema file `src/db/schema.ts` is authoritative — both storefront and dashboard tables live there (users, sessions, customers, products, productVariants, inventoryItems, orders, orderItems, bundleItems, coupons, reviews, currencies, activity logs, etc.).
- Get the client via `getDb()` from `src/db`. Migrations in `drizzle/` (`0001`..`0019`).
- When you change schema, generate a migration (`db:generate`) rather than editing prior migration files. The `ensure-*.ts` scripts exist because some column adds were applied in-place to live DBs; prefer new migrations for new work.

### Services layer (`src/services/`)
Business logic lives here, not in route handlers. Critical pieces:
- `autoDelivery.ts` — **concurrency-safe** inventory picking. Uses `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction via `pickOneInventoryLine`. Supports multi-sell lines (one inventory row sellable N times with cooldown). Handles variant + inventory-catalog scoping through `sqlInventoryRowsForProduct` in `src/lib/inventoryProductScope.ts`. This is the solution to the historical "duplicate code delivery" race — do not bypass it.
- `multiSell.ts` — multi-sell allocation rules and cooldown reset.
- `bundles.ts` — bundles that pull child product/variant inventory atomically.
- `stockValidation.ts` — pre-flight checks before order creation.
- `storeCheckout.ts` / `storeOrderAutoFulfill.ts` — public checkout + the async path that moves paid orders into fulfilled state (cron-driven via `api/cron/store-auto-fulfill` and `api/orders/auto-fulfill-due`).
- `pricing.ts`, `fieldVisibility.ts`, `inventoryBulkAdd.ts`, `activityLog.ts`.

### Auth / RBAC
- Admin: `src/lib/auth.ts` — opaque session tokens in `session_token` cookie, 7-day expiry, rows in `sessions` table. Permissions derived from `role` + `staffAccessScope` (`full | inventory | inventory_orders`) via `ROLE_PERMISSIONS` / `STAFF_SCOPE_PERMISSIONS` in `src/types`.
- Customer (storefront): `src/lib/customer-auth.ts` + `customer-context.tsx`. Separate from admin users; `users.customerId` links the two when an admin also shops.
- Staff scope gating is enforced both server-side (route handlers) and via UI filters (`inventoryManualSellFilters.ts`, `inventoryProductScope.ts`).

### Orders lifecycle
Order statuses include pending → paid → on-hold/pending-approval → fulfilled. Key endpoints: `api/orders/[id]/approve`, `api/orders/[id]/hold`, `api/orders/claim`, `api/orders/release`, `api/orders/pending-approval`, `api/orders/auto-fulfill-due`. `orders.holdUntil` (migration 0015) backs the hold window; cron releases holds and triggers auto-fulfill.

### Inventory model
Three-layer: `products` → optional `productVariants` → `inventoryItems` rows (actual deliverable codes/accounts). An `inventory_catalog_item_id` (migration 0019) lets multiple products share an inventory pool. `bundleItems.variantId` (0016) lets bundles target specific variants. All stock lookups should go through `sqlInventoryRowsForProduct` to respect catalog + variant scoping consistently.

### Frontend
- React 19, Next 16 App Router, Tailwind v4 (`@tailwindcss/postcss`), Radix primitives, `framer-motion`, `sonner` toasts, `@tanstack/react-virtual` for large tables.
- Shared UI in `src/components/ui/**`; dashboard-specific in `src/components/dashboard/**`.
- RTL/Arabic support expected (solo dev based in Iraq; storefront serves Arabic users).

## Conventions

- API responses: `{ success, data, error }` shape.
- Any inventory mutation goes through a transaction + row lock. If adding a new delivery path, reuse `pickOneInventoryLine` / service helpers rather than writing new raw SQL against `inventory_items`.
- `scripts/ensure-*.ts` are idempotent schema patchers for prod DBs that drifted from migrations — safe to re-run.
- Payment provider is ZainCash (pending integration); no live payment code yet — fulfillment is triggered manually/via admin approval or cron for test orders.
