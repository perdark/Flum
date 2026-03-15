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
  slug: string;
  nameAr: string | null;
  description: string | null;
  icon: string | null;
  banner: string | null;
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
    slug?: string;
    nameAr?: string;
    description?: string;
    icon?: string;
    banner?: string;
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
  const [slug, setSlug] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [banner, setBanner] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (platform) {
      setName(platform.name);
      setSlug(platform.slug);
      setNameAr(platform.nameAr || "");
      setDescription(platform.description || "");
      setIcon(platform.icon || "");
      setBanner(platform.banner || "");
      setParentId(platform.parentId);
      setSortOrder(platform.sortOrder);
      setIsActive(platform.isActive);
    } else {
      setName("");
      setSlug("");
      setNameAr("");
      setDescription("");
      setIcon("");
      setBanner("");
      setParentId(null);
      setSortOrder(0);
      setIsActive(true);
    }
  }, [platform]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!platform || platform.slug === generateSlug(platform.name)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

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
      slug: slug.trim() || undefined,
      nameAr: nameAr.trim() || undefined,
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      banner: banner.trim() || undefined,
      parentId,
      sortOrder,
      isActive,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
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
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Steam, PlayStation"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="steam"
            />
            <p className="text-xs text-slate-500 mt-1">
              URL-friendly identifier. Auto-generated from name if left empty.
            </p>
          </div>

          {/* Arabic Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Arabic Name (الاسم بالعربية)
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              placeholder="اسم المنصة"
              dir="rtl"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Platform description..."
            />
          </div>

          {/* Icon URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Icon URL
            </label>
            <input
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/icon.png"
            />
            {icon && (
              <div className="mt-2">
                <img src={icon} alt="Icon preview" className="h-12 w-12 object-contain rounded" />
              </div>
            )}
          </div>

          {/* Banner URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Banner URL
            </label>
            <input
              type="url"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/banner.png"
            />
            {banner && (
              <div className="mt-2">
                <img src={banner} alt="Banner preview" className="h-20 w-full object-cover rounded" />
              </div>
            )}
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
