import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { MobileTabBar } from "@/components/store/MobileTabBar";
import { StoreProviders } from "@/components/store/StoreProviders";
import { JsonLd } from "@/components/store/JsonLd";
import { getStoreSettings } from "@/lib/store-queries";
import { organizationJsonLd, resolveStoreOrigin, websiteJsonLd } from "@/lib/structured-data";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: {
      default: settings?.metaTitle || settings?.storeName || "Store",
      template: `%s | ${settings?.storeName || "Store"}`,
    },
    description: settings?.metaDescription || settings?.description || "",
  };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  const headersList = await headers();
  const origin = resolveStoreOrigin(headersList, settings?.storeUrl ?? null);
  const storeLabel = settings?.storeName || "Store";

  return (
    <div className={inter.className}>
      <StoreProviders>
        {origin ? (
          <>
            <JsonLd
              data={organizationJsonLd({
                url: origin,
                name: storeLabel,
                logo: settings?.logoUrl,
                email: settings?.supportEmail ?? settings?.contactEmail,
                phone: settings?.supportPhone ?? undefined,
              })}
            />
            <JsonLd
              data={websiteJsonLd({
                url: origin,
                name: storeLabel,
                searchUrlTemplate: `${origin}/store/products?search={search_term_string}`,
              })}
            />
          </>
        ) : null}
        <StoreHeader />
        <main className="flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <StoreFooter
          storeName={settings?.storeName}
          description={settings?.description}
          contactEmail={settings?.contactEmail}
          supportEmail={settings?.supportEmail}
          supportPhone={settings?.supportPhone ?? undefined}
          storeUrl={settings?.storeUrl ?? undefined}
          defaultLanguage={settings?.defaultLanguage}
        />
        <MobileTabBar />
      </StoreProviders>
    </div>
  );
}
