# Digital Product Store - Admin Dashboard

A production-grade admin dashboard for managing digital products (game keys, accounts, gift cards, etc.) with automatic order fulfillment.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS APP LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  Dashboard  │   │ API Routes  │   │   Layout    │   │  UI Utils   │    │
│  │   Pages     │   │ (App Router)│   │  & Sidebar  │   │ & Helpers   │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐      │
│  │  Auto-Delivery   │   │  Activity Log    │   │  Auth & RBAC     │      │
│  │  w/ Row Locking  │   │  Service         │   │  Service         │      │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘      │
├─────────────────────────────────────────────────────────────────────────────┤
│                              UTILITY LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   Security  │   │ Validation  │   │  Password   │   │ Rate Limit  │    │
│  │  Utilities  │   │   & Input   │   │   Hashing   │   │   (in-mem)  │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATABASE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Drizzle ORM ──────────────────►                     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         PostgreSQL (Neon)                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   Users     │ │  Products   │ │  Orders     │ │  Inventory  │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │  Coupons    │ │  Reviews    │ │ Activity    │ │ Templates   │    │   │
│  │  │             │ │             │ │   Logs      │ │             │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (Server Actions)
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM

## User Roles & Permissions

### Admin
- Manage staff accounts
- Manage products & inventory
- Manage coupons
- View analytics & activity logs
- Process orders

### Staff
- View products
- Manage inventory
- View and process orders

## Project Structure

```
src/
├── app/
│   ├── api/                # API Routes
│   │   ├── auth/           # Login, logout, me
│   │   ├── products/       # CRUD operations
│   │   ├── inventory/      # Inventory & templates
│   │   ├── orders/         # Order management
│   │   ├── coupons/        # Discount codes
│   │   ├── reviews/        # Product reviews
│   │   ├── analytics/      # Dashboard stats
│   │   ├── staff/          # Staff management
│   │   └── activity-logs/  # Audit trail
│   ├── dashboard/          # Dashboard pages
│   │   ├── analytics/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── coupons/
│   │   ├── reviews/
│   │   ├── staff/
│   │   └── activity-logs/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/          # Dashboard components
│   │   ├── Sidebar.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── ProductsTable.tsx
│   │   └── ...
│   └── ui/                 # Reusable UI components
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── index.ts            # Database connection
├── lib/
│   └── auth.ts             # Authentication & RBAC
├── services/
│   ├── autoDelivery.ts     # Auto-delivery with locking
│   └── activityLog.ts      # Activity logging
├── types/
│   └── index.ts            # TypeScript definitions
└── utils/
    └── security.ts         # Password hashing, validation
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | Admin and staff accounts with RBAC |
| `sessions` | User session tokens |
| `products` | Digital products |
| `product_platforms` | Platform associations |
| `product_images` | Product images |
| `inventory_templates` | Dynamic inventory field schemas |
| `inventory_items` | Actual inventory items with dynamic values |
| `orders` | Customer orders |
| `order_items` | Items within orders |
| `coupons` | Discount coupons |
| `coupon_usage` | Coupon usage tracking |
| `reviews` | Customer product reviews |
| `activity_logs` | Audit trail |
| `daily_analytics` | Pre-aggregated statistics |

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@host/database
```

### 3. Push Database Schema

```bash
npm run db:push
```

### 4. Create First Admin Account

Run the seed script (create one manually via database or API):

```bash
# Connect to your database and run:
INSERT INTO users (email, name, password_hash, role)
VALUES ('admin@example.com', 'Admin', '<hashed_password>', 'admin');
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Add inventory
- `GET /api/inventory/templates` - List templates
- `POST /api/inventory/templates` - Create template

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/[id]` - Get order
- `PUT /api/orders/[id]` - Update/fulfill order
- `DELETE /api/orders/[id]` - Cancel order

### Coupons
- `GET /api/coupons` - List coupons
- `POST /api/coupons` - Create coupon
- `POST /api/coupons/validate` - Validate coupon

### Reviews
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Create review

### Analytics
- `GET /api/analytics` - Get dashboard stats

### Staff
- `GET /api/staff` - List staff
- `POST /api/staff` - Create staff

### Activity Logs
- `GET /api/activity-logs` - Get activity logs

## Auto-Delivery System

The auto-delivery system automatically fulfills orders by:

1. Finding available inventory items using `SELECT FOR UPDATE SKIP LOCKED`
2. Locking rows to prevent race conditions
3. Marking inventory as sold
4. Linking inventory to order items
5. Updating product stock counts

```typescript
// In src/services/autoDelivery.ts
const result = await fulfillOrder(orderId, userId);
// Returns: { success, fulfillmentStatus, deliveredItems, errors }
```

## Security Features

- **Password Hashing**: SHA-256 with salt (consider bcrypt for production)
- **Session Management**: HTTP-only cookies with expiration
- **RBAC**: Permission-based access control
- **Rate Limiting**: In-memory rate limiter
- **SQL Injection**: Prevented by Drizzle ORM parameterized queries
- **Soft Deletes**: Records are marked deleted, not removed
- **Activity Logging**: All admin actions are logged

## Performance Optimizations

1. **Database Indexes**: Created on frequently queried columns
2. **Pagination**: All list endpoints support pagination
3. **Aggregation**: Daily analytics table for fast dashboard loading
4. **Row Locking**: `SKIP LOCKED` prevents bottlenecks

## License

MIT
