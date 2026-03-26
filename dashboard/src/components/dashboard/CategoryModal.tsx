/**
 * Category Modal Component
 *
 * Modal for creating/editing categories
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Category {
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
  children: Category[];
}

interface CategoryModalProps {
  category: Category | null;
  categories: Category[];
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

export function CategoryModal({
  category,
  categories,
  onClose,
  onSubmit,
}: CategoryModalProps) {
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
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setNameAr(category.nameAr || "");
      setDescription(category.description || "");
      setIcon(category.icon || "");
      setBanner(category.banner || "");
      setParentId(category.parentId);
      setSortOrder(category.sortOrder);
      setIsActive(category.isActive);
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
  }, [category]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!category || category.slug === generateSlug(category.name)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Flatten categories for parent selector
  const flattenCategories = (
    categories: Category[],
    prefix = ""
  ): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = [];

    for (const c of categories) {
      // Don't show current category or its descendants as parent options
      if (category && (c.id === category.id || isDescendant(c, category.id, categories))) {
        continue;
      }

      result.push({ id: c.id, name: prefix + c.name, depth: prefix.length / 2 });

      if (c.children && c.children.length > 0) {
        result.push(...flattenCategories(c.children, prefix + c.name + " / "));
      }
    }

    return result;
  };

  const isDescendant = (
    category: Category,
    targetId: string,
    allCategories: Category[]
  ): boolean => {
    if (category.id === targetId) return true;

    for (const child of category.children || []) {
      if (isDescendant(child, targetId, allCategories)) return true;
    }

    return false;
  };

  const flatCategories = flattenCategories(categories);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
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
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {category ? "Edit Category" : "Add Category"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Gaming, Software"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="gaming"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL-friendly identifier. Auto-generated from name if left empty.
            </p>
          </div>

          {/* Arabic Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Arabic Name (الاسم بالعربية)
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-right"
              placeholder="اسم الفئة"
              dir="rtl"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Category description..."
            />
          </div>

          {/* Icon URL */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Icon URL
            </label>
            <input
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Banner URL
            </label>
            <input
              type="url"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Parent Category
            </label>
            <select
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">None (Root Level)</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {"\u00A0".repeat(c.depth * 2)}{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
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
              className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="isActive" className="text-sm text-muted-foreground">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : category ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
