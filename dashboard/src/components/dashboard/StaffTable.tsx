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
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading staff: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-slate-800">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                      <span className="text-slate-300 font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-white">{member.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">{member.email}</td>
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
                        ? "bg-green-950 text-green-400 border border-green-900"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {member.lastLoginAt
                    ? new Date(member.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
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
