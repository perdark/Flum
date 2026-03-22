"use client";

/**
 * Coupons Dashboard Page
 *
 * List and manage discount coupons
 */

import { useState } from "react";
import { CouponsTable } from "@/components/dashboard/CouponsTable";
import { AddCouponModal } from "@/components/dashboard/AddCouponModal";

export default function CouponsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCouponAdded = () => {
    setShowAddModal(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Coupons</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Coupon
        </button>
      </div>

      <CouponsTable key={refreshKey} />

      {showAddModal && (
        <AddCouponModal onClose={() => setShowAddModal(false)} onAdded={handleCouponAdded} />
      )}
    </div>
  );
}
