import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, CACHE_KEYS } from '@/config/constants';

/**
 * Middleware to handle locale routing
 *
 * - Detects user's preferred language from Accept-Language header
 * - Redirects to localized URL if no locale is present
 * - Preserves locale in cookie for subsequent visits
 *
 * @deprecated This uses the legacy middleware pattern. The new approach uses next.config.ts rewrites.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameIsMissingLocale = SUPPORTED_LOCALES.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if locale is missing
  if (pathnameIsMissingLocale) {
    // Get locale from cookie, header, or default
    const cookieLocale = request.cookies.get(CACHE_KEYS.LOCALE)?.value;
    const acceptLanguage = request.headers.get('accept-language') || '';
    const headerLocale = acceptLanguage.split(',')[0]?.split('-')[0] || DEFAULT_LOCALE;

    const locale =
      cookieLocale ||
      (SUPPORTED_LOCALES.includes(headerLocale as any)
        ? headerLocale
        : DEFAULT_LOCALE);

    // Redirect to localized URL
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;

    // Set locale cookie
    const response = NextResponse.redirect(url);
    response.cookies.set(CACHE_KEYS.LOCALE, locale);
    return response;
  }

  // Extract locale from pathname
  const locale = pathname.split('/')[1] as (typeof SUPPORTED_LOCALES)[number];

  // Set locale cookie if not already set
  const response = NextResponse.next();
  if (!request.cookies.get(CACHE_KEYS.LOCALE)?.value) {
    response.cookies.set(CACHE_KEYS.LOCALE, locale);
  }

  // Add locale to response headers for use in components
  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     */
    '/((?!api|_next|.*\\..*).*)',
  ],
};
