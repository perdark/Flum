import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
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

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar userRole={user.role as "admin" | "staff"} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader userName={user.name} userRole={user.role} />

        <main className="flex-1 p-4 sm:p-6 dashboard-main">{children}</main>
      </div>
    </div>
  );
}
