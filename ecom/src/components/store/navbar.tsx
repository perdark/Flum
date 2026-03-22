'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, ShoppingBag, Heart, User, Globe } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getLocalizedValue } from '@/lib/utils';
import { ROUTES, SUPPORTED_CURRENCIES, type CurrencyCode } from '@/config/constants';
import type { Locale } from '@/lib/i18n';

interface NavbarProps {
  locale: Locale;
}

interface NavItem {
  label: string;
  labelAr: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Products', labelAr: 'المنتجات', href: '/products' },
  { label: 'Categories', labelAr: 'المنصات', href: '/categories' },
];

export function Navbar({ locale }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<{ firstName?: string; lastName?: string } | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const isRTL = locale === 'ar';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem('cart');
      if (cart) {
        try {
          const items = JSON.parse(cart);
          const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(count);
        } catch {
          setCartCount(0);
        }
      }
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, []);

  // Load currency from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency') as CurrencyCode;
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
    setCurrencyOpen(false);
    // In a real app, this would trigger a price refresh
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border/50 shadow-lg'
            : 'bg-transparent'
        )}
      >
        {/* Top Bar */}
        {/* <div className="hidden md:block bg-background-light border-b border-border/30 py-1.5">
          <div className="container mx-auto px-4 flex items-center justify-between text-xs text-text-muted">
            <p>🎮 {locale === 'ar' ? 'أفضل المنتجات الرقمية' : 'Best Digital Products'}</p>
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/profile/orders`}
                className="hover:text-text transition-colors"
              >
                {locale === 'ar' ? 'تتبع طلبك' : 'Track Order'}
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="hover:text-text transition-colors"
              >
                {locale === 'ar' ? 'الدعم' : 'Support'}
              </Link>
            </div>
          </div>
        </div> */}

        {/* Main Navbar */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Logo variant="compact" href={`/${locale}`} />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  className="text-text-muted hover:text-primary transition-colors font-medium relative group"
                >
                  {getLocalizedValue(item.label, item.labelAr, locale)}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                </Link>
              ))}

              {/* Categories Dropdown */}
              <div className="relative group">
                <button className="text-text-muted hover:text-primary transition-colors font-medium flex items-center gap-1">
                  {locale === 'ar' ? 'المنصات' : 'Categories'}
                  <svg
                    className={cn('w-4 h-4 transition-transform', isRTL && 'rotate-180')}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    <Link
                      href={`/${locale}/categories/gaming`}
                      className="block px-4 py-3 hover:bg-background-lighter transition-colors"
                    >
                      {locale === 'ar' ? 'الألعاب' : 'Gaming'}
                    </Link>
                    <Link
                      href={`/${locale}/categories/subscriptions`}
                      className="block px-4 py-3 hover:bg-background-lighter transition-colors"
                    >
                      {locale === 'ar' ? 'الاشتراكات' : 'Subscriptions'}
                    </Link>
                    <Link
                      href={`/${locale}/categories/ai`}
                      className="block px-4 py-3 hover:bg-background-lighter transition-colors"
                    >
                      AI
                    </Link>
                    <Link
                      href={`/${locale}/categories`}
                      className="block px-4 py-3 hover:bg-background-lighter transition-colors border-t border-border/50 text-primary"
                    >
                      {locale === 'ar' ? 'عرض الكل' : 'View All'}
                    </Link>
                  </div>
                </div>
              </div>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-text-muted hover:text-primary transition-colors"
                aria-label={locale === 'ar' ? 'بحث' : 'Search'}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Currency Selector */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-text-muted hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {currency}
                </button>

                {currencyOpen && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => handleCurrencyChange(c.code as CurrencyCode)}
                        className={cn(
                          'w-full px-4 py-2 text-left hover:bg-background-lighter transition-colors flex items-center gap-2',
                          c.code === currency && 'bg-background-lighter text-primary'
                        )}
                      >
                        <span>{c.symbol}</span>
                        <span>{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link
                href={`/${locale}/wishlist`}
                className="p-2 text-text-muted hover:text-primary transition-colors relative"
                aria-label={locale === 'ar' ? 'المفضلة' : 'Wishlist'}
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="p-2 text-text-muted hover:text-primary transition-colors relative"
                aria-label={locale === 'ar' ? 'السلة' : 'Cart'}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="sale"
                    size="sm"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </button>

              {/* User Menu */}
              {user ? (
                <Link
                  href={`/${locale}/profile`}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-lighter hover:bg-background-light transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback firstName={user.firstName} lastName={user.lastName} />
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user.firstName || user.lastName}
                  </span>
                </Link>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link href={`/${locale}/auth/login`}>
                    <Button variant="ghost" size="sm">
                      {locale === 'ar' ? 'دخول' : 'Login'}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/auth/signup`}>
                    <Button variant="primary" size="sm">
                      {locale === 'ar' ? 'تسجيل' : 'Sign Up'}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Language Switcher */}
              <Link
                href={`/${locale === 'en' ? 'ar' : 'en'}`}
                className="hidden md:flex items-center gap-1 px-2 py-1 text-sm font-medium text-text-muted hover:text-primary transition-colors"
              >
                {locale === 'ar' ? 'EN' : 'عربي'}
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-text-muted hover:text-primary transition-colors"
                aria-label={locale === 'ar' ? 'القائمة' : 'Menu'}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden bg-background border-t border-border/50">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  onClick={() => setIsOpen(false)}
                  className="text-text hover:text-primary transition-colors font-medium py-2"
                >
                  {getLocalizedValue(item.label, item.labelAr, locale)}
                </Link>
              ))}

              <Link
                href={`/${locale}/categories`}
                onClick={() => setIsOpen(false)}
                className="text-text hover:text-primary transition-colors font-medium py-2"
              >
                {locale === 'ar' ? 'المنصات' : 'Categories'}
              </Link>

              <div className="border-t border-border/50 pt-4 flex flex-col gap-2">
                {!user ? (
                  <>
                    <Link
                      href={`/${locale}/auth/login`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        {locale === 'ar' ? 'دخول' : 'Login'}
                      </Button>
                    </Link>
                    <Link
                      href={`/${locale}/auth/signup`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button variant="primary" className="w-full">
                        {locale === 'ar' ? 'تسجيل' : 'Sign Up'}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/${locale}/profile`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 py-2"
                  >
                    <Avatar>
                      <AvatarFallback firstName={user.firstName} lastName={user.lastName} />
                    </Avatar>
                    <span className="font-medium">
                      {user.firstName || user.lastName}
                    </span>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <SearchOverlay onClose={() => setSearchOpen(false)} locale={locale} />
      )}

      {/* Mini Cart Drawer */}
      {cartOpen && <MiniCartDrawer onClose={() => setCartOpen(false)} locale={locale} />}

      {/* Backdrop */}
      {(searchOpen || cartOpen) && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={() => {
            setSearchOpen(false);
            setCartOpen(false);
          }}
        />
      )}
    </>
  );
}

