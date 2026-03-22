# Entity Relationship Diagram (ERD) Documentation

## Entity Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────┐
│       USERS          │       │      SESSIONS        │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ email (unique)      │──┐    │ token (unique)      │
│ password_hash       │  │    │ user_id (FK)        │──┐│
│ name                │  │    │ expires_at          │  ││
│ role (enum)         │  │    └──────────────────────┘  ││
│ is_active           │  │                              ││
│ last_login_at       │  │                              ││
│ created_at          │  │                              ││
│ updated_at          │  │                              ││
│ deleted_at          │  │                              ││
└──────────────────────┘  │                              │
                          │                              │
                          │    ┌──────────────────────┐  │
                          │    │    PRODUCTS          │  │
                          │    ├──────────────────────┤  │
                          │    │ id (PK)             │  │
                          │    │ name                │  │
                          │    │ slug (unique)       │  │
                          │    │ description         │  │
                          │    │ price               │  │
                          │    │ inventory_template  │  │
                          │    │ _id (FK) ──────────┼──┼─────────────┐
                          │    │ is_active           │  │             │
                          │    │ stock_count         │  │             │
                          │    │ total_sold          │  │             │
                          │    │ average_rating      │  │             │
                          │    │ review_count        │  │             │
                          │    │ created_at          │  │             │
                          │    │ updated_at          │  │             │
                          │    │ deleted_at          │  │             │
                          │    └──────────────────────┘  │             │
                          │                               │             │
                          │    ┌──────────────────────┐  │             │
                          │    │ INVENTORY_TEMPLATES │  │             │
                          │    ├──────────────────────┤  │             │
                          │    │ id (PK)             │  │             │
                          │    │ name (unique)       │  │             │
                          │    │ description         │  │             │
                          │    │ fields_schema       │  │             │
                          │    │ is_active           │  │             │
                          │    │ created_at          │  │             │
                          │    │ updated_at          │  │             │
                          │    │ deleted_at          │  │             │
                          │    └──────────────────────┘  │             │
                          │                               │             │
                          │    ┌──────────────────────┐  │             │
                          │    │  INVENTORY_ITEMS    │  │             │
                          │    ├──────────────────────┤  │             │
                          │    │ id (PK)             │  │             │
                          └────│ template_id (FK)    │  │             │
                               │ product_id (FK)     │  │             │
                               │ values (JSONB)       │  │             │
                               │ status               │  │             │
                               │ order_item_id (FK) ──┼──┼───────┐   │
                               │ reserved_until       │  │       │   │
                               │ purchased_at         │  │       │   │
                               │ created_at           │  │       │   │
                               │ updated_at           │  │       │   │
                               │ deleted_at           │  │       │   │
                               └──────────────────────┘  │       │   │
                                                          │       │   │
                    ┌──────────────────────┐               │       │   │
                    │      ORDERS         │               │       │   │
                    ├──────────────────────┤               │       │   │
                    │ id (PK)             │               │       │   │
                    │ customer_email      │               │       │   │
                    │ customer_name       │               │       │   │
                    │ subtotal            │               │       │   │
                    │ discount            │               │       │   │
                    │ total               │               │       │   │
                    │ currency            │               │       │   │
                    │ coupon_id (FK) ─────┼───────────────┼───────┼───┼───┐
                    │ status              │               │       │   │   │
                    │ fulfillment_status  │               │       │   │   │
                    │ delivered_at        │               │       │   │   │
                    │ processed_by (FK) ───┼───────────────┼───────┼───┼───┼──┐
                    │ created_at          │               │       │   │   │  │
                    │ updated_at          │               │       │   │   │  │
                    │ deleted_at          │               │       │   │   │  │
                    └──────────────────────┘               │       │   │   │  │
                                                          │       │   │   │  │
                    ┌──────────────────────┐               │       │   │   │  │
                    │   ORDER_ITEMS       │               │       │   │   │  │
                    ├──────────────────────┤               │       │   │   │  │
                    │ id (PK)             │               │       │   │   │  │
                    │ order_id (FK) ──────┼───────────────┼───────┼───┼───┼──│──┐
                    │ product_id (FK) ─────┼───────────────┼───────┼───┼───┼──┼──┼──┐
                    │ quantity            │               │       │   │   │  │  │  │
                    │ unit_price          │               │       │   │   │  │  │  │
                    │ subtotal            │               │       │   │   │  │  │  │
                    │ delivered_inventory │               │       │   │   │  │  │  │
                    │ _ids (JSONB)        │               │       │   │   │  │  │  │
                    │ created_at          │               │       │   │   │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │
                                                          │       │   │   │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │
                    │      COUPONS        │               │       │   │   │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │
                    │ code (unique)       │               │       │   │   │  │  │  │
                    │ description         │               │       │   │   │  │  │  │
                    │ discount_type       │               │       │   │   │  │  │  │
                    │ discount_value      │               │       │   │   │  │  │  │
                    │ min_purchase        │               │       │   │   │  │  │  │
                    │ max_discount        │               │       │   │   │  │  │  │
                    │ usage_limit         │               │       │   │   │  │  │  │
                    │ usage_count         │               │       │   │   │  │  │  │
                    │ user_limit          │               │       │   │   │  │  │  │
                    │ valid_from          │               │       │   │   │  │  │  │
                    │ valid_until         │               │       │   │   │  │  │  │
                    │ is_active           │               │       │   │   │  │  │  │
                    │ applicable_product  │               │       │   │   │  │  │  │
                    │ _ids (JSONB)        │               │       │   │   │  │  │  │
                    │ created_at          │               │       │   │   │  │  │  │
                    │ updated_at          │               │       │   │   │  │  │  │
                    │ deleted_at          │               │       │   │   │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │
                                                          │       │   │   │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │
                    │    COUPON_USAGE     │               │       │   │   │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │
                    │ coupon_id (FK) ─────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┤
                    │ order_id (FK) ──────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┼──┤
                    │ customer_email      │               │       │   │   │  │  │  │  │  │
                    │ discount_amount     │               │       │   │   │  │  │  │  │  │
                    │ used_at             │               │       │   │   │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │
                                                          │       │   │   │  │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │  │
                    │      REVIEWS        │               │       │   │   │  │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │  │
                    │ product_id (FK) ─────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┼──┤
                    │ customer_email      │               │       │   │   │  │  │  │  │  │
                    │ rating              │               │       │   │   │  │  │  │  │  │
                    │ comment             │               │       │   │   │  │  │  │  │  │
                    │ is_verified_purchase│               │       │   │   │  │  │  │  │  │
                    │ is_active           │               │       │   │   │  │  │  │  │  │
                    │ created_at          │               │       │   │   │  │  │  │  │  │
                    │ updated_at          │               │       │   │   │  │  │  │  │  │
                    │ deleted_at          │               │       │   │   │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │
                                                          │       │   │   │  │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │  │
                    │   ACTIVITY_LOGS     │               │       │   │   │  │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │  │
                    │ user_id (FK) ───────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┼──┼──┤
                    │ action              │               │       │   │   │  │  │  │  │  │  │
                    │ entity              │               │       │   │   │  │  │  │  │  │  │
                    │ entity_id           │               │       │   │   │  │  │  │  │  │  │
                    │ metadata (JSONB)    │               │       │   │   │  │  │  │  │  │  │
                    │ ip_address          │               │       │   │   │  │  │  │  │  │  │
                    │ user_agent          │               │       │   │   │  │  │  │  │  │  │
                    │ created_at          │               │       │   │   │  │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │  │
                                                          │       │   │   │  │  │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │  │  │
                    │ PRODUCT_PLATFORMS   │               │       │   │   │  │  │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │  │  │
                    │ product_id (FK) ─────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┼──┼──┼──┤
                    │ name                │               │       │   │   │  │  │  │  │  │  │  │
                    │ region              │               │       │   │   │  │  │  │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │  │  │  │
                                                          │       │   │   │  │  │  │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │  │  │  │
                    │   PRODUCT_IMAGES    │               │       │   │   │  │  │  │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │  │  │  │
                    │ product_id (FK) ─────┼───────────────┼───────┼───┼───┼──┼──┼──┼──┼──┼──┼──┼──┤
                    │ url                 │               │       │   │   │  │  │  │  │  │  │  │
                    │ alt                 │               │       │   │   │  │  │  │  │  │  │  │  │
                    │ order               │               │       │   │   │  │  │  │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │  │  │  │
                                                          │       │   │   │  │  │  │  │  │  │  │
                    ┌──────────────────────┐               │       │   │   │  │  │  │  │  │  │
                    │  DAILY_ANALYTICS    │               │       │   │   │  │  │  │  │  │  │
                    ├──────────────────────┤               │       │   │   │  │  │  │  │  │  │
                    │ id (PK)             │               │       │   │   │  │  │  │  │  │  │
                    │ date (unique)       │               │       │   │   │  │  │  │  │  │  │
                    │ revenue             │               │       │   │   │  │  │  │  │  │  │
                    │ orders_count        │               │       │   │   │  │  │  │  │  │  │
                    │ items_sold          │               │       │   │   │  │  │  │  │  │  │
                    │ unique_customers    │               │       │   │   │  │  │  │  │  │  │
                    │ average_order_value │               │       │   │   │  │  │  │  │  │  │
                    │ created_at          │               │       │   │   │  │  │  │  │  │  │
                    │ updated_at          │               │       │   │   │  │  │  │  │  │  │
                    └──────────────────────┘               │       │   │   │  │  │  │  │  │  │
                                                          │       │   │   │  │  │  │  │  │  │
                                                          ▼       ▼   ▼   ▼  ▼  ▼  ▼  ▼  ▼  ▼
                                                   ┌───────────────────────────────────┐
                                                   │         POSTGRESQL DATABASE        │
                                                   │              (Neon)                │
                                                   └───────────────────────────────────┘
