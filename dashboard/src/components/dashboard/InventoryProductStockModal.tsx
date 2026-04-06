"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Edit, Package, Plus, RefreshCw, Trash, X } from "lucide-react";

export type StockFieldSchema = {
  name: string;
  type: "string" | "number" | "boolean" | "group" | "multiline";
  required: boolean;
  label: string;
  displayOrder?: number;
};

type StockEntry = {
  id: string;
  values: Record<string, unknown>;
  status: string;
  productName: string | null;
  createdAt: string;
  multiSellEnabled?: boolean;
  multiSellMax?: number;
  multiSellSaleCount?: number;
};

function prefillFromCatalog(
  fields: StockFieldSchema[],
  defining: Record<string, string | number | boolean> | null | undefined,
  defaults: Record<string, string | number | boolean> | null | undefined
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const f of fields) {
    const dv = defining?.[f.name];
    const def = defaults?.[f.name];
    const v = dv !== undefined && dv !== null ? dv : def;
    merged[f.name] = v !== undefined && v !== null ? String(v) : "";
  }
  return merged;
}

export function InventoryProductStockModal({
  templateId,
  templateName,
  fieldsSchema,
  multiSellEnabled,
  multiSellMax,
  catalogItemId,
  catalogItemName,
  field,
  isOpen,
  onClose,
  stockItems,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  definingValues,
  defaultValues,
}: {
  templateId: string;
  templateName: string;
  fieldsSchema: StockFieldSchema[];
  multiSellEnabled: boolean;
  multiSellMax: number;
  catalogItemId: string;
  catalogItemName: string;
  field: StockFieldSchema;
  isOpen: boolean;
  onClose: () => void;
  stockItems: StockEntry[];
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  onRefresh: () => void;
  definingValues: Record<string, string | number | boolean> | null | undefined;
  defaultValues: Record<string, string | number | boolean> | null | undefined;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const handleAddStock = async () => {
    try {
      const res = await fetch(`/api/inventory/templates/${templateId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [newValues],
          catalogItemId,
        }),
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
      const res = await fetch(`/api/inventory/templates/${templateId}/stock/${itemId}`, {
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
      const res = await fetch(`/api/inventory/templates/${templateId}/stock/${itemId}`, {
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
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            {catalogItemName}
            <span className="text-muted-foreground font-normal">&rsaquo; {templateName}</span>
            &rsaquo; {field.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
              <Button
                size="sm"
                onClick={() => {
                  setNewValues(prefillFromCatalog(fieldsSchema, definingValues, defaultValues));
                  setAdding(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Stock
              </Button>
            )}
          </div>

          {adding && (
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-sm mb-3">Add New Stock Entry</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fieldsSchema.map((f) => (
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
                    {fieldsSchema
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
                    const isMultiSell = item.multiSellEnabled || multiSellEnabled;
                    const maxSells = item.multiSellMax || multiSellMax;
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
                              {item.values?.[field.name] != null && item.values[field.name] !== "" ? (
                                String(item.values[field.name])
                              ) : (
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
                        {fieldsSchema
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
                                    for (const f of fieldsSchema) {
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
