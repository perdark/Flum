/**
 * Dashboard Home Page
 *
 * Redirects to analytics by default
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/dashboard/analytics");
}
