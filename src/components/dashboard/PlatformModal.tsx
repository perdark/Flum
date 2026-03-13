/**
 * Platform Modal Component
 *
 * Modal for creating/editing platforms
 */

"use client";

import { useState, useEffect } from "react";

interface Platform {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: Platform[];
}

interface PlatformModalProps {
  platform: Platform | null;
  platforms: Platform[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) => void;
}

export function PlatformModal({
  platform,
  platforms,
  onClose,
  onSubmit,
}: PlatformModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (platform) {
      setName(platform.name);
      setParentId(platform.parentId);
      setSortOrder(platform.sortOrder);
      setIsActive(platform.isActive);
    } else {
      setName("");
      setParentId(null);
      setSortOrder(0);
      setIsActive(true);
    }
  }, [platform]);

  // Flatten platforms for parent selector
  const flattenPlatforms = (
    platforms: Platform[],
    prefix = ""
  ): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = [];

    for (const p of platforms) {
      // Don't show current platform or its descendants as parent options
      if (platform && (p.id === platform.id || isDescendant(p, platform.id, platforms))) {
        continue;
      }

      result.push({ id: p.id, name: prefix + p.name, depth: prefix.length / 2 });

      if (p.children && p.children.length > 0) {
        result.push(...flattenPlatforms(p.children, prefix + p.name + " / "));
      }
    }

    return result;
  };

  const isDescendant = (
    platform: Platform,
    targetId: string,
    allPlatforms: Platform[]
  ): boolean => {
    if (platform.id === targetId) return true;

    for (const child of platform.children || []) {
      if (isDescendant(child, targetId, allPlatforms)) return true;
    }

    return false;
  };

  const flatPlatforms = flattenPlatforms(platforms);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      parentId,
      sortOrder,
      isActive,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          {platform ? "Edit Platform" : "Add Platform"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Steam, PlayStation"
              required
            />
          </div>

          {/* Parent */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Parent Platform
            </label>
            <select
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Root Level)</option>
              {flatPlatforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {"\u00A0".repeat(p.depth * 2)}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-300">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : platform ? "Save Changes" : "Create Platform"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
