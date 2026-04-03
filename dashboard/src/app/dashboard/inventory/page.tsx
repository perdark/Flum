"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Plus,
  Package,
  Clock,
  Box,
  Edit,
  Trash,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Eye,
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
  createdAt: string;
}

interface StockEntry {
  id: string;
  values: Record<string, any>;
  status: string;
  cost: string | null;
  productId: string | null;
  productName: string | null;
  multiSellEnabled: boolean;
  multiSellMax: number;
  multiSellSaleCount: number;
  cooldownEnabled: boolean;
  cooldownUntil: string | null;
  cooldownDurationHours: number;
  createdAt: string;
}

// ============================================================================
// Main Inventory Page — Template-centric
// ============================================================================

export default function InventoryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Which template is expanded (shows fields underneath)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Stock modal state
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalTemplate, setStockModalTemplate] = useState<TemplateWithStock | null>(null);
  const [stockModalField, setStockModalField] = useState<FieldSchema | null>(null);
  const [stockItems, setStockItems] = useState<StockEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("available");

  // Create template modal (inline when adding stock)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithStock | null>(null);

  // Add stock modal
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [addStockTemplate, setAddStockTemplate] = useState<TemplateWithStock | null>(null);

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

  const fetchStock = async (templateId: string, fieldName?: string, status?: string) => {
    setStockLoading(true);
    try {
      const params = new URLSearchParams();
      if (fieldName) params.set("field", fieldName);
      params.set("status", status || stockStatusFilter || "available");
      params.set("limit", "200");
      const res = await fetch(`/api/inventory/templates/${templateId}/stock?${params}`);
      const data = await res.json();
      if (data.success) {
        setStockItems(data.data);
      } else {
        toast.error(data.error || "Failed to load stock");
      }
    } catch {
      toast.error("Network error loading stock");
    } finally {
      setStockLoading(false);
    }
  };

  // ── Template toggle ───────────────────────────────────────────────────────

  const toggleTemplate = (template: TemplateWithStock) => {
    if (expandedTemplateId === template.id) {
      setExpandedTemplateId(null);
    } else {
      setExpandedTemplateId(template.id);
    }
  };

  const openStockModal = (template: TemplateWithStock, field: FieldSchema) => {
    setStockModalTemplate(template);
    setStockModalField(field);
    setStockModalOpen(true);
    setStockStatusFilter("available");
    fetchStock(template.id, field.name, "available");
  };

  const openAddStockModal = (template: TemplateWithStock) => {
    setAddStockTemplate(template);
    setAddStockOpen(true);
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
            Manage stock by template. {templates.length} template{templates.length !== 1 ? "s" : ""},{" "}
            {templates.reduce((s, t) => s + (t.codesCount ?? 0), 0)} codes in stock.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchTemplates(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
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

            return (
              <div key={template.id} className="flex flex-col">
                {/* Card */}
                <div
                  onClick={() => toggleTemplate(template)}
                  className={cn(
                    "relative bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md",
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
                        title="Add stock"
                        onClick={() => openAddStockModal(template)}
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit template"
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

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      <strong className="text-foreground">{template.codesCount ?? 0}</strong> codes
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>
                      {template.fieldsSchema.length} field{template.fieldsSchema.length !== 1 ? "s" : ""}
                    </span>
                    {template.stockCount > 0 && (template.codesCount ?? 0) !== template.stockCount && (
                      <>
                        <span className="text-muted-foreground/50">|</span>
                        <span className="tabular-nums">{template.stockCount} row{template.stockCount !== 1 ? "s" : ""}</span>
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
                  <div className="border border-t-0 border-primary rounded-b-xl bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-muted-foreground mb-3">
                      Click a field to view &amp; manage stock entries.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.fieldsSchema
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((field) => (
                          <button
                            key={field.name}
                            onClick={() => openStockModal(template, field)}
                            className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-primary/5 border border-input hover:border-primary/40 rounded-lg transition-colors text-left group"
                          >
                            <div>
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {field.label}
                              </span>
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {field.type}
                                {field.required && " • required"}
                              </span>
                            </div>
                          </button>
                        ))}
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

      {/* Stock View/Edit Modal */}
      {stockModalOpen && stockModalTemplate && stockModalField && (
        <StockModal
          template={stockModalTemplate}
          field={stockModalField}
          isOpen={stockModalOpen}
          onClose={() => {
            setStockModalOpen(false);
            fetchTemplates(); // refresh counts
          }}
          stockItems={stockItems}
          loading={stockLoading}
          statusFilter={stockStatusFilter}
          onStatusFilterChange={(status) => {
            setStockStatusFilter(status);
            fetchStock(stockModalTemplate.id, stockModalField.name, status);
          }}
          onRefresh={() => fetchStock(stockModalTemplate.id, stockModalField.name, stockStatusFilter)}
        />
      )}

      {/* Add Stock Modal */}
      {addStockOpen && addStockTemplate && (
        <AddStockModal
          template={addStockTemplate}
          isOpen={addStockOpen}
          onClose={() => {
            setAddStockOpen(false);
            fetchTemplates();
          }}
        />
      )}

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
// Stock Modal — view all stock entries for a template + field
// ============================================================================

function StockModal({
  template,
  field,
  isOpen,
  onClose,
  stockItems,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: {
  template: TemplateWithStock;
  field: FieldSchema;
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockEntry[];
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const handleAddStock = async () => {
    try {
      const res = await fetch(`/api/inventory/templates/${template.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [newValues] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stock added");
        setNewValues({});
        setAdding(false);
        onRefresh();
      } else {
        toast.error(data.error || "Failed to add stock");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleUpdate = async (itemId: string) => {
    try {
      const res = await fetch(`/api/inventory/templates/${template.id}/stock/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: editValues }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Updated");
        setEditingId(null);
        setEditValues({});
        onRefresh();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this stock entry?")) return;
    try {
      const res = await fetch(`/api/inventory/templates/${template.id}/stock/${itemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted");
        onRefresh();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {template.name} &rsaquo; {field.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Toolbar: status filter + add */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
            >
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
              <option value="in_cooldown">In Cooldown</option>
              <option value="all">All Statuses</option>
            </select>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
            <div className="flex-1" />
            {!adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Stock
              </Button>
            )}
          </div>

          {/* Add form */}
          {adding && (
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-sm mb-3">Add New Stock Entry</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {template.fieldsSchema.map((f) => (
                  <div key={f.name}>
                    <label className="text-xs text-muted-foreground block mb-1">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </label>
                    {f.type === "multiline" ? (
                      <textarea
                        rows={3}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded resize-y"
                        value={newValues[f.name] || ""}
                        onChange={(e) => setNewValues({ ...newValues, [f.name]: e.target.value })}
                      />
                    ) : f.type === "boolean" ? (
                      <select
                        className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded"
                        value={newValues[f.name] || "false"}
                        onChange={(e) => setNewValues({ ...newValues, [f.name]: e.target.value })}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : "text"}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded"
                        value={newValues[f.name] || ""}
                        onChange={(e) => setNewValues({ ...newValues, [f.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleAddStock}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setNewValues({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Stock table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">Loading stock…</div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              No stock entries found.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Value ({field.label})</th>
                    {template.fieldsSchema
                      .filter((f) => f.name !== field.name)
                      .slice(0, 2)
                      .map((f) => (
                        <th key={f.name} className="px-4 py-3 hidden lg:table-cell">
                          {f.label}
                        </th>
                      ))}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Product</th>
                    <th className="px-4 py-3 hidden md:table-cell">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stockItems.map((item) => {
                    const isEditing = editingId === item.id;
                    const isMultiSell = item.multiSellEnabled || template.multiSellEnabled;
                    const maxSells = item.multiSellMax || template.multiSellMax;
                    const remaining = maxSells - (item.multiSellSaleCount || 0);

                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-xs break-all max-w-[200px]">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full px-2 py-1 bg-background border border-input rounded text-sm"
                              value={editValues[field.name] || ""}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [field.name]: e.target.value })
                              }
                            />
                          ) : (
                            <>
                              {item.values?.[field.name] || (
                                <em className="text-muted-foreground">empty</em>
                              )}
                              {isMultiSell && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-medium">
                                  {remaining}/{maxSells} left
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        {template.fieldsSchema
                          .filter((f) => f.name !== field.name)
                          .slice(0, 2)
                          .map((f) => (
                            <td
                              key={f.name}
                              className="px-4 py-3 font-mono text-xs text-muted-foreground break-all max-w-[150px] hidden lg:table-cell"
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 bg-background border border-input rounded text-xs"
                                  value={editValues[f.name] || ""}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, [f.name]: e.target.value })
                                  }
                                />
                              ) : (
                                String(item.values?.[f.name] ?? "")
                              )}
                            </td>
                          ))}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              item.status === "available"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : item.status === "sold"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : item.status === "reserved"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {item.productName || <span className="italic">unlinked</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-500"
                                  onClick={() => handleUpdate(item.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditValues({});
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingId(item.id);
                                    const vals: Record<string, string> = {};
                                    for (const f of template.fieldsSchema) {
                                      vals[f.name] = String(item.values?.[f.name] ?? "");
                                    }
                                    setEditValues(vals);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Add Stock Modal — line-by-line per field (one column = one field, rows = entries)
// ============================================================================

function splitFieldLines(text: string): string[] {
  const s = text.replace(/\r\n/g, "\n");
  if (s === "") return [];
  return s.split("\n");
}

function AddStockModal({
  template,
  isOpen,
  onClose,
}: {
  template: TemplateWithStock;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [lineTexts, setLineTexts] = useState<Record<string, string>>({});
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const init: Record<string, string> = {};
    for (const f of template.fieldsSchema) {
      init[f.name] = "";
    }
    setLineTexts(init);
    setCost("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening or switching template id
  }, [isOpen, template.id]);

  const entryCount = useMemo(() => {
    const lengths = template.fieldsSchema.map((f) =>
      splitFieldLines(lineTexts[f.name] ?? "").length
    );
    return lengths.length ? Math.max(0, ...lengths) : 0;
  }, [lineTexts, template.fieldsSchema]);

  const parsedItems = useMemo(() => {
    if (entryCount === 0) return [];
    const out: Record<string, string>[] = [];
    for (let i = 0; i < entryCount; i++) {
      const row: Record<string, string> = {};
      for (const f of template.fieldsSchema) {
        const lines = splitFieldLines(lineTexts[f.name] ?? "");
        row[f.name] = (lines[i] ?? "").trim();
      }
      if (Object.values(row).some((v) => v.length > 0)) {
        out.push(row);
      }
    }
    return out;
  }, [entryCount, lineTexts, template.fieldsSchema]);

  const setFieldText = (fieldName: string, value: string) => {
    setLineTexts((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async () => {
    if (parsedItems.length === 0) {
      toast.error("No items to add");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/templates/${template.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems, cost: cost || null }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${data.data.count} stock entries`);
        onClose();
      } else {
        toast.error(data.error || "Failed to add stock");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldGridClass =
    template.fieldsSchema.length === 1
      ? "grid grid-cols-1 gap-4"
      : template.fieldsSchema.length === 2
        ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stock to {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Each line in a column is one value for that field. Line 1 across columns = first stock entry, line 2 =
            second entry, and so on. Shorter columns count as empty values for missing lines.
          </p>

          {/* Cost */}
          <div className="max-w-xs">
            <label className="text-xs text-muted-foreground block mb-1">Cost per item (optional)</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm"
            />
          </div>

          <div className={fieldGridClass}>
            {template.fieldsSchema.map((f) => {
              const lines = splitFieldLines(lineTexts[f.name] ?? "");
              return (
                <div key={f.name} className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </label>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {lines.length} lines
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    className="w-full min-h-[12rem] px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono resize-y"
                    value={lineTexts[f.name] ?? ""}
                    onChange={(e) => setFieldText(f.name, e.target.value)}
                    placeholder={`One value per line for ${f.label}…`}
                    spellCheck={false}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{entryCount}</span> entries detected (by max line count)
            {parsedItems.length !== entryCount && entryCount > 0 ? (
              <span className="block text-xs mt-1">
                {parsedItems.length} non-empty row{parsedItems.length === 1 ? "" : "s"} will be submitted (all-blank
                rows skipped).
              </span>
            ) : null}
          </p>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || parsedItems.length === 0}>
              {submitting ? "Adding…" : `Add ${parsedItems.length} entries`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
