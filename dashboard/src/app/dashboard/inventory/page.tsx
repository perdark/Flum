/**
 * Inventory Dashboard Page
 *
 * List and manage inventory items
 */

import { Suspense } from "react";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { InventoryHeader } from "@/components/dashboard/InventoryHeader";

export default function InventoryPage() {
  return (
    <div>
      <InventoryHeader />

      <Suspense fallback={<div>Loading inventory...</div>}>
        <InventoryTable />
      </Suspense>
    </div>
  );
}
