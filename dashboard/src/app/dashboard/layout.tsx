/**
 * Dashboard Layout for Fulmen Empire Admin
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
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {typeof window !== "undefined" && document.location.pathname === "/dashboard"
                  ? "Overview"
                  : "Dashboard"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Welcome back, {user.name}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-slate-400 hover:text-amber-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
              </button>

              {/* User info */}
              <div className="text-right">
                <p className="text-sm font-medium text-slate-200">{user.name}</p>
                <p className="text-xs text-amber-400 capitalize">{user.role}</p>
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-white font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Logout */}
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
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
