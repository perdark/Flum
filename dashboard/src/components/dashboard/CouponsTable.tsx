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
      <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-lg">
        Error loading coupons: {error}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Min Purchase
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Validity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-muted">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-mono font-bold text-foreground text-lg">
                      {coupon.code}
                    </p>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground">
                        {coupon.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-foreground">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : formatCurrency(coupon.discountValue)}
                  </span>
                  {coupon.discountType === "percentage" && (
                    <span className="text-xs text-muted-foreground ml-1">off</span>
                  )}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {formatCurrency(coupon.minPurchase)}
                </td>
                <td className="px-6 py-4">
                  <p className="text-muted-foreground">
                    {coupon.usageCount}
                    {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                  </p>
                  {coupon.usageLimit && coupon.usageCount >= coupon.usageLimit && (
                    <span className="text-xs text-destructive">Max reached</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <p>{new Date(coupon.validFrom).toLocaleDateString()}</p>
                  {coupon.validUntil && (
                    <p className={isExpired(coupon.validUntil) ? "text-destructive" : ""}>
                      to {new Date(coupon.validUntil).toLocaleDateString()}
                      {isExpired(coupon.validUntil) && " (expired)"}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      coupon.isActive && !isExpired(coupon.validUntil)
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-muted text-muted-foreground border border-border"
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
