import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <PackageSearch className="h-10 w-10 text-muted-foreground" />
      </span>
      <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
      <p className="mt-2 text-muted-foreground">
        This product does not exist or has been removed from the store.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/store/products"
          className="inline-flex items-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse products
        </Link>
        <Link
          href="/store"
          className="inline-flex items-center rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
