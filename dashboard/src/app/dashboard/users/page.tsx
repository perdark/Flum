/**
 * Users Dashboard Page
 *
 * View customer information (derived from orders)
 */

import { Suspense } from "react";

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Customers</h1>

      <Suspense fallback={<div className="text-slate-400">Loading customers...</div>}>
        <div className="bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-800">
          <p className="text-slate-400">
            Customer information is derived from order history. This page will show
            customer list with their order counts, total spent, and recent activity.
          </p>
          <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-500">
              Implementation note: Query orders table to get unique customers,
              aggregate their orders, and display in a table.
            </p>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
