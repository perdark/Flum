"use client";

/**
 * Inventory Units Management Page
 *
 * View and manage multi-sell inventory units for a product.
 * Shows each physical unit, its sales count, cooldown status, and allows resetting cooldowns.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface InventoryUnit {
  id: string;
  productId: string;
  physicalUnitId: string;
  saleCount: number;
  maxSales: number;
  cooldownUntil: Date | null;
  cooldownDurationHours: number;
  status: "available" | "in_cooldown" | "exhausted";
  lastSaleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  name: string;
  multiSellEnabled: boolean;
  multiSellFactor: number;
  cooldownEnabled: boolean;
  currentStock: number;
}

export default function InventoryUnitsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch product details
      const productRes = await fetch(`/api/products/${productId}`);
      const productResult = await productRes.json();

      // Fetch inventory units
      const unitsRes = await fetch(`/api/inventory/units?productId=${productId}`);
      const unitsResult = await unitsRes.json();

      if (productResult.success) {
        setProduct(productResult.data);
      }
      if (unitsResult.success) {
        setUnits(unitsResult.data);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const resetCooldown = async (unitId: string) => {
    setActionLoading(unitId);
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/cooldown`, {
        method: "POST",
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        setError(result.error || "Failed to reset cooldown");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const getCooldownDisplay = (cooldownUntil: Date | null): string | null => {
    if (!cooldownUntil || new Date(cooldownUntil) < new Date()) {
      return null;
    }
    const now = Date.now();
    const cooldownTime = new Date(cooldownUntil).getTime();
    const diffMs = cooldownTime - now;

    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.ceil(diffMs / (1000 * 60));
      return `${minutes} min`;
    }
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  };

  const getStatusBadge = (unit: InventoryUnit) => {
    switch (unit.status) {
      case "available":
        return <span className="px-2 py-1 text-xs bg-green-950 text-green-400 rounded border border-green-900">Available</span>;
      case "in_cooldown":
        return <span className="px-2 py-1 text-xs bg-yellow-950 text-yellow-400 rounded border border-yellow-900">In Cooldown</span>;
      case "exhausted":
        return <span className="px-2 py-1 text-xs bg-red-950 text-red-400 rounded border border-red-900">Exhausted</span>;
    }
  };

  // Calculate virtual stock
  const virtualStock = units.reduce((sum, unit) => {
    const remaining = unit.maxSales - unit.saleCount;
    return sum + (unit.status !== "exhausted" && remaining > 0 ? remaining : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
        Product not found
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1"
        >
          ← Back to Product
        </button>
        <h1 className="text-2xl font-bold text-white">Inventory Units</h1>
        <p className="text-slate-400">
          {product.name} {product.multiSellEnabled && `(Multi-Sell: ${product.multiSellFactor}x)`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
          {error}
        </div>
      )}

      {!product.multiSellEnabled ? (
        <div className="p-4 bg-yellow-950/50 text-yellow-400 border border-yellow-900 rounded-lg">
          This product does not have multi-sell enabled. Go to product settings to enable it.
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-500">Physical Units</p>
              <p className="text-2xl font-bold text-white">{units.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-500">Virtual Stock</p>
              <p className="text-2xl font-bold text-blue-400">{virtualStock}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-500">Available</p>
              <p className="text-2xl font-bold text-green-400">
                {units.filter((u) => u.status === "available").length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-500">In Cooldown</p>
              <p className="text-2xl font-bold text-yellow-400">
                {units.filter((u) => u.status === "in_cooldown").length}
              </p>
            </div>
          </div>

          {/* Units Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Unit ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Sales</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cooldown</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Sale</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No inventory units found. Create units to enable multi-sell for this product.
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-slate-300">{unit.physicalUnitId}</div>
                          <div className="text-xs text-slate-500">{unit.id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{unit.saleCount}</span>
                            <span className="text-slate-500">/ {unit.maxSales}</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${(unit.saleCount / unit.maxSales) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {unit.maxSales - unit.saleCount} remaining
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(unit)}</td>
                        <td className="px-4 py-3">
                          {unit.status === "in_cooldown" ? (
                            <span className="text-yellow-400">
                              {getCooldownDisplay(unit.cooldownUntil)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {unit.lastSaleAt
                            ? new Date(unit.lastSaleAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {unit.status === "in_cooldown" && (
                            <button
                              onClick={() => resetCooldown(unit.id)}
                              disabled={actionLoading === unit.id}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {actionLoading === unit.id ? "..." : "Reset"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Units Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => router.push(`/dashboard/products/${productId}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Product Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}
