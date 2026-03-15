import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config/constants';

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const defaultLocale: Locale = DEFAULT_LOCALE;

export const locales: Locale[] = [...SUPPORTED_LOCALES];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeDirections[locale] || 'ltr';
}

export function getLocaleName(locale: Locale): string {
  return localeNames[locale] || locale;
}

/**
 * Simple i18n helper - replace with next-intl or similar for more complex needs
 */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const translations = translationsMap[locale];
  const value = key.split('.').reduce((obj, k) => obj?.[k], translations as any);

  if (typeof value !== 'string') {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  // Replace params in string
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) =>
      params[paramKey]?.toString() || ''
    );
  }

  return value;
}

// Translation maps
const translationsMap = {
  en: {
    // Common
    common: {
      appName: 'Fulmen Empire',
      loading: 'Loading...',
      search: 'Search',
      searchPlaceholder: 'Search for products...',
      viewAll: 'View All',
      filter: 'Filter',
      sort: 'Sort',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      or: 'or',
      and: 'and',
      free: 'Free',
      from: 'From',
      to: 'to',
    },
    // Navigation
    nav: {
      home: 'Home',
      products: 'Products',
      platforms: 'Platforms',
      cart: 'Cart',
      wishlist: 'Wishlist',
      profile: 'Profile',
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      orders: 'Orders',
      points: 'Points',
      settings: 'Settings',
    },
    // Buttons
    buttons: {
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      checkout: 'Checkout',
      addToWishlist: 'Add to Wishlist',
      removeFromWishlist: 'Remove from Wishlist',
      continueShopping: 'Continue Shopping',
      placeOrder: 'Place Order',
      applyCoupon: 'Apply Coupon',
    },
    // Product
    product: {
      description: 'Description',
      specifications: 'Specifications',
      reviews: 'Reviews',
      writeReview: 'Write a Review',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      delivery: 'Delivery',
      pointsReward: 'Earn {points} points',
      platform: 'Platform',
      selectPlatform: 'Select Platform',
      relatedProducts: 'Related Products',
      alsoBought: 'Customers Also Bought',
      trending: 'Trending Now',
      gallery: 'Gallery',
      trailer: 'Trailer',
    },
    // Cart
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      subtotal: 'Subtotal',
      tax: 'Tax',
      total: 'Total',
      remove: 'Remove',
      quantity: 'Quantity',
      updateQuantity: 'Update Quantity',
      continueToCheckout: 'Continue to Checkout',
      itemAdded: 'Item added to cart',
      itemRemoved: 'Item removed from cart',
      cartUpdated: 'Cart updated',
    },
    // Checkout
    checkout: {
      title: 'Checkout',
      guestCheckout: 'Guest Checkout',
      loginPrompt: 'Login to checkout faster',
      paymentMethod: 'Payment Method',
      cardPayment: 'Card Payment',
      contactPayment: 'Contact for Payment',
      orderSummary: 'Order Summary',
      usePoints: 'Use Points',
      pointsAvailable: 'You have {points} points available',
      pointsApplied: '{points} points applied',
      billingAddress: 'Billing Address',
      shippingAddress: 'Shipping Address',
      sameAsBilling: 'Same as Billing',
      placeOrder: 'Place Order',
      orderSuccess: 'Order placed successfully!',
      orderNumber: 'Order Number: {number}',
      orderConfirmation: 'A confirmation email has been sent to {email}',
    },
    // Auth
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      firstName: 'First Name',
      lastName: 'Last Name',
      phoneNumber: 'Phone Number',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember Me',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      createAccount: 'Create Account',
      loginError: 'Invalid email or password',
      signupError: 'Failed to create account',
      logoutSuccess: 'Logged out successfully',
    },
    // Profile
    profile: {
      myProfile: 'My Profile',
      editProfile: 'Edit Profile',
      myOrders: 'My Orders',
      myWishlist: 'My Wishlist',
      myPoints: 'My Points',
      pointsBalance: 'Points Balance',
      pointsHistory: 'Points History',
      orderHistory: 'Order History',
      orderDetails: 'Order Details',
      noOrders: 'You have no orders yet',
      noWishlist: 'Your wishlist is empty',
    },
    // Orders
    order: {
      status: 'Status',
      date: 'Date',
      total: 'Total',
      items: 'Items',
      pending: 'Pending',
      processing: 'Processing',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      viewDetails: 'View Details',
      trackOrder: 'Track Order',
      download: 'Download',
      deliveryType: 'Delivery Type',
    },
    // Platform
    platform: {
      browseByPlatform: 'Browse by Platform',
      allPlatforms: 'All Platforms',
      gaming: 'Gaming',
      subscriptions: 'Subscriptions',
      software: 'Software',
      services: 'Services',
    },
    // Filters
    filters: {
      priceRange: 'Price Range',
      rating: 'Rating',
      category: 'Category',
      platform: 'Platform',
      availability: 'Availability',
      inStock: 'In Stock',
      newest: 'Newest',
      priceLow: 'Price: Low to High',
      priceHigh: 'Price: High to Low',
      popular: 'Popularity',
      topRated: 'Top Rated',
      clearAll: 'Clear All',
      applyFilters: 'Apply Filters',
    },
    // Reviews
    review: {
      writeReview: 'Write a Review',
      yourReview: 'Your Review',
      rating: 'Rating',
      comment: 'Comment',
      submitReview: 'Submit Review',
      reviewPending: 'Your review is pending approval',
      reviewSuccess: 'Review submitted successfully',
      noReviews: 'No reviews yet',
      beFirst: 'Be the first to review this product',
    },
    // Discovery
    discovery: {
      recommendedForYou: 'Recommended for You',
      trending: 'Trending Now',
      recentlyViewed: 'Recently Viewed',
      new: 'New Arrivals',
      sale: 'On Sale',
      featured: 'Featured',
      bestSellers: 'Best Sellers',
      specialOffers: 'Special Offers',
    },
    // Footer
    footer: {
      aboutUs: 'About Us',
      contactUs: 'Contact Us',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      faq: 'FAQ',
      support: 'Support',
      newsletter: 'Newsletter',
      newsletterPlaceholder: 'Enter your email',
      subscribe: 'Subscribe',
      followUs: 'Follow Us',
      allRightsReserved: 'All rights reserved',
    },
  },
  ar: {
    // Common
    common: {
      appName: 'فولمن إمباير',
      loading: 'جاري التحميل...',
      search: 'بحث',
      searchPlaceholder: 'البحث عن المنتجات...',
      viewAll: 'عرض الكل',
      filter: 'تصفية',
      sort: 'ترتيب',
      close: 'إغلاق',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      or: 'أو',
      and: 'و',
      free: 'مجاني',
      from: 'من',
      to: 'إلى',
    },
    // Navigation
    nav: {
      home: 'الرئيسية',
      products: 'المنتجات',
      platforms: 'المنصات',
      cart: 'السلة',
      wishlist: 'المفضلة',
      profile: 'الملف الشخصي',
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      orders: 'الطلبات',
      points: 'النقاط',
      settings: 'الإعدادات',
    },
    // Buttons
    buttons: {
      addToCart: 'إضافة للسلة',
      buyNow: 'اشتري الآن',
      checkout: 'إتمام الشراء',
      addToWishlist: 'إضافة للمفضلة',
      removeFromWishlist: 'إزالة من المفضلة',
      continueShopping: 'مواصلة التسوق',
      placeOrder: 'تأكيد الطلب',
      applyCoupon: 'تطبيق الكوبون',
    },
    // Product
    product: {
      description: 'الوصف',
      specifications: 'المواصفات',
      reviews: 'التقييمات',
      writeReview: 'أكتب تقييم',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      delivery: 'التوصيل',
      pointsReward: 'اكسب {points} نقطة',
      platform: 'المنصة',
      selectPlatform: 'اختر المنصة',
      relatedProducts: 'منتجات ذات صلة',
      alsoBought: 'اشترى أيضاً',
      trending: 'الرائج الآن',
      gallery: 'المعرض',
      trailer: 'الفيديو',
    },
    // Cart
    cart: {
      title: 'سلة التسوق',
      empty: 'سلة التسوق فارغة',
      subtotal: 'المجموع الفرعي',
      tax: 'الضريبة',
      total: 'المجموع',
      remove: 'إزالة',
      quantity: 'الكمية',
      updateQuantity: 'تحديث الكمية',
      continueToCheckout: 'متابعة الدفع',
      itemAdded: 'تمت إضافة المنتج للسلة',
      itemRemoved: 'تمت إزالة المنتج من السلة',
      cartUpdated: 'تم تحديث السلة',
    },
    // Checkout
    checkout: {
      title: 'إتمام الشراء',
      guestCheckout: 'الشراء كزائر',
      loginPrompt: 'سجل دخولك لإتمام الشراء بسرعة',
      paymentMethod: 'طريقة الدفع',
      cardPayment: 'الدفع بالبطاقة',
      contactPayment: 'التواصل للدفع',
      orderSummary: 'ملخص الطلب',
      usePoints: 'استخدام النقاط',
      pointsAvailable: 'لديك {points} نقطة متاحة',
      pointsApplied: 'تم تطبيق {points} نقطة',
      billingAddress: 'عنوان الفوترة',
      shippingAddress: 'عنوان الشحن',
      sameAsBilling: 'نفس عنوان الفوترة',
      placeOrder: 'تأكيد الطلب',
      orderSuccess: 'تم تأكيد الطلب بنجاح!',
      orderNumber: 'رقم الطلب: {number}',
      orderConfirmation: 'تم إرسال رسالة تأكيد إلى {email}',
    },
    // Auth
    auth: {
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      phoneNumber: 'رقم الهاتف',
      forgotPassword: 'نسيت كلمة المرور؟',
      rememberMe: 'تذكرني',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟',
      createAccount: 'إنشاء حساب',
      loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      signupError: 'فشل إنشاء الحساب',
      logoutSuccess: 'تم تسجيل الخروج بنجاح',
    },
    // Profile
    profile: {
      myProfile: 'ملفي الشخصي',
      editProfile: 'تعديل الملف',
      myOrders: 'طلباتي',
      myWishlist: 'المفضلة',
      myPoints: 'نقاطي',
      pointsBalance: 'رصيد النقاط',
      pointsHistory: 'سجل النقاط',
      orderHistory: 'سجل الطلبات',
      orderDetails: 'تفاصيل الطلب',
      noOrders: 'ليس لديك طلبات بعد',
      noWishlist: 'قائمة المفضلة فارغة',
    },
    // Orders
    order: {
      status: 'الحالة',
      date: 'التاريخ',
      total: 'المجموع',
      items: 'المنتجات',
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      viewDetails: 'عرض التفاصيل',
      trackOrder: 'تتبع الطلب',
      download: 'تحميل',
      deliveryType: 'نوع التوصيل',
    },
    // Platform
    platform: {
      browseByPlatform: 'تصفح حسب المنصة',
      allPlatforms: 'جميع المنصات',
      gaming: 'الألعاب',
      subscriptions: 'الاشتراكات',
      software: 'البرامج',
      services: 'الخدمات',
    },
    // Filters
    filters: {
      priceRange: 'نطاق السعر',
      rating: 'التقييم',
      category: 'الفئة',
      platform: 'المنصة',
      availability: 'التوفر',
      inStock: 'متوفر',
      newest: 'الأحدث',
      priceLow: 'السعر: من الأقل للأعلى',
      priceHigh: 'السعر: من الأعلى للأقل',
      popular: 'الشعبية',
      topRated: 'الأعلى تقييماً',
      clearAll: 'مسح الكل',
      applyFilters: 'تطبيق الفلاتر',
    },
    // Reviews
    review: {
      writeReview: 'أكتب تقييم',
      yourReview: 'تقييمك',
      rating: 'التقييم',
      comment: 'التعليق',
      submitReview: 'إرسال التقييم',
      reviewPending: 'تقييمك بانتظار الموافقة',
      reviewSuccess: 'تم إرسال التقييم بنجاح',
      noReviews: 'لا توجد تقييمات بعد',
      beFirst: 'كن أول من يقيم هذا المنتج',
    },
    // Discovery
    discovery: {
      recommendedForYou: 'موصى به لك',
      trending: 'الرائج الآن',
      recentlyViewed: 'شاهدته مؤخراً',
      new: 'وصل حديثاً',
      sale: 'تخفيضات',
      featured: 'متميز',
      bestSellers: 'الأكثر مبيعاً',
      specialOffers: 'عروض خاصة',
    },
    // Footer
    footer: {
      aboutUs: 'من نحن',
      contactUs: 'اتصل بنا',
      termsOfService: 'شروط الخدمة',
      privacyPolicy: 'سياسة الخصوصية',
      faq: 'الأسئلة الشائعة',
      support: 'الدعم',
      newsletter: 'النشرة الإخبارية',
      newsletterPlaceholder: 'أدخل بريدك الإلكتروني',
      subscribe: 'اشتراك',
      followUs: 'تابعنا',
      allRightsReserved: 'جميع الحقوق محفوظة',
    },
  },
} as const;

export type TranslationKey = typeof translationsMap.en;

export function getTranslations(locale: Locale) {
  return translationsMap[locale] || translationsMap.en;
}
