/**
 * Categories Tree Component
 *
 * Recursive tree view for category hierarchy
 */

"use client";

import { useState } from "react";

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

interface CategoriesTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  level?: number;
}

export function CategoriesTree({
  categories,
  onEdit,
  onDelete,
  onAddChild,
  level = 0,
}: CategoriesTreeProps) {
  return (
    <div>
      {categories.map((category) => (
        <CategoryTreeNode
          key={category.id}
          category={category}
          level={level}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

interface CategoryTreeNodeProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function CategoryTreeNode({
  category,
  level,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent transition-colors group"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${
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

        {/* Icon */}
        {category.icon && (
          <img
            src={category.icon}
            alt={category.name}
            className="w-5 h-5 object-contain rounded"
          />
        )}
        {!category.icon && <div className="w-5" />}

        {/* Category Name */}
        <span
          className={`flex-1 ${
            !category.isActive ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {category.name}
        </span>

        {/* Arabic Name */}
        {category.nameAr && (
          <span className="text-sm text-muted-foreground" dir="rtl">
            {category.nameAr}
          </span>
        )}

        {/* Status Badge */}
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            category.isActive
              ? "bg-success/20 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {category.isActive ? "Active" : "Inactive"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(category.id)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Add child category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1.5 hover:bg-red-500/20 rounded text-muted-foreground hover:text-destructive transition-colors"
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
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
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
