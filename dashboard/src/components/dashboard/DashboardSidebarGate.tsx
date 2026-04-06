"use client";

import dynamic from "next/dynamic";
import type { Permission } from "@/types";

function SidebarLoading() {
  return (
    <aside
      className="w-64 shrink-0 bg-gradient-to-b from-sidebar via-sidebar to-muted/20 border-r border-border min-h-screen p-4 animate-pulse"
      aria-hidden
    >
      <div className="h-10 w-32 rounded-lg bg-muted mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-muted/60" />
        ))}
      </div>
    </aside>
  );
}

const SidebarClient = dynamic(
  () => import("@/components/dashboard/Sidebar").then((m) => m.Sidebar),
  { ssr: false, loading: () => <SidebarLoading /> }
);

export function DashboardSidebarGate(props: {
  userRole: "admin" | "staff";
  permissions: Permission[];
}) {
  return <SidebarClient {...props} />;
}
