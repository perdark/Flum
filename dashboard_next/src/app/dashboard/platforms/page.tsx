/**
 * Platforms Management Page
 *
 * Global platform hierarchy management with tree view
 */

"use client";

import { useState, useEffect } from "react";
import { PlatformsTree } from "@/components/dashboard/PlatformsTree";
import { PlatformModal } from "@/components/dashboard/PlatformModal";

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

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/platforms?asTree=true");
      const data = await res.json();

      if (data.success) {
        setPlatforms(data.data);
      } else {
        setError(data.error || "Failed to load platforms");
      }
    } catch (err) {
      setError("Failed to load platforms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleCreate = (parentId: string | null = null) => {
    setEditingPlatform(null);
    setModalOpen(true);
  };

  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this platform?")) return;

    try {
      const res = await fetch(`/api/platforms/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchPlatforms();
      } else {
        alert(data.error || "Failed to delete platform");
      }
    } catch (err) {
      alert("Failed to delete platform");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingPlatform(null);
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
      const url = editingPlatform
        ? `/api/platforms/${editingPlatform.id}`
        : "/api/platforms";
      const method = editingPlatform ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        fetchPlatforms();
        handleModalClose();
      } else {
        alert(result.error || "Failed to save platform");
      }
    } catch (err) {
      alert("Failed to save platform");
    }
  };

  // Filter platforms by search query
  const filterPlatforms = (platforms: Platform[]): Platform[] => {
    return platforms
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((p) => ({
        ...p,
        children: filterPlatforms(p.children),
      }))
      .filter((p) => {
        // Keep if matches or has matching children
        return (
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.children.length > 0
        );
      });
  };

  const filteredPlatforms = searchQuery ? filterPlatforms(platforms) : platforms;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Platforms</h1>
          <p className="text-slate-400 mt-1">
            Manage global platform hierarchy
          </p>
        </div>
        <button
          onClick={() => handleCreate(null)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Add Root Platform
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search platforms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading platforms...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : filteredPlatforms.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {searchQuery ? "No platforms found matching your search." : "No platforms yet. Create your first platform!"}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <PlatformsTree
            platforms={filteredPlatforms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddChild={handleCreate}
          />
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <PlatformModal
          platform={editingPlatform}
          platforms={platforms}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
