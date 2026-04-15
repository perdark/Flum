import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";

export default async function CreditPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login");
  if (customer.type !== "merchant") redirect("/store/account");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Credit & terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Net terms and credit limits are assigned by your account manager. No balance shown yet.
      </p>
    </div>
  );
}
