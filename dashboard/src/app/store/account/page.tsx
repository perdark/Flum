import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import {
  Package,
  Heart,
  Settings,
  Building2,
  FileText,
  CreditCard,
  ChevronRight,
  Bell,
} from "lucide-react";

export default async function AccountOverviewPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login?next=/store/account");

  const isMerchant = customer.type === "merchant";

  const links = [
    {
      href: "/store/account/orders",
      label: "Order history",
      sub: "View and track your past purchases",
      icon: Package,
    },
    {
      href: "/store/account/wishlist",
      label: "Wishlist",
      sub: "Your saved products",
      icon: Heart,
    },
    {
      href: "/store/account/notifications",
      label: "Price alerts",
      sub: "Manage product price drop notifications",
      icon: Bell,
    },
    {
      href: "/store/account/settings",
      label: "Settings",
      sub: "Account details and preferences",
      icon: Settings,
    },
  ];
  if (isMerchant) {
    links.push(
      {
        href: "/store/account/business",
        label: "Business profile",
        sub: "Manage your B2B info",
        icon: Building2,
      },
      {
        href: "/store/account/invoices",
        label: "Invoices",
        sub: "Download and review invoices",
        icon: FileText,
      },
      {
        href: "/store/account/credit",
        label: "Credit & terms",
        sub: "Your credit balance and payment terms",
        icon: CreditCard,
      },
    );
  }

  // Generate initials for avatar
  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : customer.email[0].toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {customer.name || "Customer"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
          {isMerchant && (
            <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Business account
            </span>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-secondary group"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
