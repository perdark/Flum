/**
 * Dashboard Layout
 *
 * Wraps all dashboard pages with sidebar and header
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";

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
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar userRole={user.role} />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Dashboard</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-200">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>

              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                <span className="text-slate-300 font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
