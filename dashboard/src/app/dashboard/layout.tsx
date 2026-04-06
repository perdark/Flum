import { redirect } from "next/navigation";
import { getCurrentUser, getEffectivePermissions } from "@/lib/auth";
import { DashboardSidebarGate } from "@/components/dashboard/DashboardSidebarGate";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const permissions = getEffectivePermissions(user);

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <DashboardSidebarGate
        userRole={user.role as "admin" | "staff"}
        permissions={permissions}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          userName={user.name}
          userRole={user.role ?? "staff"}
        />

        <main className="flex-1 p-4 sm:p-6 dashboard-main">{children}</main>
      </div>
    </div>
  );
}
