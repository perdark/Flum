/**
 * Activity Logs Dashboard Page
 *
 * View audit trail of all actions
 */

import { ActivityLogsTable } from "@/components/dashboard/ActivityLogsTable";

export default function ActivityLogsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Activity Logs</h1>

      <ActivityLogsTable />
    </div>
  );
}
