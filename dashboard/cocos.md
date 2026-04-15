# Storefront Logic Explanation — Completed Phases

This document explains the logic of every completed phase of the storefront redesign plan. It is written for someone who wants to understand _what was built_, _how it fits together_, and _why certain decisions were made_.

Phases 1 through 13 are marked complete as of the most recent commits.

---

## Phase 1: Dual Theme + Visual Foundation

### What was built

The storefront has its own independent theme system that does not interfere with the admin dashboard's dark/light theme. Two main deliverables:

1. A CSS variable layer scoped under `.store-theme` and `.store-theme.store-dark`
2. A React context (`StoreThemeProvider`) that adds the correct class to the root div and persists the preference to `localStorage`
3. A new `productTags` database table

### How the theme works

The dashboard already uses `next-themes` for its own dark/light toggle. Rather than hijack that system (which would bleed admin styles into store pages), the store defines its own parallel variable set.

In `src/app/globals.css` (around line 251), `.store-theme` sets CSS custom properties for the light variant — background, card, primary, muted, border, brand, success colors. `.store-theme.store-dark` overrides every one of them for the dark variant. The dark default is deep navy (`#0c1222` background, `#131b2e` cards, `#3b82f6` blue primary, `#f59e0b` amber for discount badges).

`src/lib/store-theme.tsx` is a client-side React context. `StoreThemeProvider` wraps its children in a `div` with both the `store-theme` class always applied and `store-dark` conditionally applied. On initial render it defaults to dark. A `useLayoutEffect` (runs before paint, avoiding flash) reads `localStorage` for the user's previous choice and updates state. The `toggle()` helper flips between the two values and writes back to `localStorage`.

The store layout (`src/app/store/layout.tsx`) does not apply a class to `<html>`. The theme is scoped to the wrapping div inside `StoreThemeProvider`. This prevents any class from the store leaking into the `<html>` element where the dashboard's `next-themes` operates.

### The productTags table

`productTags` in `src/db/schema.ts` stores facet data for products: each row has a `tag` (e.g., "Steam", "Global", "FPS") and a `tagGroup` (e.g., "platform", "region", "genre"). A product can have many tags across many groups. Tags drive three features: badge display on product cards, tag-based similar products (Phase 10), and filter facets (Phase 15).

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/globals.css` — the two `.store-theme` blocks
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-theme.tsx` — `StoreThemeProvider` and `useStoreTheme`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/db/schema.ts` — `productTags` table definition

---

## Phase 2: Product Card Redesign

### What was built

`src/components/store/ProductCard.tsx` was rewritten. Two helper components were also created: `PlatformBadge.tsx` and `DeliveryBadge.tsx`.

### How the card is structured

The card uses a portrait aspect ratio (`aspect-[3/4]`) for the image area, matching game cover art. On top of the image:

- Top-left: a large discount badge showing the percentage off (calculated from `compareAtPrice` vs `basePrice`)
- Top-right: wishlist heart button
- Bottom overlay: platform badge pulled from `tags` where `tagGroup === "platform"` and a region badge where `tagGroup === "region"`

Below the image is the info block: category label (small, uppercase, styled in the brand/amber color), product name with a two-line clamp, and a price row. The price row shows the current price, optionally a strikethrough compare-at price, and the discount badge.

A green dot plus "Instant Delivery" text is shown when the product has stock. On desktop, the "Add to Cart" button slides in on hover using Tailwind transitions. On mobile it is always visible.

`PlatformBadge` renders a small pill label. `DeliveryBadge` renders the green dot + "Instant Delivery" text — it was extracted as a component because both the card and the QuickViewModal need it.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/ProductCard.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/PlatformBadge.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/DeliveryBadge.tsx`

---

## Phase 3: Header + Navigation Overhaul

### What was built

`StoreHeader.tsx` was rewritten as a three-row header. New components: `AnnouncementBar.tsx`, `MegaMenu.tsx`, `CurrencySelector.tsx`, `CartIcon.tsx`, `AccountMenu.tsx`, `MobileTabBar.tsx`, and `SearchAutocomplete.tsx`.

### Structure of the header

Row 1 — `AnnouncementBar`: a thin rotating-text strip at the very top ("Instant Delivery", "24/7 Support", etc.). It rotates through messages on an interval.

Row 2 — Main bar: logo on the left, expanded search in the center (with autocomplete dropdown powered by debounced API calls to `GET /api/store/search`), and a row of utility icons on the right — theme toggle, currency selector, account dropdown, and cart icon with item count badge.

