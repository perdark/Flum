/**
 * Country-to-currency mapping for IP-based auto-detection.
 *
 * Uses Vercel's `x-vercel-ip-country` header when available,
 * falls back to a lightweight third-party API in dev.
 */

/** Map ISO 3166-1 alpha-2 country codes → ISO 4217 currency codes */
const COUNTRY_CURRENCY: Record<string, string> = {
  // Middle East & North Africa
  IQ: "IQD",
  SA: "SAR",
  AE: "AED",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  QA: "QAR",
  EG: "EGP",
  JO: "JOD",
  LB: "LBP",
  SY: "SYP",
  YE: "YER",
  LY: "LYD",
  TN: "TND",
  DZ: "DZD",
  MA: "MAD",

  // Americas
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CO: "COP",
  CL: "CLP",

  // Europe
  GB: "GBP",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "HRK",
  RU: "RUB",
  UA: "UAH",
  TR: "TRY",

  // Asia-Pacific
  JP: "JPY",
  CN: "CNY",
  KR: "KRW",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  ID: "IDR",
  MY: "MYR",
  SG: "SGD",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  AU: "AUD",
  NZ: "NZD",

  // Africa
  NG: "NGN",
  KE: "KES",
  ZA: "ZAR",
  GH: "GHS",
};

// EU Eurozone countries
const EUROZONE = [
  "AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
];
for (const code of EUROZONE) {
  COUNTRY_CURRENCY[code] = "EUR";
}

/** Locale map for proper formatting */
const CURRENCY_LOCALE: Record<string, string> = {
  IQD: "ar-IQ",
  SAR: "ar-SA",
  AED: "ar-AE",
  EGP: "ar-EG",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
  KRW: "ko-KR",
  INR: "en-IN",
  TRY: "tr-TR",
  BRL: "pt-BR",
  RUB: "ru-RU",
  AUD: "en-AU",
  CAD: "en-CA",
};

/**
 * Get the suggested currency code for a country ISO code.
 * Returns null if the country isn't in our map.
 */
export function currencyForCountry(countryCode: string): string | null {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? null;
}

/**
 * Get the best locale for formatting a currency.
 * Falls back to "en-US" if no specific locale mapped.
 */
export function localeForCurrency(currencyCode: string): string {
  return CURRENCY_LOCALE[currencyCode.toUpperCase()] ?? "en-US";
}

/**
 * Detect the user's country from request headers.
 * Works on Vercel (x-vercel-ip-country header) and Cloudflare (cf-ipcountry).
 */
export function detectCountryFromHeaders(
  headers: Headers,
): string | null {
  return (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null
  );
}
