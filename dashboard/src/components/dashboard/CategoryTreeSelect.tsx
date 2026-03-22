/**
 * Category Tree Select Component
 *
 * Tree multi-select for choosing categories
 */

"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: Category[];
}

interface CategoryTreeSelectProps {
  value: string[]; // Array of selected category IDs
  onChange: (categoryIds: string[]) => void;
  disabled?: boolean;
}

export function CategoryTreeSelect({ value, onChange, disabled = false }: CategoryTreeSelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories?asTree=true");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        // Auto-expand root nodes
        const rootIds = data.data
          .filter((c: Category) => !c.parentId)
          .map((c: Category) => c.id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const toggleSelection = (categoryId: string) => {
    if (disabled) return;

    if (value.includes(categoryId)) {
      onChange(value.filter((id) => id !== categoryId));
    } else {
      onChange([...value, categoryId]);
    }
  };

  const isNodeSelected = (node: Category): boolean => {
    if (value.includes(node.id)) return true;
    // Check if any descendant is selected
    for (const child of node.children || []) {
      if (isNodeSelected(child)) return true;
    }
    return false;
  };

  const isPartiallySelected = (node: Category): boolean => {
    if (value.includes(node.id)) return true;
    // Check if any descendant is selected
    for (const child of node.children || []) {
      if (isPartiallySelected(child)) return true;
    }
    return false;
  };

  const renderNode = (node: Category, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = value.includes(node.id);
    const isPartially = !isSelected && isPartiallySelected(node);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1.5 px-2 rounded hover:bg-slate-700/50 ${
            isSelected ? "bg-blue-900/30" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-slate-600 rounded transition-colors"
            >
              <svg
                className={`w-3 h-3 text-slate-400 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Checkbox */}
          <button
            type="button"
            onClick={() => toggleSelection(node.id)}
            disabled={disabled}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              disabled
                ? "bg-slate-700 cursor-not-allowed"
                : isSelected
                ? "bg-blue-600 border-blue-500"
                : isPartially
                ? "bg-blue-600/50 border-blue-500"
                : "bg-slate-700 border-slate-600 hover:border-slate-500"
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {(isPartially || !isSelected) && !disabled && (
              <div
                className={`w-2 h-2 rounded-sm ${
                  isPartially ? "bg-white" : "bg-transparent"
                }`}
              />
            )}
          </button>

          {/* Category Name */}
          <span
            className={`text-sm flex-1 truncate ${
              !node.isActive ? "text-slate-500 line-through" : "text-white"
            }`}
          >
            {node.name}
          </span>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get selected category info
  const getSelectedCategories = (nodes: Category[]): Category[] => {
    const result: Category[] = [];
    for (const node of nodes) {
      if (value.includes(node.id)) {
        result.push(node);
      }
      if (node.children) {
        result.push(...getSelectedCategories(node.children));
      }
    }
    return result;
  };

  const selectedCategories = getSelectedCategories(categories);

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900">
      {/* Selected categories chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-slate-700">
          {selectedCategories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 text-sm rounded"
            >
              {c.name}
              {!disabled && (
                <button
                  onClick={() => toggleSelection(c.id)}
                  className="hover:text-red-300"
                  type="button"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Category tree */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center text-slate-400 py-4">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-400 py-4">
            No categories available.{" "}
            <a href="/dashboard/categories" className="text-blue-400 hover:underline">
              Create categories first
            </a>
          </div>
        ) : (
          <div>
            {categories.map((node) => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
