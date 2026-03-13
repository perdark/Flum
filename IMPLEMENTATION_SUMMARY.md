# Implementation Summary

This document summarizes the features implemented for the dashboard_next project.

## Completed Features

### 1. Platforms: Global Hierarchy + Product Multi-Select

**Database Changes:**
- `platforms` table with parent/child relationships
- `product_platform_links` join table (replaces per-product `product_platforms`)
- Soft delete support, unique constraint per parent

**API Routes:**
- `GET/POST /api/platforms` - List/create platforms with tree option
- `GET/PUT/DELETE /api/platforms/[id]` - Manage individual platforms

**UI:**
- `/dashboard/platforms` - Tree view with expand/collapse
- Create root, add child, rename, move, enable/disable, delete
- Search functionality

**TODO:** Product forms still need to be updated to use platformIds instead of platforms array.

### 2. Inventory: Scalable Management (300+ Products)

**Database Changes:**
- `inventory_batches` table for tracking imports
- Added `batchId` to `inventory_items`

**API Routes:**
- `GET /api/products/summary` - Lightweight product picker with counts
- `GET /api/inventory/search` - Global emergency search across all products
- `POST /api/inventory/batches` - Create/manage batches
- `POST /api/inventory/export` - Export available inventory as TSV/CSV
- Updated `POST /api/inventory` to support batchId

**UI:**
- `/dashboard/inventory` - Product-first view with searchable product list
- `/dashboard/inventory/search` - Global search page for emergencies
- Product list shows available/reserved/sold counts
- Inventory table shows dynamic columns based on template
- Export functionality

### 3. Manual Sell Flow

**Database Changes:**
- `order_delivery_snapshots` table for storing delivery results
- Added claim fields to orders (`claimedBy`, `claimedAt`, `claimExpiresAt`)

**API Routes:**
- `POST /api/manual-sell` - Process manual sale with:
  - Transaction-safe allocation using `FOR UPDATE SKIP LOCKED`
  - Shortage detection and handling
  - Optional create-missing flow
  - Delivery snapshot creation
- `GET /api/manual-sell/[id]` - Get delivery results

**UI:**
- `/dashboard/manual-sell` - Multi-product/multi-quantity selection
- Shortage handling options
- Delivery confirmation page
- `/dashboard/manual-sell/[id]` - Full delivery output page with:
  - Copy as TSV/CSV
  - Quick copy field values
  - Table with all delivered items

### 4. Order Claiming + Status Controls

**API Routes:**
- `POST /api/orders/claim` - Claim specific or next pending order
- `POST /api/orders/release` - Release claimed order
- Updated `PUT /api/orders/[id]` - Enforces claim checks for staff
- Updated `GET /api/orders` - Added claim filtering and claimant info

**UI:**
- Updated orders table with:
  - Claim status filter (unclaimed/mine/others)
  - "Claim Next" button
  - Claim/release actions
  - Visual indication for claimed orders
  - Status controls (processing, complete, cancel)

### 5. Activity Logging Updates

**New Actions:**
- `platform_created`, `platform_updated`, `platform_deleted`
- `batch_created`, `batch_rolled_back`
- `order_claimed`, `order_released`
- `manual_sell`

**Convenience Functions:**
- Added to `/src/services/activityLog.ts`

### 6. Sidebar Updates

Added menu items:
- Platforms (manage_products permission)
- Inventory Search (manage_inventory permission)
- Manual Sell (process_orders permission)

## Remaining Work

### Product Forms for Platform Selection
The product create/edit forms need to be updated to:
- Use `platformIds` array instead of `platforms` array
- Show a tree multi-select component
- Display selected platforms as removable chips
- The API is ready, but the UI components need updating

### Data Migration
A migration script should be created to:
1. Migrate existing `product_platforms` data to `platforms` + `product_platform_links`
2. Create platform nodes for each unique (name, region) combination
3. Link products to the new platform nodes

### Additional Ideas (see DASHBOARD_IDEAS.md)
- Product categories, tags, bundles
- Low stock alerts
- Customer management
- Advanced analytics
- 2FA, session management

## Database Migration

Run the following to create the new tables:

```sql
-- Platforms table
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES platforms(id) ON DELETE RESTRICT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Product platform links table
CREATE TABLE product_platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, platform_id)
);

-- Inventory batches table
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  source VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Add batchId to inventory_items
ALTER TABLE inventory_items ADD COLUMN batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL;

-- Order delivery snapshots table
CREATE TABLE order_delivery_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add claim fields to orders
ALTER TABLE orders ADD COLUMN claimed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN claimed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN claim_expires_at TIMESTAMP;

-- Add GIN index for JSONB search (for global inventory search)
CREATE INDEX inventory_items_values_gin_idx ON inventory_items USING GIN (values);
```
