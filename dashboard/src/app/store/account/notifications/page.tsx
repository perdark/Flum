import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";
import { NotificationsList } from "./NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login?next=/store/account/notifications");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Price alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll flag any of your tracked products whose price has dropped since you subscribed.
        </p>
      </header>

      <NotificationsList />
    </div>
  );
}
