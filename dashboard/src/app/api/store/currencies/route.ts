import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { currencies, storeSettings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { detectCountryFromHeaders, currencyForCountry } from "@/lib/geo-currency";

/** Public list of active currencies + default id + geo-detected currency (no auth). */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const [settings] = await db
      .select({ defaultCurrencyId: storeSettings.defaultCurrencyId })
      .from(storeSettings)
      .limit(1);

    const list = await db
      .select({
        id: currencies.id,
        code: currencies.code,
        symbol: currencies.symbol,
        name: currencies.name,
        exchangeRate: currencies.exchangeRate,
      })
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(asc(currencies.code));

    // Geo-detect suggested currency
    const country = detectCountryFromHeaders(req.headers);
    const geoCurrency = country ? currencyForCountry(country) : null;
    // Only suggest if that currency is in our active list
    const geoMatch = geoCurrency
      ? list.find((c) => c.code === geoCurrency)?.code ?? null
      : null;

    return NextResponse.json({
      success: true,
      data: {
        currencies: list,
        defaultCurrencyId: settings?.defaultCurrencyId ?? null,
        detectedCurrency: geoMatch,
        detectedCountry: country,
      },
    });
  } catch (error) {
    console.error("store/currencies:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load currencies" },
      { status: 500 },
    );
  }
}
