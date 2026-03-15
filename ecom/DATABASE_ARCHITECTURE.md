# Fulmen Empire - Database Architecture Documentation

## 1. Overview

The Fulmen Empire database is designed for a **digital products e-commerce platform** that scales to 1000+ products and beyond. The schema is optimized for:
- **Read-heavy workloads** (product browsing, search, recommendations)
- **Multi-language support** (English & Arabic)
- **Multi-platform products** (products on Steam, PlayStation, etc.)
- **Flexible delivery** (auto key, account, manual, contact)
- **Points & rewards system**
- **Review moderation**

---

## 2. Entity Relationship Diagram (ERD)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Users    │────▶│    Orders   │────▶│ Order_Items │────▶│  Deliveries │
│             │     │             │     │             │     │             │
│             │────▶│    Cart     │     └─────────────┘     │  Reviews    │
└─────────────┘     │  Cart_Items │                        │             │
       │             └─────────────┘                        │             │
       ▼                                                        ▼             ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Wishlist  │◀────┐│  Products   │◀────┴Product_Img │     │ Recommendations│
│             │     ││             │◀────┴Product_Vid │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                 ▲
       │                                 │
       ▼                                 │
┌─────────────┐                     ┌─────────────┐
│   Points    │◀────┐              │  Platforms  │
│  Balance    │     │              │  (tree)     │
└─────────────┘     │              └─────────────┘
       │             │
       ▼             ▼
