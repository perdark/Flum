# Security Documentation

## Overview

This document outlines all security measures implemented in the Digital Product Store Admin Dashboard.

## Authentication Security

### Password Storage
```typescript
// Location: src/utils/security.ts
// Uses SHA-256 with salt for password hashing
// Consider upgrading to bcrypt for production

const salt = randomBytes(32).toString("base64");
const hash = createHash("sha256").update(salt + password).digest("hex");
return `${salt}:${hash}`;
```

### Session Management
```typescript
// Location: src/lib/auth.ts
// HTTP-only cookies prevent XSS attacks
cookieStore.set(SESSION_COOKIE_NAME, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  expires: expiresAt,
  path: "/",
});
```

### Session Expiration
- Sessions expire after 7 days
- Database validates expiration on each request
- Invalid sessions are immediately cleared

## Authorization (RBAC)

### Permission System
```typescript
// Location: src/types/index.ts
export const PERMISSIONS = {
  MANAGE_STAFF: "manage_staff",        // Admin only
  MANAGE_COUPONS: "manage_coupons",    // Admin only
  VIEW_ANALYTICS: "view_analytics",    // Admin only
  VIEW_ACTIVITY_LOGS: "view_activity_logs", // Admin only
  MANAGE_PRODUCTS: "manage_products",  // Admin + Staff
  MANAGE_INVENTORY: "manage_inventory", // Admin + Staff
  VIEW_PRODUCTS: "view_products",      // Admin + Staff
  PROCESS_ORDERS: "process_orders",    // Admin + Staff
  VIEW_ORDERS: "view_orders",          // Admin + Staff
};
```

### Route Protection
```typescript
// Example: Protect an API route
export async function POST(request: NextRequest) {
  const user = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  // Only admins and staff can reach this point
}
```

## Input Validation

### Email Validation
```typescript
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### Password Strength
```typescript
// Requirements: min 8 chars, at least one letter and one number
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}
```

### UUID Validation
```typescript
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

## Rate Limiting

### Implementation
```typescript
// Location: src/utils/security.ts
// In-memory rate limiting (use Redis for production)

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): RateLimitResult
```

### Protected Endpoints
- Login: 5 attempts per 15 minutes per email
- API routes: Can be protected individually

## SQL Injection Prevention

### Parameterized Queries
All database queries use Drizzle ORM which automatically parameterizes:

```typescript
// Safe - parameters are escaped
await db.select()
  .from(products)
  .where(eq(products.slug, slug));

// Never do this (unsafe):
// await db.execute(`SELECT * FROM products WHERE slug = '${slug}'`)
```

### Additional Protection
```typescript
// Escape function as extra layer of defense
export function escapeSqlString(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    // ... escape sequences
  });
}
```

## Race Condition Prevention

### Inventory Fulfillment
```typescript
// Location: src/services/autoDelivery.ts
// Uses SELECT FOR UPDATE SKIP LOCKED to prevent double sales

await tx.execute(sql`
  SELECT id, values
  FROM inventory_items
  WHERE product_id = ${item.productId}
    AND status = 'available'
  ORDER BY created_at ASC
  LIMIT ${item.quantity}
  FOR UPDATE SKIP LOCKED
`);
```

### How It Works
1. `FOR UPDATE` locks selected rows
2. `SKIP LOCKED` skips already-locked rows (instead of waiting)
3. Multiple concurrent orders can be processed safely
4. Each inventory item can only be sold once

## Activity Logging

### Audit Trail
```typescript
// All admin/staff actions are logged
await logActivity({
  userId: user.id,
  action: "product_created",
  entity: "product",
  entityId: productId,
  metadata: { productName },
  ipAddress: req.headers.get("x-forwarded-for"),
  userAgent: req.headers.get("user-agent"),
});
```

### Logged Actions
- product_created, product_updated, product_deleted
- inventory_added, inventory_sold
- order_created, order_completed, order_cancelled
- coupon_created, coupon_updated, coupon_deleted
- staff_created, staff_updated, staff_deleted
- review_approved, review_deleted
- login, logout

## Data Protection

### Soft Deletes
```typescript
// Records are never truly deleted
await db.update(orders)
  .set({
    deletedAt: new Date(),
    status: "cancelled",
  })
  .where(eq(orders.id, id));
```

Benefits:
- Data can be recovered
- Full audit trail maintained
- Compliance with data retention policies

### Sensitive Data
- Passwords are never logged
- API tokens are stored in HTTP-only cookies
- Customer data is minimized (email only for orders)

## Cross-Site Scripting (XSS) Prevention

### React Default Protection
- React automatically escapes JSX content
- User input is sanitized before display

### Additional Sanitization
```typescript
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .trim();
}
```

## Recommendations for Production

1. **Upgrade to bcrypt**: Replace SHA-256 with bcrypt for passwords
2. **Use Redis**: Move rate limiting to Redis for distributed systems
3. **Add CSRF tokens**: Implement CSRF protection for forms
4. **Enable HTTPS**: Always use HTTPS in production
5. **Set up monitoring**: Log security events to external service
6. **Regular audits**: Review activity logs weekly
7. **Backup database**: Daily automated backups
8. **API rate limiting**: Implement global API rate limits
9. **CORS configuration**: Restrict CORS to specific domains
10. **Security headers**: Add Content-Security-Policy headers

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...

# Recommended for production
SESSION_SECRET=<random-32-char-string>
ENCRYPTION_KEY=<for-sensitive-data>
```

   Email:    admin@dashboard.com
   Password: Admin123