import { redirect } from "next/navigation";
import { getStoreCustomer } from "@/lib/customer-auth";

export default async function InvoicesPage() {
  const customer = await getStoreCustomer();
  if (!customer) redirect("/store/login");
  if (customer.type !== "merchant") redirect("/store/account");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Invoice PDFs and payment history will appear here when billing is connected.
      </p>
    </div>
  );
}
