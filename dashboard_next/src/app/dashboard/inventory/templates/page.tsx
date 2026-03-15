"use client";

/**
 * Inventory Templates Management Page
 *
 * Create and manage inventory templates
 */

import { useState, useEffect } from "react";

interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  label: string;
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
      const response = await fetch("/api/inventory/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const result = await response.json();

      if (result.success) {
        setShowCreateModal(false);
        fetchTemplates();
      } else {
        setError(result.error || "Failed to create template");
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

            <div className="mb-4">
              <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Fields</h4>
              <div className="space-y-1">
                {template.fieldsSchema.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span className="font-mono text-xs bg-slate-800 px-1 rounded text-slate-400">
                      {field.type}
                    </span>
                    <span>{field.label}</span>
                    {field.required && <span className="text-red-400">*</span>}
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
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTemplate}
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
}

function CreateTemplateModal({ onClose, onCreate }: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldSchema[]>([
    { name: "key", type: "string", required: true, label: "Key" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    setFields([
      ...fields,
      {
        name: `field_${fields.length + 1}`,
        type: "string",
        required: false,
        label: `Field ${fields.length + 1}`,
      },
    ]);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Create Inventory Template</h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Game Key, Account, Gift Card"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Fields Schema</h3>
              <button
                type="button"
                onClick={addField}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 p-4 rounded-lg border border-slate-800"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Field Name *
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="key"
                        required
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Activation Key"
                        required
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, {
                            type: e.target.value as "string" | "number" | "boolean",
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(index, { required: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300">Required</span>
                      </label>
                    </div>

                    <div className="flex items-end">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
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
            {submitting ? "Creating..." : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
