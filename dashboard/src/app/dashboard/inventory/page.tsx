"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Package,
  Clock,
  Box,
  Edit,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Eye,
  Store,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean" | "group" | "multiline";
  required: boolean;
  label: string;
  isVisibleToAdmin: boolean;
  isVisibleToMerchant: boolean;
  isVisibleToCustomer: boolean;
  repeatable: boolean;
  parentId: string | null;
  displayOrder: number;
  linkedTo: string | null;
  linkGroup: string | null;
  eachLineIsProduct?: boolean;
}

interface CatalogItemSummary {
  id: string;
  name: string;
  sortOrder: number;
  stockCount: number;
  codesCount: number;
  definingValues?: Record<string, string | number | boolean> | null;
  defaultValues?: Record<string, string | number | boolean> | null;
}

interface StorefrontProductSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface TemplateWithStock {
  id: string;
  name: string;
  description: string | null;
  fieldsSchema: FieldSchema[];
  isActive: boolean;
  multiSellEnabled: boolean;
  multiSellMax: number;
  cooldownEnabled: boolean;
  cooldownDurationHours: number;
  color: string | null;
  icon: string | null;
  stockCount: number;
  /** Sum of atomic values across template fields (multiline/array aware) */
  codesCount?: number;
  /** Stock rows / codes not linked to an inventory product */
  unassignedStockCount?: number;
  unassignedCodesCount?: number;
  /** Internal SKUs under this template (optional) */
  catalogItems?: CatalogItemSummary[];
  /** Storefront products using this inventory template */
  storefrontProducts?: StorefrontProductSummary[];
  createdAt: string;
}

// ============================================================================
// Main Inventory Page — Template-centric
// ============================================================================

