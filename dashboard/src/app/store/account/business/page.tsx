import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";

export default async function BusinessAccountPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login");
  if (customer.type !== "merchant") redirect("/store/account");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Business profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {customer.businessName || "No business name on file"} — tax IDs and purchasing contacts
        can be managed from the dashboard invitation flow.
      </p>
    </div>
  );
}
