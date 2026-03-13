"use client";

/**
 * Coupons Table Component
 *
 * Displays list of discount coupons
 */

import { useEffect, useState } from "react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minPurchase: string;
  usageLimit: number | null;
  usageCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export function CouponsTable() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const response = await fetch("/api/coupons");
        const result = await response.json();

        if (result.success) {
          setCoupons(result.data);
        } else {
          setError(result.error || "Failed to load coupons");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchCoupons();
  }, []);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount || "0"));
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-800">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading coupons: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Min Purchase
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Validity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-slate-800">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-mono font-bold text-white text-lg">
                      {coupon.code}
                    </p>
                    {coupon.description && (
                      <p className="text-sm text-slate-500">
                        {coupon.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-white">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : formatCurrency(coupon.discountValue)}
                  </span>
                  {coupon.discountType === "percentage" && (
                    <span className="text-xs text-slate-500 ml-1">off</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {formatCurrency(coupon.minPurchase)}
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-300">
                    {coupon.usageCount}
                    {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                  </p>
                  {coupon.usageLimit && coupon.usageCount >= coupon.usageLimit && (
                    <span className="text-xs text-red-400">Max reached</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  <p>{new Date(coupon.validFrom).toLocaleDateString()}</p>
                  {coupon.validUntil && (
                    <p className={isExpired(coupon.validUntil) ? "text-red-400" : ""}>
                      to {new Date(coupon.validUntil).toLocaleDateString()}
                      {isExpired(coupon.validUntil) && " (expired)"}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      coupon.isActive && !isExpired(coupon.validUntil)
                        ? "bg-green-950 text-green-400 border border-green-900"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
