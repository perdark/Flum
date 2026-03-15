/**
 * Application-wide constants
 */

export const SITE_NAME = 'Fulmen Empire';
export const SITE_TAGLINE = 'Digital Products Store';

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export const DELIVERY_TYPES = [
  { value: 'auto_key', label: 'Auto Key Delivery', labelAr: 'تسليم المفتاح التلقائي' },
  { value: 'auto_account', label: 'Auto Account Delivery', labelAr: 'تسليم الحساب التلقائي' },
  { value: 'manual', label: 'Manual Delivery', labelAr: 'تسليم يدوي' },
  { value: 'contact', label: 'Contact for Delivery', labelAr: 'تواصل للتسليم' },
] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number]['value'];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', labelAr: 'قيد الانتظار', color: 'text-warning' },
  { value: 'processing', label: 'Processing', labelAr: 'قيد المعالجة', color: 'text-info' },
  { value: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', color: 'text-success' },
  { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي', color: 'text-error' },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value'];

export const PAYMENT_METHODS = [
  { value: 'stripe', label: 'Card Payment', labelAr: 'الدفع بالبطاقة' },
  { value: 'manual_contact', label: 'Contact Payment', labelAr: 'الدفع عبر التواصل' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', labelAr: 'قيد الانتظار' },
  { value: 'paid', label: 'Paid', labelAr: 'مدفوع' },
  { value: 'failed', label: 'Failed', labelAr: 'فشل' },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['value'];

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', labelAr: 'الأحدث' },
  { value: 'price_low', label: 'Price: Low to High', labelAr: 'السعر: من الأقل للأعلى' },
  { value: 'price_high', label: 'Price: High to Low', labelAr: 'السعر: من الأعلى للأقل' },
  { value: 'popular', label: 'Popularity', labelAr: 'الأكثر شعبية' },
  { value: 'rating', label: 'Rating', labelAr: 'التقييم' },
] as const;

export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number]['value'];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 12,
  MAX_PER_PAGE: 48,
} as const;

export const CACHE_KEYS = {
  CART: 'cart',
  WISHLIST: 'wishlist',
  RECENTLY_VIEWED: 'recently_viewed',
  CURRENCY: 'currency',
  LOCALE: 'locale',
  SESSION: 'session_id',
} as const;

export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  PLATFORMS: '/platforms',
  CART: '/cart',
  CHECKOUT: '/checkout',
  WISHLIST: '/wishlist',
  PROFILE: '/profile',
  ORDERS: '/profile/orders',
  SEARCH: '/search',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
} as const;

export const API_ROUTES = {
  // Products
  PRODUCTS: '/api/products',
  PRODUCT_BY_SLUG: '/api/products/slug',
  PRODUCT_PLATFORMS: '/api/products/platforms',

  // Platforms
  PLATFORMS: '/api/platforms',
  PLATFORM_TREE: '/api/platforms/tree',

  // Cart
  CART: '/api/cart',
  CART_ADD: '/api/cart/add',
  CART_UPDATE: '/api/cart/update',
  CART_REMOVE: '/api/cart/remove',
  CART_CLEAR: '/api/cart/clear',
  CART_MERGE: '/api/cart/merge',

  // Wishlist
  WISHLIST: '/api/wishlist',
  WISHLIST_ADD: '/api/wishlist/add',
  WISHLIST_REMOVE: '/api/wishlist/remove',
  WISHLIST_CHECK: '/api/wishlist/check',

  // Reviews
  REVIEWS: '/api/reviews',
  REVIEWS_PRODUCT: '/api/reviews/product',

  // Orders
  ORDERS: '/api/orders',
  ORDER_BY_ID: '/api/orders',
  ORDER_CREATE: '/api/orders/create',

  // Search
  SEARCH: '/api/search',
  SEARCH_SUGGEST: '/api/search/suggest',

  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_SESSION: '/api/auth/session',
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;
