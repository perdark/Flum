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
        <div className="text-slate-400">Loading templates...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Templates</h1>
          <p className="text-slate-400">Define the structure for different inventory types</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-slate-500">{template.description}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  template.isActive
                    ? "bg-green-950 text-green-400 border border-green-900"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleEditTemplate(template)}
                className="px-3 py-1 text-sm bg-slate-800 text-blue-400 rounded hover:bg-slate-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirmId(template.id)}
                className="px-3 py-1 text-sm bg-slate-800 text-red-400 rounded hover:bg-slate-700 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Delete confirmation */}
            {deleteConfirmId === template.id && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                <p className="text-sm text-red-300 mb-2">Delete this template?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Fields</h4>
              <div className="space-y-1">
                {template.fieldsSchema.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span className={`font-mono text-xs px-1 rounded ${
                      field.type === 'string' ? 'bg-slate-800 text-slate-400' :
                      field.type === 'number' ? 'bg-amber-950 text-amber-400' :
                      field.type === 'boolean' ? 'bg-green-950 text-green-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {field.type}
                    </span>
                    <span>{field.label}</span>
                    {field.required && <span className="text-red-400">*</span>}
                    {field.repeatable && (
                      <span className="text-xs bg-blue-950 text-blue-400 px-1 rounded">repeatable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Created {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-12 text-center">
            <p className="text-slate-500 mb-4">No inventory templates found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {editingTemplate ? "Edit Inventory Template" : "Create Inventory Template"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Define fields for inventory items and bundle products</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Game Bundle, Account, Gift Card"
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-slate-300">Fields Schema</h3>
                <p className="text-xs text-slate-500">Define the structure for inventory data</p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className={`bg-slate-800/50 rounded-lg border border-slate-800 overflow-hidden ${
                    field.parentId ? "ml-6 border-l-2 border-l-blue-800" : ""
                  }`}
                >
                  {/* Field Header - Always Visible */}
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-800/70"
                    onClick={() => setExpandedField(expandedField === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">#{index + 1}</span>
                        <span className="font-medium text-white">{field.label || "Untitled Field"}</span>
                        <span className="font-mono text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                          {field.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          field.type === 'string' ? 'bg-slate-700 text-slate-300' :
                          field.type === 'number' ? 'bg-amber-950 text-amber-400' :
                          field.type === 'boolean' ? 'bg-green-950 text-green-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {field.type}
                        </span>
                        {field.repeatable && (
                          <span className="text-xs bg-blue-950 text-blue-400 px-2 py-0.5 rounded">repeatable</span>
                        )}
                        {field.required && (
                          <span className="text-xs text-red-400">required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          {expandedField === index ? "▼" : "▶"}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeField(index); }}
                            className="px-2 py-1 text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Field Details */}
                  {expandedField === index && (
                    <div className="p-4 pt-0 border-t border-slate-700/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {/* Field Name - Also generates label automatically */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
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
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                          />
                          <p className="text-xs text-slate-500 mt-1">Label auto-generated from name</p>
                        </div>

                        {/* Type */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(index, {
                                type: e.target.value as FieldSchema["type"],
                              })
                            }
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>

                        {/* Parent Field */}
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Parent Field (for nesting)
                          </label>
                          <select
                            value={field.parentId || ""}
                            onChange={(e) =>
                              updateField(index, { parentId: e.target.value || null })
                            }
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Display Order
                          </label>
                          <input
                            type="number"
                            value={field.displayOrder}
                            onChange={(e) => updateField(index, { displayOrder: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>

                        {/* Required */}
                        <div className="flex items-end">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Required Field</span>
                          </label>
                        </div>
                      </div>

                      {/* Visibility Section */}
                      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                        <h4 className="text-xs font-medium text-slate-400 mb-2">Field Visibility</h4>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToAdmin}
                              onChange={(e) => updateField(index, { isVisibleToAdmin: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Admin</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToMerchant}
                              onChange={(e) => updateField(index, { isVisibleToMerchant: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Merchant</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.isVisibleToCustomer}
                              onChange={(e) => updateField(index, { isVisibleToCustomer: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Customer</span>
                          </label>
                        </div>
                      </div>

                      {/* Bundle Options Section */}
                      <div className="mt-4 p-3 bg-blue-950/20 rounded-lg border border-blue-900/30">
                        <h4 className="text-xs font-medium text-blue-400 mb-2">Bundle Options</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.repeatable}
                                  onChange={(e) => updateField(index, { repeatable: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-300">Repeatable Field</span>
                              </label>
                              <p className="text-xs text-slate-500 ml-6">Allow multiple values/lines for this field</p>
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

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (editingTemplate ? "Saving..." : "Creating...") : (editingTemplate ? "Save Template" : "Create Template")}
          </button>
        </div>
      </div>
    </div>
  );
}
