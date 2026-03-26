"use client";

/**
 * Inventory Header Component
 *
 * Page title and action buttons
 */

import { useState } from "react";
import Link from "next/link";
import { AddInventoryModal } from "./AddInventoryModal";

export function InventoryHeader() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/inventory/templates"
            className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-secondary"
          >
            Manage Templates
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Add Inventory
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddInventoryModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}