Row 3 — Navigation: the `MegaMenu` replaces the old `CategoryNav`. It fetches the category tree and renders a mega-menu on hover for categories that have children.

`CartIcon` shows a count badge sourced from `useCart().itemCount` (see Phase 5). `AccountMenu` calls `useCustomer()` (see Phase 7) to decide whether to show "Sign In" or a user dropdown with name and links to orders/settings.

`MobileTabBar` is a fixed bottom navigation bar with home, categories, search, cart, and account tabs — it renders below the fold of the mobile layout. The main layout adds bottom padding equivalent to the tab bar height (`pb-[calc(3.75rem+env(safe-area-inset-bottom))]`) so page content is not obscured.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/StoreHeader.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/MobileTabBar.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/AnnouncementBar.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/SearchAutocomplete.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/search/route.ts`

---

## Phase 4: Homepage Redesign

### What was built

`src/app/store/page.tsx` was expanded from five sections to a full marketing homepage. New components: `TrustBar.tsx`, `FlashDeals.tsx`, `PlatformShowcase.tsx`, `TestimonialCarousel.tsx`, `NewsletterSignup.tsx`, `HorizontalScroll.tsx`, `CountdownTimer.tsx`.

### How the homepage is assembled

The homepage page component is a Next.js Server Component. It runs several `getActiveProducts()` and `getActiveOffers()` calls in parallel (using `Promise.all` implicitly by starting them before awaiting) and passes the data down to Client Components. The sections are:

1. `HeroCarousel` — enhanced with full-bleed layout, gradient overlay, and a progress bar. Fed by offers with `displayType === "hero"`.
2. `TrustBar` — four static trust icons (Instant Delivery, 24/7 Support, Secure Payment, Reviews). No data fetching needed.
3. `FlashDeals` — a horizontal scroll of on-sale products with a countdown timer. The end time is computed server-side as 48 hours from page render (`flashEnds` variable) and passed to `CountdownTimer` as an ISO string.
4. Featured Products — `HorizontalScroll` wrapping `ProductCard` items fetched with `featured: true`.
5. Category Grid — enhanced cards from `getRootCategoriesWithProductCounts()`, showing category name, icon, and product count.
6. Popular Products — products sorted by `salesCount`.
7. New Arrivals — products with `isNew: true`.
8. `PlatformShowcase` — large static cards for Steam/PS/Xbox/Nintendo linking to category filter pages.
9. `TestimonialCarousel` — pulls 5-star reviews from `getStoreTestimonials()`. The query joins `reviews` to `products` and fetches the first product image in a second batch query. Only approved, active, non-deleted reviews at rating 5 are included.
10. `NewsletterSignup` — email capture form that posts to `POST /api/store/newsletter`.

`HorizontalScroll` is a reusable client component that wraps its children in a horizontally-scrolling container with left/right arrow buttons and CSS `scroll-snap`. It accepts a `gapClassName` prop for spacing.

`CountdownTimer` is a client component that takes a target ISO datetime and counts down using a `setInterval`. It displays days/hours/minutes/seconds and shows "Deal Ended" when the timer hits zero.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/HorizontalScroll.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/CountdownTimer.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/TestimonialCarousel.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getStoreTestimonials()`

---

## Phase 5: Shopping Cart

### What was built

`src/lib/cart-store.tsx` is a React Context + `useReducer`-style cart that lives entirely in `localStorage`. The cart drawer is `src/components/store/CartDrawer.tsx`. One API route: `POST /api/store/cart/coupon`.

### How the cart state works

`CartProvider` holds cart lines in `useState<CartLine[]>`. On mount it runs a `useLayoutEffect` (before paint) to load lines from `localStorage`. After that, a `useEffect` persists lines back to localStorage whenever they change. The `ready` flag prevents the persist effect from running before the initial load, which would incorrectly overwrite stored data with an empty array.

`CartLine` is intentionally simple: `id` (a random UUID generated client-side), `productId`, `name`, `slug`, `imageUrl`, `price`, and `quantity`. No server database cart table is used — the implementation note in the plan says "guest cart remains localStorage-first".

Key operations:
- `addProduct`: if a line with the same `productId` exists, increment its quantity and update price/name/image (in case it changed). Otherwise push a new line. Always opens the cart drawer after adding.
- `setQuantity`: sets quantity to the new value; if quantity is 0, removes the line entirely.
- `removeLine`: filters the line out.
- `applyCoupon`: POSTs to `/api/store/cart/coupon` with `{ code, subtotal }`. On success stores `couponDiscount` in state. The coupon is not persisted to localStorage — it must be re-applied after page refresh. This is intentional: coupon validity may change between sessions.

