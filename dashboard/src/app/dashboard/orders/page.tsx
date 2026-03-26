import { Suspense } from "react";
import { OrdersTable } from "@/components/dashboard/OrdersTable";

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Orders</h1>
      <Suspense fallback={<div className="text-muted-foreground">Loading orders...</div>}>
        <OrdersTable />
      </Suspense>
    </div>
  );
}
