# Fulmen Empire - Deployment Guide

Monorepo containing a bilingual (English/Arabic) e-commerce storefront and admin dashboard.

## Project Structure

```
SSS/
├── ecom/              # Next.js 16 Storefront (Public-facing)
│   ├── src/
│   │   ├── app/      # Next.js 15+ app router with locale routing
│   │   ├── components/
│   │   ├── lib/       # Database, auth, utilities
│   │   └── config/
│   ├── public/
│   └── package.json
│
├── dashboard_next/   # Next.js 16 Admin Dashboard
│   ├── src/
│   │   ├── app/      # Dashboard pages and API routes
│   │   ├── components/
│   │   ├── db/       # Database schema (shared with ecom)
│   │   ├── lib/       # Auth, utilities
│   │   └── services/
│   ├── public/
│   └── package.json
│
└── .gitignore
```

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   # Storefront
   cd ecom
   npm install
   npm run dev

   # Admin Dashboard (separate terminal)
   cd dashboard_next
   npm install
   npm run dev
   ```

2. **Access locally:**
   - Storefront: http://localhost:3000
   - Admin Dashboard: http://localhost:3001

## Deployment

### Option 1: Vercel Dashboard (Recommended)

1. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Repository name: `fulmen-empire` (or your choice)
   - Do NOT initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Push to GitHub:**
   ```bash
   cd /c/Users/USER/Desktop/RaadFun/SSS

   # Add your GitHub as remote
   git remote add origin https://github.com/YOUR_USERNAME/fulmen-empire.git

   # Push to main branch
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Vercel:**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your `fulmen-empire` repository
   - Vercel will auto-detect both Next.js projects

4. **Configure Each Project:**

   **Storefront (ecom):**
   - Root Directory: `ecom`
   - Framework Preset: Next.js
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

   **Admin Dashboard (dashboard_next):**
   - Click "Add Another Project"
   - Root Directory: `dashboard_next`
   - Framework Preset: Next.js
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

### Option 2: Vercel CLI

```bash
npm install -g vercel

# Deploy storefront
cd ecom
vercel --prod --yes

# Deploy admin dashboard
cd ../dashboard_next
vercel --prod --yes
```

## Environment Variables

Both projects require the same `DATABASE_URL` environment variable.

### 1. Create a Database

**Free Options:**
- **Neon** (Recommended): https://neon.tech - Free tier with generous limits
- **Supabase**: https://supabase.com - Free tier available
- **ElephantSQL**: https://www.elephantsql.com - Free tier available

### 2. Add Environment Variables (Vercel Dashboard)

For each project in Vercel:

**Storefront (ecom):**
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname
```

**Admin Dashboard (dashboard_next):**
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname
ADMIN_EMAIL=admin@yourdomain.com
```

### 3. Run Database Migrations

```bash
# From the dashboard_next directory
cd dashboard_next
npm run db:push
```

This will create all required tables in your database.

## Database Schema

Both projects share the same database schema:
- **Users & Authentication** - Admin users, sessions
- **Platforms** - Hierarchical platform tree (Steam, PlayStation, etc.)
- **Products** - Digital products with bilingual support
- **Categories** - Product categories
- **Orders** - Customer orders with fulfillment tracking
- **Inventory** - Dynamic inventory templates
- **Cart & Wishlist** - Shopping cart and wishlist
- **Reviews** - Product reviews
- **Coupons** - Discount codes

## Features

### Storefront (ecom)
- ✅ Bilingual (English/Arabic) with RTL support
- ✅ Platform browsing and product search
- ✅ Shopping cart with inventory management
- ✅ Order placement and tracking
- ✅ Wishlist functionality
- ✅ User authentication and profiles
- ✅ Responsive design

### Admin Dashboard (dashboard_next)
- ✅ Product management (create, edit, delete)
- ✅ Platform hierarchy management
- ✅ Inventory tracking with templates
- ✅ Order management and fulfillment
- ✅ Staff management
- ✅ Analytics dashboard
- ✅ Coupon management
- ✅ Activity logging
- ✅ Manual sales processing

## Custom Domains (Optional)

After deployment, you can add custom domains:

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain (e.g., `store.fulmen.empire`, `admin.fulmen.empire`)
4. Configure DNS according to Vercel instructions

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Database Connection Issues

Verify your `DATABASE_URL` is correct and accessible:
- Check for typos in the connection string
- Ensure your database allows external connections
- Check IP whitelist settings if applicable

### Middleware Warnings

The middleware deprecation warning is informational - it still works correctly. The new Next.js 16 proxy pattern will be implemented in future updates.

## Support

For issues or questions:
- Check Next.js documentation: https://nextjs.org/docs
- Check Vercel documentation: https://vercel.com/docs
- Review the database schema in: `ecom/src/lib/db/schema.ts`

## License

Your project license information here.