`subtotal` and `itemCount` are derived with `useMemo` from `lines` to avoid recomputing on every render.

The coupon API route (`/api/store/cart/coupon`) validates the coupon code against the `coupons` table: active, not deleted, within `validFrom`/`validUntil`, usage count below limit, and subtotal above `minPurchase`. It returns the computed discount amount but does NOT increment `usageCount`. Usage is only incremented at checkout time in `storeCheckout.ts`.

### How the cart connects to the UI

`CartDrawer` uses `useCart()` to read `lines`, `subtotal`, `couponDiscount`, `drawerOpen` and the mutation functions. It is rendered inside `StoreProviders` (at layout level) so it is always mounted and can animate in from any page.

`CartIcon` in the header reads `itemCount` from `useCart()` to show the badge number.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/cart-store.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/CartDrawer.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/cart/coupon/route.ts`

---

## Phase 6: Checkout Flow

### What was built

A guest/logged-in checkout via `POST /api/store/checkout` backed by `src/services/storeCheckout.ts`. Order confirmation page at `src/app/store/order/[orderNumber]/page.tsx`. The checkout form is at `src/app/store/checkout/page.tsx`.

### How checkout works

The checkout API route (`/api/store/checkout/route.ts`) accepts `{ customerEmail, customerName, items, couponCode, currency, paymentMethod }`. It also calls `getStoreCustomer()` to check if the request comes from a logged-in customer — if so, it attaches `customerId` and `customerType` to the order.

The order creation logic lives in `createGuestStoreOrder` in `src/services/storeCheckout.ts`. The steps are:

1. Fetch all requested products by ID from the `products` table. If any are missing or inactive, throw an error immediately.
2. Compute `subtotal` by summing `basePrice * quantity` for each item.
3. If a `couponCode` is provided, look it up: active, not expired, within usage limit, and meeting minimum purchase. Apply percentage or flat discount. Cap at `maxDiscount` for percentage coupons.
4. Calculate `total = max(0, subtotal - discount)`.
5. Generate a unique `orderNumber` using `ORD-${timestamp}-${random6chars}`.
6. Generate a `checkoutToken` using `crypto.randomUUID()`. This token is stored in `orders.metadata.checkoutToken` and is returned to the caller. It serves as proof that a specific browser initiated this checkout — the order confirmation page requires it to view order details without authentication.
7. Insert the `orders` row with `status: "pending"`, `paymentStatus: "pending"`, `fulfillmentStatus: "pending"`.
8. Insert all `orderItems` rows.
9. Return `{ order, items, checkoutToken }`.

The checkout API returns `orderNumber` and `checkoutToken` to the frontend. The frontend navigates to `/store/order/{orderNumber}?token={checkoutToken}`. The order confirmation page calls `getStoreOrderPublic(orderNumber, token)` which verifies that `orders.metadata.checkoutToken` matches the token in the URL. Only then does it show order details. This prevents anyone who guesses an order number from seeing another customer's order.

Payment is a stub — the order is created with `paymentStatus: "pending"`. Actual ZainCash integration was deferred. A `POST /api/store/checkout/verify` stub exists for the payment callback.

### Tradeoff: no inventory reservation at checkout

At the time of checkout creation, stock is not reserved or decremented. Inventory is only actually allocated when an admin fulfills the order via `autoDelivery.ts`. This keeps checkout fast and avoids holding locks during pending-payment delays, but means two customers could theoretically both create orders for the same last unit. For a manually-fulfilled digital goods store, this is an acceptable tradeoff.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/checkout/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/services/storeCheckout.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/checkout/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/order/[orderNumber]/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getStoreOrderPublic()`

---

## Phase 7: Merchant vs Customer Storefront Separation

### What was built

Separate customer authentication system (distinct from admin auth), pricing tier selection based on customer type, and UI differences between retail and merchant views.

### 7A: Customer authentication

The store uses a completely separate auth flow from the admin dashboard. There are two tables: `customers` (which already existed for B2B/B2C data) and `customerSessions` (a new table in the schema). The cookie name is `customer_session` — different from the admin `session_token` cookie. Sessions last 30 days.

