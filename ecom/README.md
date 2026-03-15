# Fulmen Empire - Digital E-Commerce Storefront

A modern, production-grade digital products e-commerce storefront built with Next.js 16, TypeScript, Drizzle ORM, and PostgreSQL.

## 🌟 Features

- **Platform-First Browsing**: Hierarchical platform system for products (Gaming, Subscriptions, AI Tools, etc.)
- **Multi-Language Support**: Arabic (RTL) and English (LTR)
- **Multi-Currency**: Support for multiple currencies with easy switching
- **Product Discovery**: Trending, recommended, and related products sections
- **Advanced Search**: Instant search with live results and suggestions
- **Full Cart System**: Guest cart support, mini cart drawer, and persistent storage
- **Checkout**: Unified checkout with multiple payment options (Stripe, Manual)
- **User Profiles**: Order tracking, wishlist, and points system
- **Reviews**: User reviews with admin approval workflow
- **Responsive Design**: Mobile-first, dark-themed UI with lightning-inspired aesthetics

## 🎨 Brand Identity

- **Colors**: Deep Blue (#161E54), Electric Blue (#0052FF), Amber (#FFC241)
- **Font**: Readex Pro (Arabic and English)
- **Style**: Modern, futuristic, lightning-inspired, dark-themed

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Icons**: Lucide React

## 📁 Project Structure

```
ecom/
├── src/
│   ├── app/
│   │   ├── [locale]/          # Localized routes
│   │   │   ├── products/       # Product listing and detail pages
│   │   │   ├── platforms/      # Platform browsing pages
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── checkout/       # Checkout page
│   │   │   ├── wishlist/       # Wishlist page
│   │   │   ├── profile/        # User profile and orders
│   │   │   └── search/         # Search page
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout (redirects to /en)
│   │   └── page.tsx            # Root page (redirects to /en)
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── store/              # Store-specific components
│   ├── lib/
│   │   ├── db/                 # Database schema and connection
│   │   ├── i18n.ts             # Internationalization
│   │   └── utils.ts            # Utility functions
│   ├── config/
│   │   └── constants.ts        # App-wide constants
│   └── middleware.ts           # Locale detection middleware
├── drizzle.config.ts           # Drizzle configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. **Set up the database:**
```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio to manage data
npm run db:studio
```

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Database Schema

The database includes tables for:
- `users` - User accounts
- `platforms` - Hierarchical platform tree
- `products` - Product catalog
- `product_platforms` - Many-to-many relationship
- `product_images` - Product gallery
- `carts` & `cart_items` - Shopping cart
- `orders` & `order_items` - Order management
- `deliveries` - Product delivery tracking
- `wishlist` - User wishlists
- `reviews` - Product reviews
- `points_transactions` - Points system
- `offers` - Special offers

## 🌍 Internationalization

The store supports Arabic and English with:
- Automatic locale detection from Accept-Language header
- RTL support for Arabic
- Locale routing (/en, /ar)
- Easy-to-extend translation system in `src/lib/i18n.ts`

## 🎯 Key Pages

- **Home** (`/en` or `/ar`) - Featured products, discovery sections
- **Products** (`/products`) - Filterable product listing
- **Platforms** (`/platforms`) - Hierarchical platform browsing
- **Product Detail** (`/products/[slug]`) - Full product information
- **Cart** (`/cart`) - Shopping cart management
- **Checkout** (`/checkout`) - Unified payment flow
- **Wishlist** (`/wishlist`) - Saved products
- **Profile** (`/profile/orders`) - Order history and tracking
- **Search** (`/search`) - Instant product search

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## 📝 TODO (Future Enhancements)

- [ ] Implement authentication system
- [ ] Connect to real database (currently using mock data)
- [ ] Implement Stripe payment integration
- [ ] Add email notifications (wishlist price drops)
- [ ] Implement Redis caching
- [ ] Add product comparison feature
- [ ] Implement live chat support
- [ ] Add admin dashboard integration

## 🤝 Contributing

This project is the storefront component. The admin dashboard will be implemented separately.

## 📄 License

© 2024 Fulmen Empire. All rights reserved.