export default function InventoryPage() {
  const [templates, setTemplates] = useState<TemplateWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Which template is expanded (shows fields underneath)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithStock | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      } else {
        toast.error(data.error || "Failed to load templates");
      }
    } catch {
      toast.error("Network error loading templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Template toggle ───────────────────────────────────────────────────────

  const toggleTemplate = (template: TemplateWithStock) => {
    if (expandedTemplateId === template.id) {
      setExpandedTemplateId(null);
    } else {
      setExpandedTemplateId(template.id);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredTemplates = search.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : templates;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Templates define fields only. Add or edit stock and codes from{" "}
            <Link href="/dashboard/inventory/products" className="text-primary font-medium hover:underline">
              Inventory products
            </Link>
            . {templates.length} template{templates.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchTemplates(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/inventory/products">Add SKU stock</Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setShowCreateTemplate(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          aria-label="Search inventory templates"
          className="w-full pl-10 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div className="bg-background border border-border rounded-xl p-12 text-center">
          <Box className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-4">No inventory templates yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create a template to define the structure of your stock (fields, multi-sell, etc).
          </p>
          <Button onClick={() => setShowCreateTemplate(true)}>
            Create Your First Template
          </Button>
        </div>
      )}

      {/* Template Grid — 4 columns */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            const isExpanded = expandedTemplateId === template.id;
            const fieldsList = Array.isArray(template.fieldsSchema) ? template.fieldsSchema : [];

            return (
              <div key={template.id} className="flex flex-col">
                {/* Card */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`Template ${template.name}. ${isExpanded ? "Expanded" : "Collapsed"}. Press Enter or Space to toggle.`}
                  onClick={() => toggleTemplate(template)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleTemplate(template);
                    }
                  }}
                  className={cn(
                    "relative bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                    isExpanded
                      ? "border-primary ring-1 ring-primary shadow-md rounded-b-none"
                      : "border-border hover:border-primary/40"
                  )}
                  style={{
                    borderTopColor: template.color || undefined,
                    borderTopWidth: template.color ? "4px" : "1px",
                  }}
                >
                  {/* Top row: name + actions */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <h3 className="font-semibold text-foreground truncate" title={template.name}>
                        {template.icon && <span className="mr-1.5">{template.icon}</span>}
                        {template.name}
                      </h3>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit template"
                        aria-label={`Edit template ${template.name}`}
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowCreateTemplate(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {template.description || "No description"}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span>
                      <strong className="text-foreground">{fieldsList.length}</strong> field
                      {fieldsList.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      <strong className="text-foreground">{template.catalogItems?.length ?? 0}</strong> inventory
                      SKU{(template.catalogItems?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5" />
                      <strong className="text-foreground">{template.storefrontProducts?.length ?? 0}</strong>{" "}
                      storefront
                    </span>
                    {(template.unassignedCodesCount ?? 0) > 0 && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="text-amber-600 dark:text-amber-500/90 tabular-nums" title="Rows without a catalog SKU">
                          {template.unassignedCodesCount} unassigned codes
                        </span>
                      </>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    {template.multiSellEnabled && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-full inline-flex items-center font-medium">
                        <Eye className="w-3 h-3 mr-1" />
                        Multi×{template.multiSellMax}
                      </span>
                    )}
                    {template.cooldownEnabled && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] rounded-full inline-flex items-center font-medium">
                        <Clock className="w-3 h-3 mr-1" />
                        {template.cooldownDurationHours}h
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded-full font-medium",
                        template.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Expanded Fields Panel (directly below card) */}
                {isExpanded && (
                  <div
                    className="border border-t-0 border-primary rounded-b-xl bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-muted-foreground">
                      Stock and codes are not edited here. Use{" "}
                      <Link href="/dashboard/inventory/products" className="text-primary font-medium hover:underline">
                        Inventory products
                      </Link>{" "}
                      to add batches and manage lines.
                    </p>

                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Fields
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {fieldsList
                          .slice()
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((field) => (
                            <div
                              key={field.name}
                              className="px-3 py-2 bg-background border border-input rounded-lg text-left"
                            >
                              <span className="text-sm font-medium text-foreground">{field.label}</span>
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {field.type}
                                {field.required ? " · required" : ""}
                                {field.repeatable ? " · repeatable" : ""}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Inventory products (SKUs)
                      </h4>
                      {template.catalogItems && template.catalogItems.length > 0 ? (
                        <ul className="space-y-1.5 text-sm">
                          {template.catalogItems.map((c) => (
                            <li
                              key={c.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/80 px-3 py-2"
                            >
                              <span className="font-medium text-foreground">{c.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {c.codesCount} codes · {c.stockCount} rows
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No inventory SKUs for this template yet.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Storefront products
                      </h4>
                      {template.storefrontProducts && template.storefrontProducts.length > 0 ? (
                        <ul className="space-y-1.5 text-sm">
                          {template.storefrontProducts.map((p) => (
                            <li
                              key={p.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/80 px-3 py-2"
                            >
                              <Link
                                href={`/dashboard/products/${p.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {p.name}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {p.isActive ? "Active" : "Inactive"} · /{p.slug}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No storefront product uses this template (link a product under this template in the product
                          editor).
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No search results */}
      {!loading && filteredTemplates.length === 0 && templates.length > 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No templates match &ldquo;{search}&rdquo;
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Create/Edit Template Modal */}
      {showCreateTemplate && (
        <CreateTemplateModal
          editingTemplate={editingTemplate}
          onClose={() => {
            setShowCreateTemplate(false);
            setEditingTemplate(null);
          }}
          onSaved={() => {
            setShowCreateTemplate(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
        />
      )}

    </div>
  );
}

// ============================================================================
// Create/Edit Template Modal — with inline creation
// ============================================================================

function CreateTemplateModal({
  editingTemplate,
  onClose,
  onSaved,
}: {
  editingTemplate: TemplateWithStock | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editingTemplate?.name || "");
  const [description, setDescription] = useState(editingTemplate?.description || "");
  const [color, setColor] = useState(editingTemplate?.color || "");
  const [icon, setIcon] = useState(editingTemplate?.icon || "");
  const [multiSellEnabled, setMultiSellEnabled] = useState(editingTemplate?.multiSellEnabled || false);
  const [multiSellMax, setMultiSellMax] = useState(editingTemplate?.multiSellMax || 5);
  const [cooldownEnabled, setCooldownEnabled] = useState(editingTemplate?.cooldownEnabled || false);
  const [cooldownDurationHours, setCooldownDurationHours] = useState(editingTemplate?.cooldownDurationHours || 12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState<FieldSchema[]>(
    editingTemplate?.fieldsSchema || [
      {
        name: "key",
        type: "string",
        required: true,
        label: "Key",
        isVisibleToAdmin: true,
        isVisibleToMerchant: false,
        isVisibleToCustomer: true,
        repeatable: false,
        parentId: null,
        displayOrder: 0,
        linkedTo: null,
        linkGroup: null,
      },
    ]
  );

  const [expandedField, setExpandedField] = useState<number | null>(0);

  const addField = () => {
    setFields([
      ...fields,
      {
        name: `field_${Date.now()}`,
        type: "string",
        required: false,
        label: `Field ${fields.length + 1}`,
        isVisibleToAdmin: true,
        isVisibleToMerchant: true,
        isVisibleToCustomer: true,
        repeatable: false,
        parentId: null,
        displayOrder: fields.length,
        linkedTo: null,
        linkGroup: null,
      },
    ]);
    setExpandedField(fields.length);
  };

  const removeField = (idx: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, updates: Partial<FieldSchema>) => {
    const updated = [...fields];
    updated[idx] = { ...updated[idx], ...updates };
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (fields.length === 0) {
      setError("At least one field is required");
      return;
    }
    for (const field of fields) {
      if (!field.name || !field.label) {
        setError("All fields must have a name and label");
        return;
      }
    }

    setSubmitting(true);
    try {
      const url = editingTemplate
        ? `/api/inventory/templates/${editingTemplate.id}`
        : "/api/inventory/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || "",
          fieldsSchema: fields,
          color: color.trim() || null,
          icon: icon.trim() || null,
          multiSellEnabled,
          multiSellMax: Number(multiSellMax),
          cooldownEnabled,
          cooldownDurationHours: Number(cooldownDurationHours),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        onSaved();
      } else {
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the structure for your inventory stock.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color || "#000000"}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🎮"
                className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Multi-sell */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiSellEnabled}
                onChange={(e) => setMultiSellEnabled(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Enable Multi-sell</span>
            </label>
            {multiSellEnabled && (
              <div className="flex gap-4 ml-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Sales</label>
                  <input
                    type="number"
                    value={multiSellMax}
                    onChange={(e) => setMultiSellMax(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 self-end pb-1">
                  <input
                    type="checkbox"
                    checked={cooldownEnabled}
                    onChange={(e) => setCooldownEnabled(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Cooldown</span>
                </label>
                {cooldownEnabled && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hours</label>
                    <input
                      type="number"
                      value={cooldownDurationHours}
                      onChange={(e) => setCooldownDurationHours(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-background border border-input rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Fields</h3>
              <Button type="button" size="sm" variant="outline" onClick={addField}>
                <Plus className="w-4 h-4 mr-1" /> Add Field
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="bg-muted rounded-lg border border-border overflow-hidden">
                  <div
                    className="p-3 cursor-pointer hover:bg-muted/80 flex items-center justify-between"
                    onClick={() => setExpandedField(expandedField === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                      <span className="font-medium text-sm">{field.label || "Untitled"}</span>
                      <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded text-muted-foreground">
                        {field.type}
                      </span>
                      {field.required && <span className="text-[10px] text-destructive font-medium">req</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-destructive text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(idx);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                      {expandedField === idx ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {expandedField === idx && (
                    <div className="p-3 pt-0 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Field Name *</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              const label = val
                                .replace(/_/g, " ")
                                .replace(/([A-Z])/g, " $1")
                                .trim()
                                .split(" ")
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ");
                              updateField(idx, { name: val, label });
                            }}
                            className="w-full px-3 py-1.5 bg-secondary border border-input rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(idx, { type: e.target.value as any })}
                            className="w-full px-3 py-1.5 bg-secondary border border-input rounded text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="multiline">Multiline</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-3 pb-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(idx, { required: e.target.checked })}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">Required</span>
                          </label>
                        </div>
                      </div>
                      {/* Visibility */}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="text-xs text-muted-foreground self-center">Visible to:</span>
                        {(["Admin", "Merchant", "Customer"] as const).map((role) => {
                          const key = `isVisibleTo${role}` as keyof FieldSchema;
                          return (
                            <label key={role} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={!!field[key]}
                                onChange={(e) => updateField(idx, { [key]: e.target.checked } as any)}
                                className="w-3.5 h-3.5 rounded"
                              />
                              <span className="text-xs">{role}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : editingTemplate ? "Save Template" : "Create Template"}
          </Button>
        </div>
      </div>
    </div>
  );
}
