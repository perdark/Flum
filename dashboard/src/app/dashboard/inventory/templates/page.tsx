"use client";

/**
 * Inventory Templates Management Page
 *
 * Create and manage inventory templates with support for:
 * - Bundle fields (repeatable, eachLineIsProduct)
 * - Field visibility (admin, merchant, customer)
 * - Field nesting (parentId)
 * - Field types: string, number, boolean, group, multiline
 */

import { useState, useEffect } from "react";

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

interface InventoryTemplate {
  id: string;
  name: string;
  description: string | null;
  fieldsSchema: FieldSchema[];
  isActive: boolean;
  createdAt: string;
}

export default function InventoryTemplatesPage() {
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InventoryTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (template: {
    name: string;
    description: string;
    fieldsSchema: FieldSchema[];
  }) => {
    try {
      const url = editingTemplate
        ? `/api/inventory/templates/${editingTemplate.id}`
        : "/api/inventory/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const result = await response.json();

      if (result.success) {
        setShowCreateModal(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        setError(result.error || "Failed to save template");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleEditTemplate = (template: InventoryTemplate) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/templates/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirmId(null);
        fetchTemplates();
      } else {
        setError(result.error || "Failed to delete template");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Templates</h1>
          <p className="text-muted-foreground">Define the structure for different inventory types</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Create Template
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-background border border-border rounded-lg shadow-sm p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  template.isActive
                    ? "bg-success/10 text-success border border-success/30"
                    : "bg-secondary text-muted-foreground border border-input"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleEditTemplate(template)}
                className="px-3 py-1 text-sm bg-secondary text-primary rounded hover:bg-accent transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirmId(template.id)}
                className="px-3 py-1 text-sm bg-secondary text-destructive rounded hover:bg-accent transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Delete confirmation */}
            {deleteConfirmId === template.id && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive mb-2">Delete this template?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-1 text-sm bg-destructive text-foreground rounded hover:bg-destructive/90"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1 text-sm bg-secondary text-foreground rounded hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Fields</h4>
              <div className="space-y-1">
                {template.fieldsSchema.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <span className={`font-mono text-xs px-1 rounded ${
                      field.type === 'string' ? 'bg-secondary text-muted-foreground' :
                      field.type === 'number' ? 'bg-amber-950 text-brand' :
                      field.type === 'boolean' ? 'bg-success/10 text-success' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {field.type}
                    </span>
                    <span>{field.label}</span>
                    {field.required && <span className="text-destructive">*</span>}
                    {field.repeatable && (
                      <span className="text-xs bg-info/10 text-primary px-1 rounded">repeatable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Created {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full bg-background border border-border rounded-lg shadow-sm p-12 text-center">
            <p className="text-muted-foreground mb-4">No inventory templates found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create Your First Template
            </button>
          </div>
        )}
      </div>

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
    </div>
  );
}

interface CreateTemplateModalProps {
  onClose: () => void;
  onCreate: (template: {
    name: string;
    description: string;
    fieldsSchema: FieldSchema[];
  }) => void;
  editingTemplate: InventoryTemplate | null;
}

function CreateTemplateModal({ onClose, onCreate, editingTemplate }: CreateTemplateModalProps) {
  const [name, setName] = useState(editingTemplate?.name || "");
  const [description, setDescription] = useState(editingTemplate?.description || "");
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
      // Update displayOrder
      newFields.forEach((f, i) => f.displayOrder = i);
      setFields(newFields);
    }
  };

  const updateField = (
    index: number,
    updates: Partial<FieldSchema>
  ) => {
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

    // Validate fields
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
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get available parent fields (exclude self and descendants)
  const getParentOptions = (currentIndex: number) => {
    return fields.filter((f, i) => i !== currentIndex);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {editingTemplate ? "Edit Inventory Template" : "Create Inventory Template"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define fields for inventory items and bundle products</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Game Bundle, Account, Gift Card"
                required
                className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-4 py-2 bg-secondary border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Fields Schema</h3>
                <p className="text-xs text-muted-foreground">Define the structure for inventory data</p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className={`bg-muted rounded-lg border border-border overflow-hidden ${
                    field.parentId ? "ml-6 border-l-2 border-l-info/30" : ""
                  }`}
                >
                  {/* Field Header - Always Visible */}
                  <div
                    className="p-4 cursor-pointer hover:bg-muted"
                    onClick={() => setExpandedField(expandedField === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium text-foreground">{field.label || "Untitled Field"}</span>
                        <span className="font-mono text-xs bg-background px-2 py-0.5 rounded text-muted-foreground">
                          {field.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          field.type === 'string' ? 'bg-secondary text-foreground' :
                          field.type === 'number' ? 'bg-amber-950 text-brand' :
                          field.type === 'boolean' ? 'bg-success/10 text-success' :
                          'bg-secondary text-foreground'
                        }`}>
                          {field.type}
                        </span>
                        {field.repeatable && (
                          <span className="text-xs bg-info/10 text-primary px-2 py-0.5 rounded">repeatable</span>
                        )}
                        {field.required && (
                          <span className="text-xs text-destructive">required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {expandedField === index ? "▼" : "▶"}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeField(index); }}
                            className="px-2 py-1 text-destructive hover:text-destructive/80 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Field Details */}
                  {expandedField === index && (
                    <div className="p-4 pt-0 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {/* Field Name - Also generates label automatically */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Field Name *
                          </label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              // Auto-generate label from field name
                              const newLabel = newName
                                .replace(/_/g, ' ')
                                .replace(/([A-Z])/g, ' $1')
                                .trim()
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                              updateField(index, { name: newName, label: newLabel });
                            }}
                            placeholder="field_name"
                            required
                            className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm placeholder:text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Label auto-generated from name</p>
                        </div>

                        {/* Type */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(index, {
                                type: e.target.value as FieldSchema["type"],
                              })
                            }
                            className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>

                        {/* Parent Field */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Parent Field (for nesting)
                          </label>
                          <select
                            value={field.parentId || ""}
                            onChange={(e) =>
                              updateField(index, { parentId: e.target.value || null })
                            }
                            className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          >
                            <option value="">None (Root Level)</option>
                            {getParentOptions(index).map((parent, i) => (
                              <option key={parent.name} value={parent.name}>
                                {parent.label} ({parent.name})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Display Order */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Display Order
                          </label>
                          <input
                            type="number"
                            value={field.displayOrder}
                            onChange={(e) => updateField(index, { displayOrder: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          />
                        </div>

                        {/* Required */}
                        <div className="flex items-end">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                            />
                            <span className="text-sm text-foreground">Required Field</span>
                          </label>
                        </div>
                      </div>

                      {/* Visibility Section */}
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Field Visibility</h4>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToAdmin}
                              onChange={(e) => updateField(index, { isVisibleToAdmin: e.target.checked })}
                              className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                            />
                            <span className="text-sm text-foreground">Admin</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToMerchant}
                              onChange={(e) => updateField(index, { isVisibleToMerchant: e.target.checked })}
                              className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                            />
                            <span className="text-sm text-foreground">Merchant</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToCustomer}
                              onChange={(e) => updateField(index, { isVisibleToCustomer: e.target.checked })}
                              className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                            />
                            <span className="text-sm text-foreground">Customer</span>
                          </label>
                        </div>
                      </div>

                      {/* Bundle Options Section */}
                      <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/30">
                        <h4 className="text-xs font-medium text-primary mb-2">Bundle &amp; link options</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          <strong>Email + password pairs:</strong> add two fields (e.g. <code>email</code> and{" "}
                          <code>password</code>). On the password field, set <em>Linked to</em> to{" "}
                          <code>email</code> so each password stays tied to the same row. Use the same{" "}
                          <em>Link group</em> name on both if you group pairs. Stock validation and manual sell
                          will require both values when linked.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.repeatable}
                                  onChange={(e) => updateField(index, { repeatable: e.target.checked })}
                                  className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                                />
                                <span className="text-sm text-foreground">Repeatable Field</span>
                              </label>
                              <p className="text-xs text-muted-foreground ml-6">Allow multiple values/lines for this field</p>
                            </div>
                            
                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.multiSell || false}
                                  onChange={(e) => updateField(index, { multiSell: e.target.checked })}
                                  className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                                />
                                <span className="text-sm text-foreground">Multi-sell</span>
                              </label>
                              <p className="text-xs text-muted-foreground ml-6">Allow matching inventory items to be sold multiple times</p>
                            </div>

                            {field.multiSell && (
                              <div className="ml-6 flex flex-wrap gap-4 bg-muted/30 p-2 rounded border border-border">
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Max Sells</label>
                                  <input type="number" min="1" value={field.multiSellMax || 5} onChange={(e) => updateField(index, { multiSellMax: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-sm rounded bg-background border border-input" />
                                </div>
                                <div className="flex flex-col justify-center">
                                  <label className="flex items-center gap-2 mt-2">
                                    <input type="checkbox" checked={field.cooldownEnabled || false} onChange={(e) => updateField(index, { cooldownEnabled: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm">Cooldown limits</span>
                                  </label>
                                </div>
                                {field.cooldownEnabled && (
                                  <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Cooldown (Hours)</label>
                                    <input type="number" min="1" value={field.cooldownDurationHours || 12} onChange={(e) => updateField(index, { cooldownDurationHours: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-sm rounded bg-background border border-input" />
                                  </div>
                                )}
                              </div>
                            )}

                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.wholeFieldIsOneItem || false}
                                  onChange={(e) => updateField(index, { wholeFieldIsOneItem: e.target.checked })}
                                  className="w-4 h-4 text-primary bg-secondary border-input rounded focus:ring-ring"
                                />
                                <span className="text-sm text-foreground">Whole field is one item</span>
                              </label>
                              <p className="text-xs text-muted-foreground ml-6">Treat the entire text block as a single value instead of splitting by line</p>
                            </div>
                          </div>

                          {/* Linked To */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Linked To (paired field)
                            </label>
                            <select
                              value={field.linkedTo || ""}
                              onChange={(e) => updateField(index, { linkedTo: e.target.value || null })}
                              className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            >
                              <option value="">None (standalone)</option>
                              {fields
                                .filter((_, i) => i !== index)
                                .map((f) => (
                                  <option key={f.name} value={f.name}>
                                    {f.label} ({f.name})
                                  </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Link this field to another (e.g., email linked to password)
                            </p>
                          </div>

                          {/* Link Group */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Link Group
                            </label>
                            <input
                              type="text"
                              value={field.linkGroup || ""}
                              onChange={(e) => updateField(index, { linkGroup: e.target.value || null })}
                              placeholder="e.g., credentials"
                              className="w-full px-3 py-2 bg-secondary border border-input text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm placeholder:text-muted-foreground"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Group linked fields together for validation
                            </p>
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

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (editingTemplate ? "Saving..." : "Creating...") : (editingTemplate ? "Save Template" : "Create Template")}
          </button>
        </div>
      </div>
    </div>
  );
}
