/**
 * Products Dashboard Page
 *
 * List and manage products
 */

import { Suspense } from "react";
import { ProductsTable } from "@/components/dashboard/ProductsTable";
import { ProductsHeader } from "@/components/dashboard/ProductsHeader";

export default function ProductsPage() {
  return (
    <div>
      <ProductsHeader />

      <Suspense fallback={<div>Loading products...</div>}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}
