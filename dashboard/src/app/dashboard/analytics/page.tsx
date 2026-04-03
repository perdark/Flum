/**
 * Analytics Dashboard Page
 *
 * Shows revenue, orders, products stats, and sales charts
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getEffectivePermissions } from "@/lib/auth";
import { PERMISSIONS } from "@/types";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (
    user.role === "staff" &&
    !getEffectivePermissions(user).includes(PERMISSIONS.VIEW_ANALYTICS)
  ) {
    redirect("/dashboard/inventory");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Analytics</h1>

      <Suspense fallback={<div className="text-muted-foreground">Loading analytics...</div>}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