┌─────────────┐     ┌─────────────┐
│   Points    │     │  Categories  │
│Transactions│     └─────────────┘
└─────────────┘
```

---

## 3. Table Specifications

### 3.1 Core Tables

#### `users`
User accounts and authentication data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `email` | varchar(255) UNIQUE | Email for login |
| `password_hash` | varchar(255) | Bcrypt hash |
| `first_name` | varchar(100) | User's first name |
| `last_name` | varchar(100) | User's last name |
| `is_active` | boolean | Account status |
| `is_email_verified` | boolean | Email verification status |
| `role` | varchar(20) | customer, admin, super_admin |
| `last_login_at` | timestamp | Last login time |

**Indexes:**
- `email` - Unique, for login lookups
- `is_active` - For filtering active users
- `role` - For filtering by role

#### `products`
Core product catalog with multi-language support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `sku` | varchar(100) UNIQUE | Stock keeping unit |
| `slug` | varchar(500) UNIQUE | URL-friendly identifier |
| `name` | varchar(500) | Product name (English) |
| `name_ar` | varchar(500) | Product name (Arabic) |
| `description` | text | Full description (English) |
| `description_ar` | text | Full description (Arabic) |
| `base_price` | decimal(10,2) | Price in USD |
| `compare_at_price` | decimal(10,2) | Original price for discounts |
| `category_id` | uuid | FK to categories |
| `delivery_type` | varchar(50) | auto_key, auto_account, manual, contact |
| `points_reward` | integer | Points earned on purchase |
| `rating_average` | decimal(3,2) | Denormalized avg rating |
| `sales_count` | integer | Total units sold |
| `is_active` | boolean | Visibility in store |
| `is_featured` | boolean | Show on homepage |
| `is_new` | boolean | Mark as new arrival |

**Indexes:**
- `slug` - Unique, for product pages
- `category_id` - For category filtering
- `is_active` - For showing active products
- `rating_average` - For sorting by rating
- `sales_count` - For bestsellers
- `base_price` - For price range filtering
- `delivery_type` - For filtering by delivery type

#### `platforms`
Hierarchical platform tree using adjacency list pattern.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `parent_id` | uuid | FK to platforms.id (self-ref) |
| `level` | smallint | Tree depth (0=root, 1=child) |
| `path` | varchar(500) | Materialized path "/gaming/steam" |
| `name` | varchar(255) | Platform name (English) |
| `name_ar` | varchar(255) | Platform name (Arabic) |
| `product_count` | integer | Denormalized product count |

**Indexes:**
- `parent_id` - For tree queries
- `path` - For subtree queries
- `level` - For filtering by depth
- `is_active` - For active platforms

#### `product_platforms`
Many-to-many relationship between products and platforms.

| Column | Type | Description |
|--------|------|-------------|
| `product_id` | uuid | FK to products |
| `platform_id` | uuid | FK to platforms |
| `platform_price` | decimal(10,2) | Platform-specific price override |
| `is_primary` | boolean | Primary platform for display |

**Indexes:**
- Composite PK on (product_id, platform_id)
- `is_primary` - For quick primary lookup

### 3.2 Order Management

#### `orders`
Customer orders with support for guest checkout.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `order_number` | varchar(50) UNIQUE | Human-readable ID |
| `user_id` | uuid | FK to users (nullable for guests) |
| `email` | varchar(255) | Customer email |
| `status` | varchar(50) | pending, processing, delivered, cancelled |
| `payment_status` | varchar(50) | pending, paid, failed, refunded |
| `payment_method` | varchar(50) | stripe, manual_contact |
| `currency_code` | varchar(3) | ISO 4217 currency code |
| `total` | decimal(12,2) | Order total |
| `points_used` | integer | Points redeemed |
| `points_earned` | integer | Points awarded |

**Indexes:**
- `order_number` - Unique order lookup
- `user_id` - Customer's orders
- `status` - Filter by status
- `created_at` - Date filtering

#### `order_items`
Individual products in an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `order_id` | uuid | FK to orders |
| `product_id` | uuid | FK to products |
| `platform_id` | uuid | FK to platforms |
| `product_name` | varchar(500) | **Snapshot** for historical accuracy |
| `price` | decimal(10,2) | Price at time of order |
| `quantity` | integer | Quantity ordered |
| `delivery_type` | varchar(50) | Copy from product |
| `delivery_status` | varchar(50) | pending, sent, claimed |
| `delivery_data` | jsonb | Keys/accounts when delivered |

### 3.3 Reviews & Points

#### `reviews`
Customer product reviews with moderation workflow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users |
| `product_id` | uuid | FK to products |
| `order_item_id` | uuid | FK to order_items (verified purchase) |
| `rating` | smallint | 1-5 stars |
| `comment` | text | Review text |
| `is_approved` | boolean | Requires admin approval |
| `is_verified_purchase` | boolean | From genuine order |
| `helpful_count` | integer | Helpful votes |

**Indexes:**
- Composite unique on (user_id, product_id) - One review per user per product
- `is_approved` - Moderation queue filtering
- `rating` - Filter by star rating

#### `points_transactions`
Points earning and redemption ledger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users |
| `amount` | integer | Positive=earned, negative=spent |
| `type` | varchar(50) | purchase, reward, redemption |
| `balance_before` | integer | Balance before transaction |
| `balance_after` | integer | Balance after transaction |
| `expires_at` | timestamp | When points expire |

**Indexes:**
- `user_id` - User's transaction history
- `expires_at` - For cleanup of expired points

#### `user_balances`
Cached point balances for performance (avoids full recalculation).

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | FK to users (UNIQUE) |
| `available_points` | integer | Can be used now |
| `pending_points` | integer | Pending order confirmation |
| `expired_points` | integer | Earned but expired |

---

## 4. Index Strategy

### 4.1 Single-Column Indexes

```sql
-- High-traffic lookups
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_reviews_approval ON reviews(is_approved);

-- Filtering and sorting
CREATE INDEX idx_products_rating ON products(rating_average DESC);
CREATE INDEX idx_products_sales ON products(sales_count DESC);
CREATE INDEX idx_products_price ON products(base_price);
```

### 4.2 Composite Indexes

```sql
-- Active + featured for homepage
CREATE INDEX idx_products_active_featured ON products(is_active, is_featured);
-- Active + new for arrivals
CREATE INDEX idx_products_active_new ON products(is_active, is_new);