`src/lib/customer-auth.ts` provides three functions:
- `getStoreCustomer()`: reads the `customer_session` cookie, joins `customerSessions` with `customers`, checks expiry and soft-delete, returns `{ id, email, name, type, businessName }` or null. This is a server-side function safe to call from Server Components and API routes.
- `createCustomerSessionCookie(customerId)`: generates a token via `generateSessionToken()`, inserts a `customerSessions` row, sets an HttpOnly SameSite-lax cookie.
- `clearCustomerSessionCookie()`: deletes the DB row and the cookie.

The register route (`POST /api/store/auth/register`) hardcodes `type: "retail"` for all self-registrations. If someone tries to register as `type: "merchant"`, it returns a 403 with the message "Business accounts are created by an administrator." This enforces that B2B accounts can only be created by admin staff.

### 7B: Pricing tier selection

`getActiveProducts()` in `src/lib/store-queries.ts` accepts a `pricingTier` parameter (`"retail"` or `"merchant"`). When `pricingTier === "merchant"`:

1. After fetching the product list, fetch `productPricing` rows for those product IDs where `customerType === "merchant"` (for wholesale prices) and separately where `customerType === "retail"` (for the retail comparison price).
2. For each product, if a `wholesalePrice` exists in the merchant pricing row, replace `basePrice` with `wholesalePrice` and replace `compareAtPrice` with the retail price (so the card shows "wholesale price — retail was X").
3. Products without a pricing row fall through unchanged — they show their regular `basePrice`.

The same logic exists in `getProductBySlug()` for the product detail page.

### 7C: Customer context in the frontend

`src/lib/customer-context.tsx` is a client-side React context. `CustomerProvider` fetches `GET /api/store/customer/me` on mount to get the currently logged-in customer's data. It provides `{ customer, loading, isMerchant, refresh }`. `isMerchant` is just `customer?.type === "merchant"`.

Components read `useCustomer()` to conditionally render merchant-specific UI: wholesale price labels, "Wholesale -X%" badges instead of "Sale -X%", bulk quantity selectors, and "Credit eligible" indicators.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/customer-auth.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/customer-context.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/auth/register/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/auth/login/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/auth/logout/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/customer/me/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `pricingTier` param in `getActiveProducts()` and `getProductBySlug()`

---

## Phase 8: User Accounts

### What was built

Account pages at `src/app/store/account/`: overview, order history, order detail, wishlist, settings. Login and register pages. All account pages check `getStoreCustomer()` server-side and redirect to `/store/login` if unauthenticated.

### How order history works

`getOrdersForCustomer(customerId)` in `store-queries.ts` selects orders where `customerId` matches, excluding soft-deleted orders, sorted by most recent. For order detail, `getCustomerOrderDetail(customerId, orderNumber)` joins order with its items and only returns the order if `customerId` matches — this prevents a logged-in customer from viewing another customer's order by guessing an order number.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/login/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/register/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/account/` (directory)
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getOrdersForCustomer()`, `getCustomerOrderDetail()`

---

## Phase 9: Product Detail Page Improvements

### What was built

The product detail page (`src/app/store/products/[slug]/page.tsx`) was upgraded with new components: `AddToCartButton.tsx`, `WishlistButton.tsx`, `ShareButtons.tsx`, `ProductTabs.tsx`, `ReviewForm.tsx`, and an enhanced `ImageGallery.tsx`.

### How the detail page is structured

The page is a Server Component that calls `getProductBySlug(slug, { pricingTier })`. The `pricingTier` is determined by reading `getStoreCustomer()` server-side — if `customer.type === "merchant"`, pass `"merchant"`, otherwise `"retail"`.

`getProductBySlug` does a single product fetch, then fires seven queries in parallel via `Promise.all`:
- Product images (sorted by `sortOrder`)
- Option groups with their values (left-joined, built into a nested structure via a Map)
- Active variants
- Approved reviews (latest 10)
- Total review count
- Product's categories
- Active offers for this product

Tags are fetched separately to avoid overloading the connection pool.

The right column is sticky on desktop (`sticky top-4`). The "Add to Cart" button uses `AddToCartButton` (a Client Component that calls `useCart().addProduct`). Variants are selected using `VariantSelector` which walks `optionGroups` and tracks selections in local state — when a full combination is selected, it finds the matching variant from the `variants` array and updates the displayed price.

Below the fold, `ProductTabs` renders Description, Details, and Reviews tabs. The Reviews tab shows approved reviews and includes `ReviewForm` — a client component that posts to `POST /api/store/products/[slug]/reviews`.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/store/products/[slug]/page.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/ProductTabs.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/ImageGallery.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/VariantSelector.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getProductBySlug()`

---

## Phase 10: Smart Similar Products (Tag-Based)

