/**
 * Platform Tree Select Component
 *
 * Tree multi-select for choosing platforms
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

interface PlatformTreeSelectProps {
  value: string[]; // Array of selected platform IDs
  onChange: (platformIds: string[]) => void;
  disabled?: boolean;
}

export function PlatformTreeSelect({ value, onChange, disabled = false }: PlatformTreeSelectProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch("/api/platforms?asTree=true");
      const data = await res.json();
      if (data.success) {
        setPlatforms(data.data);
        // Auto-expand root nodes
        const rootIds = data.data
          .filter((p: Platform) => !p.parentId)
          .map((p: Platform) => p.id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (err) {
      console.error("Failed to load platforms", err);
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

  const toggleSelection = (platformId: string) => {
    if (disabled) return;

    if (value.includes(platformId)) {
      onChange(value.filter((id) => id !== platformId));
    } else {
      onChange([...value, platformId]);
    }
  };

  const isNodeSelected = (node: Platform): boolean => {
    if (value.includes(node.id)) return true;
    // Check if any descendant is selected
    for (const child of node.children || []) {
      if (isNodeSelected(child)) return true;
    }
    return false;
  };

  const isPartiallySelected = (node: Platform): boolean => {
    if (value.includes(node.id)) return true;
    // Check if any descendant is selected
    for (const child of node.children || []) {
      if (isPartiallySelected(child)) return true;
    }
    return false;
  };

  const renderNode = (node: Platform, depth: number = 0): React.ReactNode => {
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

          {/* Platform Name */}
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

  // Get selected platform info
  const getSelectedPlatforms = (nodes: Platform[]): Platform[] => {
    const result: Platform[] = [];
    for (const node of nodes) {
      if (value.includes(node.id)) {
        result.push(node);
      }
      if (node.children) {
        result.push(...getSelectedPlatforms(node.children));
      }
    }
    return result;
  };

  const selectedPlatforms = getSelectedPlatforms(platforms);

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900">
      {/* Selected platforms chips */}
      {selectedPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-slate-700">
          {selectedPlatforms.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 text-sm rounded"
            >
              {p.name}
              {!disabled && (
                <button
                  onClick={() => toggleSelection(p.id)}
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

      {/* Platform tree */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center text-slate-400 py-4">Loading platforms...</div>
        ) : platforms.length === 0 ? (
          <div className="text-center text-slate-400 py-4">
            No platforms available.{" "}
            <a href="/dashboard/platforms" className="text-blue-400 hover:underline">
              Create platforms first
            </a>
          </div>
        ) : (
          <div>
            {platforms.map((node) => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