-- Order filtering
CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC);
-- Cart lookup
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
```

### 4.3 Covering Indexes (INCLUDE)

```sql
-- For order details page (gets order + customer info)
CREATE INDEX idx_orders_user_status
ON orders(user_id)
INCLUDE (email, total, status, created_at);
```

---

## 5. Key Relationships

### 5.1 Many-to-Many: Products ↔ Platforms

```
products ←→ product_platforms ←→ platforms
```

Products can exist on multiple platforms with platform-specific pricing.

**Use Cases:**
- Show all products on Steam
- Show all platforms for Elden Ring
- Display platform-specific price for PS4 vs Xbox version

### 5.2 Self-Referencing: Platform Hierarchy

```
platforms (parent_id → platforms.id)
```

```
Gaming (level 0)
  ├─ Steam (level 1)
  ├─ PlayStation (level 1)
  └─ Xbox (level 1)
```

**Queries:**
- Get all platforms: `WHERE level = 0`
- Get sub-platforms: `WHERE parent_id = ?`
- Get full path: `SELECT * FROM platforms ORDER BY path`

### 5.3 Denormalized Stats

For performance, certain aggregates are stored directly on tables:

| Table | Denormalized Column | Source |
|-------|-------------------|--------|
| `products` | `rating_average` | AVG(reviews.rating) |
| `products` | `sales_count` | SUM(order_items.quantity) |
| `products` | `wishlist_count` | COUNT(wishlists.id) |
| `platforms` | `product_count` | COUNT(product_platforms) |

**Update Strategy:**
- Use database triggers for real-time updates
- OR run batch jobs periodically
- OR update in application layer

---

## 6. Scalability Considerations

### 6.1 Connection Pooling

```typescript
// db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 6.2 Read Replicas

For reads, use read replicas when available:

```typescript
// Primary for writes
const primaryDb = drizzle(pool, { schema: 'fulmen_prod' });

// Replica for reads
const replicaDb = drizzle(replicaPool, { schema: 'fulmen_prod_read' });
```

### 6.3 Caching Strategy

| Data Type | Cache Strategy | TTL |
|-----------|---------------|-----|
| Product details | Redis (key: product:{id}) | 1 hour |
| Product listings | Redis (key: products:list:{page}) | 15 min |
| Platform tree | Redis (key: platforms:tree) | 1 hour |
| User balances | Database (transactional) | N/A |
| Exchange rates | Redis (key: currency:rates) | 24 hours |

---

## 7. Sample Queries

### 7.1 Get Product with Platforms

```sql
SELECT p.*,
  json_agg(jsonb_build_object(
    'id', pl.id,
    'name', pl.name,
    'price', COALESCE(pp.platform_price, p.base_price),
    'is_primary', pp.is_primary
  )) as platforms
FROM products p
LEFT JOIN product_platforms pp ON p.id = pp.product_id
LEFT JOIN platforms pl ON pl.id = pp.platform_id
WHERE p.slug = 'elden-ring' AND p.is_active = true
GROUP BY p.id;
```

### 7.2 Get Platform Tree

```sql
WITH RECURSIVE platform_tree AS (
  SELECT id, name, parent_id, level, path, 1 as sort_order
  FROM platforms
  WHERE parent_id IS NULL AND is_active = true

  UNION ALL

  SELECT p.id, p.name, p.parent_id, p.level, p.path, p.sort_order
  FROM platforms p
  INNER JOIN platform_tree pt ON p.parent_id = pt.id
  WHERE p.is_active = true
)
SELECT * FROM platform_tree ORDER BY path;
```

### 7.3 Search Products

```sql
SELECT DISTINCT p.*,
  pr.rating_average,
  p.sales_count
FROM products p
LEFT JOIN product_platforms pp ON p.id = pp.product_id
LEFT JOIN platforms pl ON pl.id = pp.platform_id
WHERE p.is_active = true
  AND (
    p.name ILIKE '%elden%' OR
    p.name_ar ILIKE '%elden%' OR
    p.description ILIKE '%elden%'
  )
  AND pl.id = 'platform_id' -- optional platform filter
ORDER BY p.sales_count DESC
LIMIT 20 OFFSET 0;
```