### What was built

`getSimilarProducts(productId, opts)` in `src/lib/store-queries.ts`. It is called inside `getProductBySlug` to populate `relatedProducts`.

### How tag similarity works

The function executes a raw SQL query via Drizzle's `db.execute(sql`...`)`:

```sql
SELECT p."id", COUNT(*)::int AS similarity_score
FROM products p
JOIN product_tags pt ON pt."product_id" = p."id"
WHERE pt."tag" IN (
  SELECT "tag" FROM product_tags WHERE "product_id" = $currentProductId
)
AND p."id" != $currentProductId
AND p."is_active" = true
AND p."deleted_at" IS NULL
GROUP BY p."id"
ORDER BY similarity_score DESC
LIMIT $n + 1
```

This counts how many of the current product's tags each other product shares. The product sharing the most tags ranks highest. A product tagged `FPS + Shooter + Xbox` will outrank one tagged only `FPS` if the source product is also tagged `FPS + Shooter + Xbox`.

The raw IDs are returned, then the full `StoreProduct` shapes are fetched by calling `getActiveProducts()` and building a Map for O(1) lookup. The results are then ordered back to match the similarity ranking.

If no tag matches exist, the function falls back to fetching products in the same category (same as the old "related products" logic), sorted by popularity.

### Why raw SQL here

Drizzle ORM's query builder does not cleanly express a self-join on the same table where the subquery and outer query reference different rows. The raw SQL is more readable and performs better than the equivalent ORM chain would be.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getSimilarProducts()`

---

## Phase 11: "Customers Also Bought" Recommendations

### What was built

`getAlsoBought(productId, opts)` in `src/lib/store-queries.ts`. It is used on the product detail page and in the cart drawer.

### How co-occurrence works

The function runs a co-occurrence query: find all order items (`oi2`) that appear in the same orders as the target product (`oi1`), grouped by product ID, ordered by frequency:

```sql
SELECT oi2."product_id", COUNT(*)::int AS co_count
FROM order_items oi1
JOIN order_items oi2 ON oi1."order_id" = oi2."order_id"
JOIN products p ON p."id" = oi2."product_id"
WHERE oi1."product_id" = $currentProductId
  AND oi2."product_id" != $currentProductId
  AND p."is_active" = true
  AND p."deleted_at" IS NULL
GROUP BY oi2."product_id"
ORDER BY co_count DESC
LIMIT $n + 1
```

Like `getSimilarProducts`, the IDs are resolved to full `StoreProduct` shapes by reusing `getActiveProducts()`. If no co-occurrence data exists (e.g., the product has never been sold alongside another product), an empty array is returned — there is no fallback, because guessing at recommendations is worse than showing nothing.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-queries.ts` — `getAlsoBought()`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/AlsoBought.tsx`

---

## Phase 12: Quick View Modal

### What was built

`src/lib/quick-view-store.tsx` — a tiny context storing `slug | null`. `src/components/store/QuickViewModal.tsx` — the modal itself. `ProductCard.tsx` was modified to add a "Quick View" button on hover that calls `useQuickView().open(product.slug)`.

### How quick view works

`QuickViewProvider` holds a single `slug` string or null. When a card's "Quick View" button is clicked, it calls `open(slug)` which sets that slug in context.

`QuickViewModal` is always mounted in `StoreProviders` (alongside the CartDrawer). It watches the `slug` value from context. When `slug` becomes non-null, it:

1. Fetches `GET /api/store/products/${slug}` to get the product detail (images, option groups, variants, tags, etc.).
2. Initializes variant selections from the default variant.
3. Locks `document.body` scroll.
4. Adds an Escape keydown listener to close.

The modal renders as a two-column layout on desktop (image left, info right) and single-column on mobile. It uses `AnimatePresence` and Framer Motion for the fade+scale enter/exit animation.

The matched variant is computed inline from the `selections` state: for each option group, the selected value must match the variant's `optionCombination` for every group. When all groups are matched, the variant's price and `compareAtPrice` are used; otherwise the product's base price is shown.

The "Add to Cart" button calls `useCart().addProduct` directly. "View Full Details" is a Next.js `Link` to the product page that also calls `onClose`.

The cancelled flag in the `useEffect` fetch prevents a race condition where the modal closes and opens for a different product before the first fetch resolves — if `cancelled` is true when the response arrives, the state is not updated.

### Why a separate context instead of lifting state

