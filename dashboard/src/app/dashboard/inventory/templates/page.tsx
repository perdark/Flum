"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Eye, Edit, Trash, Plus, Package, Clock, Box, Check, X } from "lucide-react";

interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean";
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
  multiSell?: boolean;
  multiSellMax?: number;
  cooldownEnabled?: boolean;
  cooldownDurationHours?: number;
  wholeFieldIsOneItem?: boolean;
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
  codesCount?: number;
  createdAt: string;
}

interface StockEntry {
  id: string;
  values: Record<string, any>;
  status: string;
  cost: string | null;
  productId: string | null;
  createdAt: string;
  multiSellSaleCount: number;
  cooldownUntil: string | null;
  productName: string | null;
}

export default function InventoryTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithStock | null>(null);
  const [selectedField, setSelectedField] = useState<FieldSchema | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithStock | null>(null);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockItems, setStockItems] = useState<StockEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/inventory/templates");
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      } else {
        setError(result.error || "Failed to load templates");
        toast.error("Failed to load templates");
      }
    } catch (err) {
      setError("Network error");
      toast.error("Network error loading templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async (templateId: string, fieldName: string) => {
    setStockLoading(true);
    try {
      const response = await fetch(`/api/inventory/templates/${templateId}/stock?field=${fieldName}`);
      const result = await response.json();
      if (result.success) {
        setStockItems(result.data);
      } else {
        toast.error(result.error || "Failed to load stock");
      }
    } catch (error) {
      toast.error("Network error loading stock");
    } finally {
      setStockLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      const url = editingTemplate
        ? `/api/inventory/templates/${editingTemplate.id}`
        : "/api/inventory/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        setShowCreateModal(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const handleEditTemplate = (template: TemplateWithStock) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground animate-pulse">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Templates</h1>
          <p className="text-muted-foreground">Define and manage inventory structures</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={cn(
              "relative bg-background border rounded-lg shadow-sm p-5 cursor-pointer transition-all hover:border-primary/50",
              selectedTemplate?.id === template.id ? "border-primary ring-1 ring-primary" : "border-border"
            )}
            style={{
              borderTopColor: template.color || undefined,
              borderTopWidth: template.color ? "4px" : "1px",
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg text-foreground truncate" title={template.name}>
                {template.icon && <span className="mr-2">{template.icon}</span>}
                {template.name}
              </h3>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditTemplate(template)}>
                   <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                 </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">
              {template.description || "No description"}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Package className="w-4 h-4" />
              <span>
                <strong className="text-foreground">{template.codesCount ?? 0}</strong> codes
              </span>
              {template.stockCount > 0 && (template.codesCount ?? 0) !== template.stockCount && (
                <span className="text-xs tabular-nums">({template.stockCount} rows)</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {template.multiSellEnabled && (
                <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full inline-flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  Max {template.multiSellMax}
                </span>
              )}
              {template.cooldownEnabled && (
                <span className="px-2 py-0.5 bg-info/10 text-info text-xs rounded-full inline-flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {template.cooldownDurationHours}h
                </span>
              )}
              <span className={cn("px-2 py-0.5 text-xs rounded-full", template.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                {template.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !error && (
        <div className="bg-background border border-border rounded-lg shadow-sm p-12 text-center">
          <Box className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-4">No inventory templates found.</p>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Your First Template
          </Button>
        </div>
      )}

      {/* Fields Panel */}
      {selectedTemplate && (
        <div className="border border-border bg-background rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Fields for {selectedTemplate.name}</h2>
              <p className="text-sm text-muted-foreground">Select a field to view or manage its stock entries.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
              Close Panel
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedTemplate.fieldsSchema.map((field) => (
              <button
                key={field.name}
                onClick={() => {
                  setSelectedField(field);
                  setStockModalOpen(true);
                  fetchStock(selectedTemplate.id, field.name);
                }}
                className="flex items-center gap-3 px-4 py-3 bg-secondary hover:bg-secondary/80 border border-input rounded-lg transition-colors text-left"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{field.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {field.type} {field.required && "*"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onCreate={handleCreateTemplate}
          editingTemplate={editingTemplate}
        />
      )}

      {stockModalOpen && selectedTemplate && selectedField && (
        <StockModal
          template={selectedTemplate}
          field={selectedField}
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          stockItems={stockItems}
          loading={stockLoading}
          onRefresh={() => fetchStock(selectedTemplate.id, selectedField.name)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Stock Modal Component
// ------------------------------------------------------------------------------------
function StockModal({ template, field, isOpen, onClose, stockItems, loading, onRefresh }: any) {
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddStock = async () => {
    try {
      const res = await fetch(`/api/inventory/templates/${template.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [newValues], // Add exactly one item with the form values
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
    } catch (err) {
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
        toast.success("Stock deleted");
        onRefresh();
      } else {
        toast.error(data.error || "Failed to delete");
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
        body: JSON.stringify({ values: newValues }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stock updated");
        setEditingId(null);
        setNewValues({});
        onRefresh();
      } else {
        toast.error(data.error || "Failed to update stock");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Stock for {template.name} &rsaquo; {field.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Form */}
          <div className="bg-secondary p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-sm mb-3">
              {adding ? "Add New Stock Entry" : "Actions"}
            </h4>
            {!adding ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Stock
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {template.fieldsSchema.map((f: FieldSchema) => (
                    <div key={f.name}>
                      <label className="text-xs text-muted-foreground block mb-1">
                        {f.label} {f.required && "*"}
                      </label>
                      <input
                        type={f.type === "number" ? "number" : "text"}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded"
                        value={newValues[f.name] || ""}
                        onChange={(e) => setNewValues({ ...newValues, [f.name]: e.target.value })}
                        required={f.required}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStock}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              No stock found.
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Value ({field.label})</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stockItems.map((item: any) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-xs break-all max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full px-2 py-1 bg-background border"
                              value={newValues[field.name] || ""}
                              onChange={(e) => setNewValues({ ...newValues, [field.name]: e.target.value })}
                            />
                          ) : (
                            item.values?.[field.name] || <em className="text-muted-foreground">empty</em>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            item.status === 'available' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          )}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" className="text-success h-7 w-7" onClick={() => handleUpdate(item.id)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-muted-foreground h-7 w-7" onClick={() => { setEditingId(null); setNewValues({}); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(item.id); setNewValues({ ...item.values }); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => handleDelete(item.id)}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

// ------------------------------------------------------------------------------------
// Create/Edit Template Modal Component (Extended with template-level details)
// ------------------------------------------------------------------------------------
function CreateTemplateModal({ onClose, onCreate, editingTemplate }: any) {
  const [name, setName] = useState(editingTemplate?.name || "");
  const [description, setDescription] = useState(editingTemplate?.description || "");
  const [color, setColor] = useState(editingTemplate?.color || "");
  const [icon, setIcon] = useState(editingTemplate?.icon || "");
  
  const [multiSellEnabled, setMultiSellEnabled] = useState(editingTemplate?.multiSellEnabled || false);
  const [multiSellMax, setMultiSellMax] = useState(editingTemplate?.multiSellMax || 5);
  const [cooldownEnabled, setCooldownEnabled] = useState(editingTemplate?.cooldownEnabled || false);
  const [cooldownDurationHours, setCooldownDurationHours] = useState(editingTemplate?.cooldownDurationHours || 12);

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
        multiSell: false,
        multiSellMax: 5,
        cooldownEnabled: false,
        cooldownDurationHours: 12,
        wholeFieldIsOneItem: false,
      },
    ]
  );
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<number | null>(0);

  const addField = () => {
    const newField: FieldSchema = {
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
      multiSell: false,
      multiSellMax: 5,
      cooldownEnabled: false,
      cooldownDurationHours: 12,
      wholeFieldIsOneItem: false,
    };
    setFields([...fields, newField]);
    setExpandedField(fields.length);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      const newFields = fields.filter((_, i) => i !== index);
      newFields.forEach((f, i) => f.displayOrder = i);
      setFields(newFields);
    }
  };

  const updateField = (index: number, updates: Partial<FieldSchema>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
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
      await onCreate({
        name: name.trim(),
        description: description.trim() || "",
        fieldsSchema: fields,
        color: color.trim() || null,
        icon: icon.trim() || null,
        multiSellEnabled,
        multiSellMax: Number(multiSellMax),
        cooldownEnabled,
        cooldownDurationHours: Number(cooldownDurationHours),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getParentOptions = (currentIndex: number) => {
    return fields.filter((f, i) => i !== currentIndex);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {editingTemplate ? "Edit Inventory Template" : "Create Inventory Template"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure template settings and structure.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
              {error}
            </div>
          )}

          {/* BASIC / UI */}
          <div>
            <h3 className="font-semibold mb-4 border-b pb-2">General & Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-secondary border border-input rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-input rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color Stripe (Hex)</label>
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
                     className="flex-1 px-3 py-2 bg-secondary border border-input rounded"
                   />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Icon (Emoji/Text)</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🎮"
                  className="w-full px-3 py-2 bg-secondary border border-input rounded"
                />
              </div>
            </div>
          </div>

          {/* TEMPLATE LEVEL MULTI-SELL */}
          <div>
            <h3 className="font-semibold mb-4 border-b pb-2">Sell Rules</h3>
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={multiSellEnabled}
                  onChange={(e) => setMultiSellEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium text-sm">Enable Template-level Multi-sell</span>
              </label>
              
              {multiSellEnabled && (
                <div className="flex gap-4 ml-6 items-end">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Max Sales (per item)</label>
                    <input
                      type="number"
                      value={multiSellMax}
                      onChange={(e) => setMultiSellMax(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-background border border-input rounded text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 mb-2">
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
                        className="w-24 px-3 py-1.5 bg-background border border-input rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SCHEMA */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="font-semibold">Fields Schema</h3>
              <Button type="button" size="sm" onClick={addField}>+ Add Field</Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className={`bg-muted rounded-lg border border-border overflow-hidden ${
                    field.parentId ? "ml-6 border-l-2 border-l-info/30" : ""
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-muted"
                    onClick={() => setExpandedField(expandedField === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{field.label || "Untitled"}</span>
                        <span className="font-mono text-xs bg-background px-2 py-0.5 rounded text-muted-foreground">
                          {field.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary">{field.type}</span>
                        {field.repeatable && <span className="text-xs bg-info/10 text-info px-2 py-0.5 rounded">repeatable</span>}
                        {field.required && <span className="text-xs text-destructive">req</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{expandedField === index ? "▼" : "▶"}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); removeField(index); }}
                            className="text-destructive h-7 hover:bg-destructive/10"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedField === index && (
                    <div className="p-4 pt-0 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Field Name *</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              const newLabel = newName
                                .replace(/_/g, ' ')
                                .replace(/([A-Z])/g, ' $1')
                                .trim()
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                              updateField(index, { name: newName, label: newLabel });
                            }}
                            required
                            className="w-full px-3 py-2 bg-secondary border border-input rounded text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Field Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value as any })}
                            className="w-full px-3 py-2 bg-secondary border border-input rounded text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Parent Field</label>
                          <select
                            value={field.parentId || ""}
                            onChange={(e) => updateField(index, { parentId: e.target.value || null })}
                            className="w-full px-3 py-2 bg-secondary border border-input rounded text-sm"
                          >
                            <option value="">None (Root Level)</option>
                            {getParentOptions(index).map((parent) => (
                              <option key={parent.name} value={parent.name}>
                                {parent.label} ({parent.name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Display Order</label>
                          <input
                            type="number"
                            value={field.displayOrder}
                            onChange={(e) => updateField(index, { displayOrder: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-secondary border border-input rounded text-sm"
                          />
                        </div>

                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="w-4 h-4 rounded bg-secondary border-input"
                            />
                            <span className="text-sm">Required Field</span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Field Visibility</h4>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToAdmin}
                              onChange={(e) => updateField(index, { isVisibleToAdmin: e.target.checked })}
                              className="rounded bg-secondary border-input"
                            />
                            <span className="text-sm">Admin</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToMerchant}
                              onChange={(e) => updateField(index, { isVisibleToMerchant: e.target.checked })}
                              className="rounded bg-secondary border-input"
                            />
                            <span className="text-sm">Merchant</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToCustomer}
                              onChange={(e) => updateField(index, { isVisibleToCustomer: e.target.checked })}
                              className="rounded bg-secondary border-input"
                            />
                            <span className="text-sm">Customer</span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/30">
                        <h4 className="text-xs font-medium text-primary mb-2">Bundle & link options</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="flex items-center gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={field.repeatable}
                                  onChange={(e) => updateField(index, { repeatable: e.target.checked })}
                                  className="rounded bg-secondary border-input"
                                />
                                <span className="text-sm font-medium">Repeatable Field</span>
                              </label>
                            </div>
                            <div>
                              <label className="flex items-center gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={field.wholeFieldIsOneItem || false}
                                  onChange={(e) => updateField(index, { wholeFieldIsOneItem: e.target.checked })}
                                  className="rounded bg-secondary border-input"
                                />
                                <span className="text-sm font-medium">Whole field is one item</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-xs text-muted-foreground mb-1">Linked To</label>
                              <select
                                value={field.linkedTo || ""}
                                onChange={(e) => updateField(index, { linkedTo: e.target.value || null })}
                                className="w-full px-3 py-2 bg-secondary border rounded text-sm"
                              >
                                <option value="">None</option>
                                {fields.filter((_, i) => i !== index).map((f) => (
                                  <option key={f.name} value={f.name}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-muted-foreground mb-1">Link Group</label>
                              <input
                                type="text"
                                value={field.linkGroup || ""}
                                onChange={(e) => updateField(index, { linkGroup: e.target.value || null })}
                                className="w-full px-3 py-2 bg-secondary border rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-6 border-t flex justify-end gap-3 bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : (editingTemplate ? "Save Template" : "Create Template")}
          </Button>
        </div>
      </div>
    </div>
  );
}
