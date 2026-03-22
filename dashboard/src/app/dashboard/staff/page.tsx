"use client";

/**
 * Staff Dashboard Page
 *
 * List and manage staff accounts (admin only)
 */

import { useState } from "react";
import { StaffTable } from "@/components/dashboard/StaffTable";
import { AddStaffModal } from "@/components/dashboard/AddStaffModal";

export default function StaffPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStaffAdded = () => {
    setShowAddModal(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Staff Member
        </button>
      </div>

      <StaffTable key={refreshKey} />

      {showAddModal && (
        <AddStaffModal onClose={() => setShowAddModal(false)} onAdded={handleStaffAdded} />
      )}
    </div>
  );
}