The QuickView slug is needed both by `ProductCard` (to trigger it) and by `QuickViewModal` (to render). Lifting to the layout would couple components across the tree. A context makes the data available anywhere without prop drilling.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/quick-view-store.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/QuickViewModal.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/StoreProviders.tsx` — where `QuickViewBridge` connects the context to the modal

---

## Phase 13: Multi-currency Auto-detection

### What was built

`src/lib/geo-currency.ts` — country-to-currency mapping and header detection utilities. `src/lib/store-currency.tsx` — `StoreCurrencyProvider` and `useStoreCurrency`. `GET /api/store/currencies` — fetches active currencies with geo-detected suggestion. `CurrencySelector.tsx` — the UI dropdown in the header.

### How currency detection flows

On first load the browser calls `GET /api/store/currencies`. The API handler:

1. Fetches all active currencies from the `currencies` table (which is admin-managed with exchange rates).
2. Reads the `storeSettings.defaultCurrencyId` to know the store owner's preferred default.
3. Reads the `x-vercel-ip-country` header (or `cf-ipcountry` as a Cloudflare fallback) using `detectCountryFromHeaders()`. On Vercel, this header is automatically injected by the edge network.
4. Passes the country code to `currencyForCountry()` which does a simple Map lookup against ~80 country codes covering MENA, Europe, Americas, and Asia-Pacific. Eurozone countries are all mapped to EUR.
5. Only suggests the geo-detected currency if that currency code exists in the active currencies list. This prevents suggesting IQD if the store hasn't configured it.
6. Returns `{ currencies, defaultCurrencyId, detectedCurrency, detectedCountry }`.

`StoreCurrencyProvider` (client-side) fetches this on mount via `useLayoutEffect`. It resolves the starting currency code in priority order:
1. User's `localStorage` override (from a previous session or explicit selection).
2. Geo-detected currency from the API response.
3. Store's configured default currency.
4. Fallback to "USD".

The provider also builds a `rateMap` from the exchange rates. The `convert(baseAmount)` function is just `baseAmount * rateMap[currentCode]`. All amounts in the system are stored and computed in the base currency (effectively USD). `convert` is called at every display point.

`localeForCurrency()` maps currency codes to their proper locale strings so that `formatCurrency` (in `src/lib/utils.ts`) can use `Intl.NumberFormat` with the right locale — for example IQD uses `"ar-IQ"` for Arabic number formatting.

### Why exchange rates live in the DB

This lets the store owner update rates without a code deploy. A simple admin UI on the currencies page allows editing `exchangeRate`. The rates are fetched at runtime, not build time.

### Key files
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/geo-currency.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/lib/store-currency.tsx`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/app/api/store/currencies/route.ts`
- `/home/mint/Desktop/Flum/Flum/dashboard/src/components/store/CurrencySelector.tsx`

---

## How All Phases Connect at Runtime

The runtime provider chain is defined in `StoreProviders` (`src/components/store/StoreProviders.tsx`) and applied in `StoreLayout` (`src/app/store/layout.tsx`):

```
StoreThemeProvider        — CSS class on root div, persisted to localStorage
  StoreCurrencyProvider   — fetches currencies + geo, exposes convert()
    CustomerProvider      — fetches /api/store/customer/me, exposes isMerchant
      CartProvider        — localStorage cart, persisted state
        QuickViewProvider — slug | null
          {children}      — all store pages
          CartDrawer       — always mounted, animate-in on openDrawer()
          QuickViewBridge — always mounted, renders modal when slug is set
```

Every page in `/store/*` inherits this full context tree. Pages can call `useCart()`, `useStoreTheme()`, `useStoreCurrency()`, `useCustomer()`, or `useQuickView()` from any client component without passing props.

Server Components (pages, layouts) call `getStoreCustomer()` directly from `customer-auth.ts` to get auth without a network hop. Client Components go through `CustomerProvider`'s `customer` object.

---

## Schema additions from these phases (summary)

| Table / Column | Phase | Purpose |
|---|---|---|
| `product_tags` | 1D | Facet tags for platform/region/genre/type |
| `customers.password_hash` | 7A | Storefront password login for retail accounts |
| `customer_sessions` | 7A | Cookie-based sessions for storefront auth (separate from admin `sessions`) |
| `store_newsletter_signups` | 4 | Email capture from homepage newsletter widget |
| `orders.hold_until` | (admin) | Semi-auto delivery hold gate for approval workflow |
| `orders.customer_id` / `customer_type` | 6/7 | Attach checkout to logged-in customer and pricing tier used |
| `orders.metadata.checkoutToken` | 6 | Token-based guest order verification |
