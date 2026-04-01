# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin dashboard for the Fulmen Empire digital product store. Built with Next.js 16 (App Router) + Drizzle ORM + Neon PostgreSQL. The dashboard and a separate storefront project share the same database.

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

## Architecture

### Database Layer
- **Schema**: `src/db/schema.ts` — single file defining all tables (shared with storefront)
- **Connection**: `src/db/index.ts` — `getDb()` returns a Drizzle instance over Neon serverless with connection pooling (max 10)
- **Migrations**: `drizzle/` directory, configured in `drizzle.config.ts`
- All IDs are UUIDs. Products use soft deletes (`deletedAt` timestamp).

### Authentication & Authorization
- **Auth logic**: `src/lib/auth.ts` — cookie-based sessions (7-day expiry), stored in DB
- **Permissions**: `src/types/index.ts` defines `ROLE_PERMISSIONS` map and `PERMISSIONS` constants
- Three roles: `admin`, `staff`, `merchant` — each with a fixed permission set
- API routes protect themselves by calling `requirePermission(PERMISSIONS.X)` or `requireAuth()` at the top of the handler. These throw on failure.

### API Routes (`src/app/api/`)
All routes use Next.js Route Handlers (`NextRequest`/`NextResponse`). Standard pattern:
1. Call `requirePermission()` for auth
2. Parse request body/params
3. Query via Drizzle (`getDb()`)
4. Return `NextResponse.json()`
5. Log activity via `src/services/activityLog.ts`

### Services (`src/services/`)
Business logic extracted from routes: activity logging, auto-delivery, bundles, pricing, multi-sell, stock validation.

### Frontend
- **Pages**: `src/app/dashboard/` — protected by auth check in `layout.tsx` (redirects to `/login`)
- **Components**: `src/components/dashboard/` for feature components, `src/components/ui/` for Radix UI primitives
- **Styling**: Tailwind CSS v4 via PostCSS, dark/light theme via `next-themes`, CSS variables in `globals.css`
- **Utilities**: `src/lib/utils.ts` — `cn()` for class merging, `formatCurrency()`, `generateSlug()`, etc.
- **Animations**: Framer Motion variants defined in `src/lib/animations.ts`

### Key Domain Concepts
- **Inventory templates**: define the field schema (custom fields, groups) for inventory items linked to products
- **Product purchase options**: products can have multiple purchase options with region-based pricing
- **Bundle products**: composed of line items referencing other products/templates
- **Manual sell**: staff can create orders manually, with both auto-fulfill (template-based) and manual inventory flows
- **Stock types**: categorize inventory items