### 7.4 Get User Points Balance

```sql
SELECT
  u.id,
  u.first_name,
  u.last_name,
  COALESCE(ub.available_points, 0) as available_points
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id = $1;
```

---

## 8. Drizzle ORM Usage

### 8.1 Connection Setup

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
```

### 8.2 Insert Product

```typescript
import { products, productPlatforms } from '@/lib/db/schema';
import { db } from '@/lib/db';

const newProduct = await db.insert(products).values({
  name: 'Elden Ring',
  nameAr: 'إلدن رينج',
  slug: 'elden-ring',
  basePrice: '59.99',
  deliveryType: 'auto_key',
  pointsReward: 60,
  isActive: true,
  isNew: true,
}).returning();

// Add to platforms
await db.insert(productPlatforms).values([
  {
    productId: newProduct[0].id,
    platformId: 'steam-uuid',
    platformPrice: '59.99',
    isPrimary: true,
  },
  {
    productId: newProduct[0].id,
    platformId: 'playstation-uuid',
    platformPrice: '59.99',
    isPrimary: false,
  },
]);
```

### 8.3 Query with Relations

```typescript
import { products, productPlatforms, platforms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const product = await db
  .select({
    id: products.id,
    name: products.name,
    nameAr: products.nameAr,
    basePrice: products.basePrice,
    platforms: sql<ProductPlatform[]>`
      json_agg(jsonb_build_object(
        'id', ${platforms.id},
        'name', ${platforms.name},
        'price', COALESCE(${productPlatforms.platformPrice}, ${products.basePrice})
      ))
    `.as('platforms'),
  })
  .from(products)
  .leftJoin(productPlatforms, eq(products.id, productPlatforms.productId))
  .leftJoin(platforms, eq(platforms.id, productPlatforms.platformId))
  .where(eq(products.slug, 'elden-ring'))
  .groupBy(products.id);
```

---

## 9. Migration Strategy

### 9.1 Initial Schema Setup

```bash
# Generate migration
drizzle-kit generate

# Push to database
drizzle-kit push

# Open studio to inspect
drizzle-kit studio
```

### 9.2 Seed Data

Seed in order:
1. Currencies (USD, EUR, SAR, AED, EGP)
2. Platforms (tree structure)
3. Categories
4. Sample products
5. Sample users

---

## 10. Monitoring & Maintenance

### 10.1 Metrics to Track

- Database connection pool usage
- Query execution times
- Table sizes (monitor JSONB columns)
- Index usage (bloat)
- Slow queries (pg_stat_statements)

### 10.2 Maintenance Jobs

| Job | Frequency | Description |
|-----|-----------|-------------|
| Clean expired guest carts | Daily | DELETE FROM carts WHERE expires_at < NOW() |
| Clean expired points | Daily | UPDATE user_balances SET available_points = available_points - expired_points |
| Recalculate ratings | Hourly | Trigger or job on reviews table |
| Update product counts | Hourly | Update denormalized counts |
| Archive old audit logs | Monthly | Move to cold storage |

---

## 11. Security Considerations

### 11.1 Data Protection

- Passwords: Always use bcrypt/scrypt
- Delivery data: Encrypt sensitive keys/accounts
- API Keys: Store in environment variables, never in DB
- PII: Minimal collection, comply with GDPR/region laws

### 11.2 Access Control

- Row-level security for multi-tenant
- Role-based access (admin vs customer)
- API keys for dashboard access

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Product page load | < 100ms |
| Category listing | < 50ms |
| Search query | < 200ms |
| Cart operation | < 50ms |
| Order creation | < 200ms |

---

## 13. Future Enhancements

- **Full-text search**: Add `tsvector` columns for PostgreSQL FTS
- **Materialized path**: For faster tree queries
- **Partitioning**: Partition orders by date for archival
- **Read replicas**: Separate read slaves for product browsing
- **Connection pooling**: PgBouncer for high concurrency
- **Elasticsearch**: For advanced product search
