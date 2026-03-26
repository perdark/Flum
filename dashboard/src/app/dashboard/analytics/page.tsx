/**
 * Analytics Dashboard Page
 *
 * Shows revenue, orders, products stats, and sales charts
 */

import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Analytics</h1>

      <Suspense fallback={<div className="text-muted-foreground">Loading analytics...</div>}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