// Search Overlay Component
function SearchOverlay({ onClose, locale }: { onClose: () => void; locale: Locale }) {
  const [query, setQuery] = useState('');

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border animate-slide-down">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === 'ar' ? 'ابحث عن منتجات...' : 'Search for products...'}
            className="flex-1 bg-transparent text-lg text-text placeholder:text-text-muted focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-2 text-text-muted hover:text-primary">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Results */}
        {query.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-text-muted mb-3">
              {locale === 'ar' ? 'نتائج البحث السريع' : 'Quick Results'}
            </p>
            <div className="text-center py-8 text-text-muted">
              {locale === 'ar' ? 'ابدأ الكتابة للبحث...' : 'Start typing to search...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Cart Drawer Component
function MiniCartDrawer({ onClose, locale }: { onClose: () => void; locale: Locale }) {
  const cartItems = []; // TODO: Load from cart store
  const subtotal = 0;

  return (
    <div
      className={cn(
        'fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-card shadow-2xl animate-slide-in',
        locale === 'ar' && 'right-auto left-0'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {locale === 'ar' ? 'سلة التسوق' : 'Shopping Cart'}
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">
                {locale === 'ar' ? 'سلة التسوق فارغة' : 'Your cart is empty'}
              </p>
              <button onClick={onClose} className="text-primary hover:underline">
                {locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cart items will be rendered here */}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">
                {locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
              </span>
              <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <Link href={`/${locale}/cart`} onClick={onClose}>
              <Button variant="primary" className="w-full">
                {locale === 'ar' ? 'عرض السلة' : 'View Cart'}
              </Button>
            </Link>
            <Link href={`/${locale}/checkout`} onClick={onClose}>
              <Button variant="accent" className="w-full">
                {locale === 'ar' ? 'إتمام الشراء' : 'Checkout'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
