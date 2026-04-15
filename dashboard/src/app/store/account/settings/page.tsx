import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import { ChevronLeft, Settings, Mail, User } from "lucide-react";

export default async function AccountSettingsPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login?next=/store/account/settings");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
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
          <Settings className="h-4 w-4 text-muted-foreground" />
        </span>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Profile info */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Account info</h2>
        <dl className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{customer.email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <User className="h-4 w-4 text-muted-foreground" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {customer.name || "—"}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Coming soon notice */}
      <div className="mt-4 rounded-xl border border-border bg-card/50 px-4 py-3.5 text-sm text-muted-foreground">
        Profile editing and notification preferences will be available in a future update.
      </div>
    </div>
  );
}
