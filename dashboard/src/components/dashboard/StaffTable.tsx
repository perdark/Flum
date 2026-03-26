"use client";

/**
 * Staff Table Component
 *
 * Displays list of staff/admin accounts
 */

import { useEffect, useState } from "react";

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function StaffTable() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const response = await fetch("/api/staff");
        const result = await response.json();

        if (result.success) {
          setStaff(result.data);
        } else {
          setError(result.error || "Failed to load staff");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-lg">
        Error loading staff: {error}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-muted">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-foreground font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{member.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-foreground">{member.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      member.role === "admin"
                        ? "bg-purple-950 text-purple-400 border border-purple-900"
                        : "bg-blue-950 text-blue-400 border border-blue-900"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      member.isActive
                        ? "bg-success/10 text-success border border-success/30"
                        : "bg-secondary text-muted-foreground border border-input"
                    }`}
                  >
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {member.lastLoginAt
                    ? new Date(member.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
