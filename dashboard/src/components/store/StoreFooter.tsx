import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { Facebook, Twitter, Instagram, ShieldCheck, Lock } from "lucide-react";

interface StoreFooterProps {
  storeName?: string;
  description?: string | null;
  contactEmail?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  storeUrl?: string | null;
  defaultLanguage?: string;
}

function VisaMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 32"
      role="img"
      aria-label="Visa"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path
        d="M20.2 11.3l-2.1 10.1h-2.7l2.1-10.1h2.7zm12.8 6.5c0-1.6-.9-2.8-2.8-2.8-1.4 0-2.4.7-2.8 1.7l2.5 1.2c.6-1.1 1.1-1.4 1.8-1.4.8 0 1.3.4 1.3 1.2v.3l-2.4.1c-2.2.1-3.4 1.1-3.4 2.8 0 1.4 1 2.3 2.4 2.3 1 0 1.9-.4 2.4-1.1v.9h2.4l1.1-5.2c.1-.5.1-1 .1-1.4zm-2.5 2.6c0 1.1-.7 1.8-1.8 1.8-.6 0-1-.3-1-.8 0-.7.6-1.1 1.8-1.2l1-.1v.3zM17 11.3l-3.3 6.9-1.4-7.5c-.2-.9-.8-1.4-1.9-1.4h-3.5l-.1.6c1.1.3 2.3.8 3 1.4l2.6 9.1h2.8l4.1-10.1H17z"
        fill="#fff"
      />
    </svg>
  );
}

export function StoreFooter({
  storeName = "Store",
  description,
  contactEmail,
  supportEmail,
  supportPhone,
  storeUrl,
  defaultLanguage = "en",
}: StoreFooterProps) {
  const year = new Date().getFullYear();
  const socialHref = storeUrl?.startsWith("http")
    ? storeUrl.replace(/\/$/, "")
    : supportEmail || contactEmail
      ? `mailto:${(supportEmail || contactEmail)!}`
      : "/store";

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo + social */}
          <div className="space-y-4">
            <Logo href="/store" variant="compact" />
            {description && (
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
            <div className="flex items-center gap-2">
              <a
                href={socialHref}
                target={socialHref.startsWith("http") ? "_blank" : undefined}
                rel={socialHref.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                aria-label="Contact on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href={socialHref}
                target={socialHref.startsWith("http") ? "_blank" : undefined}
                rel={socialHref.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                aria-label="Contact on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={socialHref}
                target={socialHref.startsWith("http") ? "_blank" : undefined}
                rel={socialHref.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                aria-label="Contact on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Products
            </h3>
            <nav className="space-y-2.5">
              <Link
                href="/store/products"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                All products
              </Link>
              <Link
                href="/store/products?bundle=1"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Bundles
              </Link>
              <Link
                href="/store/products?deals=1"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Flash deals
              </Link>
              <Link
                href="/store/products?new=true"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                New arrivals
              </Link>
            </nav>
          </div>

          {/* Customer service */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Customer service
            </h3>
            <nav className="space-y-2.5">
              <Link
                href="/store/products"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Help & FAQ
              </Link>
              <span className="block text-sm text-muted-foreground">Instant digital delivery</span>
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {supportEmail}
                </a>
              )}
              {supportPhone && (
                <a
                  href={`tel:${supportPhone.replace(/\s/g, "")}`}
                  className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {supportPhone}
                </a>
              )}
              {!supportEmail && contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {contactEmail}
                </a>
              )}
            </nav>
          </div>

          {/* My account */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              My account
            </h3>
            <nav className="space-y-2.5">
              <Link
                href="/store/account"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/store/account/orders"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Orders
              </Link>
              <Link
                href="/store/account/wishlist"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Wishlist
              </Link>
              <Link
                href="/store/login"
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </nav>
          </div>
        </div>

        {/* Trust & payments */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
              <span className="text-[11px] font-bold tracking-wide text-primary">ZainCash</span>
            </span>
            <VisaMark className="h-8 w-12 shrink-0" aria-label="Visa" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Secure checkout
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Encrypted payments
            </span>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-border bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            &copy; {year} {storeName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Lang: <span className="text-foreground">{defaultLanguage.toUpperCase()}</span>
            </span>
            <CurrencySelector inline className="!block" />
          </div>
        </div>
      </div>
    </footer>
  );
}
