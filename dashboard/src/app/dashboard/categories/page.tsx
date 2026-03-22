/**
 * Categories Management Page
 *
 * Global category hierarchy management with tree view
 */

"use client";

import { useState, useEffect } from "react";
import { CategoriesTree } from "@/components/dashboard/CategoriesTree";
import { CategoryModal } from "@/components/dashboard/CategoryModal";

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories?asTree=true");
      const data = await res.json();

      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || "Failed to load categories");
      }
    } catch (err) {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = (parentId: string | null = null) => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error || "Failed to delete category");
      }
    } catch (err) {
      alert("Failed to delete category");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleModalSubmit = async (data: {
    name: string;
    slug?: string;
    nameAr?: string;
    description?: string;
    icon?: string;
    banner?: string;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) => {
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        fetchCategories();
        handleModalClose();
      } else {
        alert(result.error || "Failed to save category");
      }
    } catch (err) {
      alert("Failed to save category");
    }
  };

  // Filter categories by search query
  const filterCategories = (categories: Category[]): Category[] => {
    return categories
      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((c) => ({
        ...c,
        children: filterCategories(c.children),
      }))
      .filter((c) => {
        // Keep if matches or has matching children
        return (
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.children.length > 0
        );
      });
  };

  const filteredCategories = searchQuery ? filterCategories(categories) : categories;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-slate-400 mt-1">
            Manage global category hierarchy
          </p>
        </div>
        <button
          onClick={() => handleCreate(null)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Add Root Category
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading categories...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {searchQuery ? "No categories found matching your search." : "No categories yet. Create your first category!"}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <CategoriesTree
            categories={filteredCategories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddChild={handleCreate}
          />
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          categories={categories}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
