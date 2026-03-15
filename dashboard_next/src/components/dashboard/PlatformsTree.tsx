/**
 * Platforms Tree Component
 *
 * Recursive tree view for platform hierarchy
 */

"use client";

import { useState } from "react";

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

interface PlatformsTreeProps {
  platforms: Platform[];
  onEdit: (platform: Platform) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  level?: number;
}

export function PlatformsTree({
  platforms,
  onEdit,
  onDelete,
  onAddChild,
  level = 0,
}: PlatformsTreeProps) {
  return (
    <div>
      {platforms.map((platform) => (
        <PlatformTreeNode
          key={platform.id}
          platform={platform}
          level={level}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

interface PlatformTreeNodeProps {
  platform: Platform;
  level: number;
  onEdit: (platform: Platform) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function PlatformTreeNode({
  platform,
  level,
  onEdit,
  onDelete,
  onAddChild,
}: PlatformTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  const hasChildren = platform.children && platform.children.length > 0;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-700/50 transition-colors"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-slate-600 rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${
                expanded ? "rotate-90" : ""
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
        )}
        {!hasChildren && <div className="w-6" />}

        {/* Platform Name */}
        <span
          className={`flex-1 ${
            !platform.isActive ? "text-slate-500 line-through" : "text-white"
          }`}
        >
          {platform.name}
        </span>

        {/* Status Badge */}
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            platform.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          {platform.isActive ? "Active" : "Inactive"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(platform.id)}
            className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors"
            title="Add child platform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(platform)}
            className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(platform.id)}
            className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {platform.children.map((child) => (
            <PlatformTreeNode
              key={child.id}
              platform={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
