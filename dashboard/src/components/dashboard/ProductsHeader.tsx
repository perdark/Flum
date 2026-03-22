/**
 * Products Header Component
 *
 * Page title and add product button
 */

import Link from "next/link";

export function ProductsHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-white">Products</h1>
      <Link
        href="/dashboard/products/new"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Add Product
      </Link>
    </div>
  );
}
