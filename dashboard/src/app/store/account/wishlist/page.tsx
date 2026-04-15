import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import { ChevronLeft, Heart } from "lucide-react";

export default async function StoreWishlistPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login?next=/store/account/wishlist");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6">
        <Link
          href="/store/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Account
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Heart className="h-4 w-4 text-muted-foreground" />
        </span>
        <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
      </div>

      {/* Empty state */}
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card py-16 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Heart className="h-8 w-8 text-muted-foreground" />
        </span>
        <h2 className="text-lg font-semibold text-foreground">Nothing saved yet</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tap the heart on any product to save it here. Full sync coming in a future update.
        </p>
        <Link
          href="/store/products"
          className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
