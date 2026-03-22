/**
 * API Client for storefront
 *
 * Handles all API calls to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  price: string;
  compareAtPrice?: string | null;
  deliveryType: string;
  isFeatured: boolean;
  isNew: boolean;
  currentStock: number;
  pointsReward?: number;
  maxQuantity?: number;
  videoUrl?: string;
  videoThumbnail?: string;
  views?: number;
  salesCount?: number;
  averageRating?: string;
  ratingCount?: number;
  reviewCount?: number;
  images: Array<{
    id: string;
    url: string;
    alt?: string;
    sortOrder: number;
  }>;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categoryNameAr?: string;
    categorySlug: string;
    categoryIcon?: string;
    categoryPrice?: string | null;
    isPrimary?: boolean;
  }>;
  categoryId?: string;
  createdAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  icon?: string;
  banner?: string;
  parentId?: string;
  sortOrder: number;
  children?: Category[];
}

export interface CartItem {
  id: string;
  quantity: number;
  price: string;
  product: {
    id: string;
    name: string;
    nameAr?: string;
    slug: string;
    description?: string;
    descriptionAr?: string;
    basePrice: string;
    deliveryType: string;
    currentStock: number;
    maxQuantity: number;
    images: Array<{
      id: string;
      url: string;
      alt?: string;
      sortOrder: number;
    }>;
  };
  category?: {
    id: string;
    name: string;
    nameAr?: string;
    slug: string;
    icon?: string;
  } | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totals: {
    subtotal: string;
    itemsCount: number;
  };
}

export interface WishlistItem {
  id: string;
  productId: string;
  categoryId?: string;
  priceAlert?: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    nameAr?: string;
    slug: string;
    description?: string;
    descriptionAr?: string;
    price: string;
    compareAtPrice?: string | null;
    currentStock: number;
    isFeatured: boolean;
    isNew: boolean;
    deliveryType: string;
    averageRating?: string;
    reviewCount?: number;
    images: Array<{
      id: string;
      url: string;
      alt?: string;
      sortOrder: number;
    }>;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string;
  discount: string;
  total: string;
  createdAt: Date;
  deliveredAt?: Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    categoryName?: string;
    deliveryType: string;
    price: string;
    quantity: number;
    subtotal: string;
  }>;
}

// ============================================================================
// PRODUCTS API
// ============================================================================

export async function getProducts(params?: {
  locale?: string;
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  sort?: string;
}): Promise<ApiResponse<Product[]>> {
  const searchParams = new URLSearchParams();
  if (params?.locale) searchParams.set('locale', params.locale);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.category) searchParams.set('category', params.category);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.featured) searchParams.set('featured', 'true');
  if (params?.sort) searchParams.set('sort', params.sort);

  const response = await fetch(`${API_BASE_URL}/api/products?${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch products' };
  }

  return response.json();
}

export async function getProductBySlug(
  slug: string,
  locale?: string
): Promise<ApiResponse<Product>> {
  const searchParams = locale ? `?locale=${locale}` : '';
  const response = await fetch(`${API_BASE_URL}/api/products/${slug}${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch product' };
  }

  return response.json();
}

// ============================================================================
// CATEGORIES API
// ============================================================================

export async function getCategories(params?: {
  locale?: string;
  includeChildren?: boolean;
}): Promise<ApiResponse<Category[]>> {
  const searchParams = new URLSearchParams();
  if (params?.locale) searchParams.set('locale', params.locale);
  if (params?.includeChildren) searchParams.set('asTree', 'true');

  const response = await fetch(`${API_BASE_URL}/api/categories?${searchParams}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch categories' };
  }

  return response.json();
}

export async function getCategoryBySlug(
  slug: string,
  params?: {
    locale?: string;
    page?: number;
    limit?: number;
  }
): Promise<any> {
  const searchParams = new URLSearchParams();
  if (params?.locale) searchParams.set('locale', params.locale);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/categories/${slug}?${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch category' };
  }

  return response.json();
}

// ============================================================================
// CART API
// ============================================================================

export async function getCart(locale?: string): Promise<ApiResponse<Cart>> {
  const searchParams = locale ? `?locale=${locale}` : '';
  const response = await fetch(`${API_BASE_URL}/api/cart${searchParams}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch cart' };
  }

  return response.json();
}

export async function addToCart(data: {
  productId: string;
  categoryId?: string;
  quantity?: number;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to add to cart' };
  }

  return response.json();
}

export async function updateCartItem(data: {
  itemId: string;
  quantity: number;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/cart`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to update cart' };
  }

  return response.json();
}

export async function removeFromCart(itemId: string): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/cart?itemId=${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to remove from cart' };
  }

  return response.json();
}

// ============================================================================
// WISHLIST API
// ============================================================================

export async function getWishlist(locale?: string): Promise<ApiResponse<WishlistItem[]>> {
  const searchParams = locale ? `?locale=${locale}` : '';
  const response = await fetch(`${API_BASE_URL}/api/wishlist${searchParams}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch wishlist' };
  }

  return response.json();
}

export async function addToWishlist(data: {
  productId: string;
  categoryId?: string;
  priceAlert?: string;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to add to wishlist' };
  }

  return response.json();
}

export async function removeFromWishlist(itemId?: string, productId?: string): Promise<ApiResponse<any>> {
  const params = new URLSearchParams();
  if (itemId) params.set('itemId', itemId);
  if (productId) params.set('productId', productId);

  const response = await fetch(`${API_BASE_URL}/api/wishlist?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to remove from wishlist' };
  }

  return response.json();
}

// ============================================================================
// ORDERS API
// ============================================================================

export async function createOrder(data: {
  customerEmail: string;
  customerName?: string;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to create order' };
  }

  return response.json();
}

export async function getOrders(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Order[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/orders?${searchParams}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch orders' };
  }

  return response.json();
}

export async function getOrderById(id: string): Promise<ApiResponse<Order>> {
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch order' };
  }

  return response.json();
}

// ============================================================================
// AUTH API
// ============================================================================

export async function login(data: {
  email: string;
  password: string;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Login failed' };
  }

  return response.json();
}

export async function signup(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return { success: false, error: 'Signup failed' };
  }

  return response.json();
}

export async function logout(): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    return { success: false, error: 'Logout failed' };
  }

  return response.json();
}

export async function getCurrentUser(): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return { success: false, error: 'Failed to fetch user' };
  }

  return response.json();
}