```

## Table Descriptions

### Users & Authentication
- **users**: Admin and staff accounts with RBAC roles
- **sessions**: Active session tokens for authentication

### Products
- **products**: Digital product catalog with pricing and stats
- **product_platforms**: Platform associations (Steam, Epic, etc.)
- **product_images**: Product image gallery

### Dynamic Inventory System
- **inventory_templates**: Defines field schemas for different inventory types
- **inventory_items**: Actual inventory with JSONB values

### Orders & Fulfillment
- **orders**: Customer orders with status tracking
- **order_items**: Line items with delivered inventory links

### Marketing
- **coupons**: Discount codes with usage limits
- **coupon_usage**: Tracks who used which coupon

### Social Proof
- **reviews**: Customer reviews with one-per-product validation

### Audit & Analytics
- **activity_logs**: Complete audit trail
- **daily_analytics**: Pre-aggregated statistics

## Key Relationships

1. **User → Session**: One-to-many
2. **User → Activity Logs**: One-to-many
3. **User → Order (processed_by)**: One-to-many
4. **Product → Inventory Items**: One-to-many
5. **Product → Platforms**: One-to-many
6. **Product → Images**: One-to-many
7. **Product → Reviews**: One-to-many
8. **Template → Inventory Items**: One-to-many
9. **Order → Order Items**: One-to-many
10. **Order → Coupon Usage**: One-to-many
11. **Inventory Item → Order Item**: One-to-one (when sold)
12. **Coupon → Coupon Usage**: One-to-many

## Special Features

### Dynamic Inventory
- `inventory_templates.fields_schema` stores JSON schema
- `inventory_items.values` stores actual data as JSONB
- Allows flexible structures without schema changes

### Soft Deletes
- All major tables have `deleted_at` timestamp
- Records are never truly deleted
- Enables recovery and audit trail

### Row Locking
- Auto-delivery uses `SELECT FOR UPDATE SKIP LOCKED`
- Prevents race conditions during fulfillment
- Allows concurrent order processing
