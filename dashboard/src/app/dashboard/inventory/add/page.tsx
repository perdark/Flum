"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean" | "multiline";
  label: string;
  required: boolean;
}

interface Product {
  id: string;
  name: string;
  inventoryTemplateId: string | null;
}

export default function AddStockBatchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Record<string, { fieldsSchema: FieldSchema[] }>>({});
  const [productId, setProductId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([{}]);
  const [loading, setLoading] = useState(false);

  const currentProduct = products.find((p) => p.id === productId);
  const templateId = currentProduct?.inventoryTemplateId;
  const fields = templateId && templates[templateId] ? templates[templateId].fieldsSchema : [];

  useEffect(() => {
    fetch("/api/products?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setProducts(d.data.filter((p: Product) => p.inventoryTemplateId));
        }
      })
      .catch(() => toast.error("Failed to load products"));
  }, []);

  useEffect(() => {
    if (templateId && !templates[templateId]) {
      fetch(`/api/inventory/templates/${templateId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setTemplates((prev) => ({ ...prev, [templateId]: d.data }));
          }
        })
        .catch(() => {/* silent */});
    }
  }, [templateId]);

  const addRow = () => setRows([...rows, {}]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const updateRow = (idx: number, fieldName: string, value: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [fieldName]: value };
    setRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Select a product");
      return;
    }

    // Filter out empty rows
    const items = rows.filter((row) => Object.values(row).some((v) => v?.trim()));

    if (items.length === 0) {
      toast.error("Add at least one row with data");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          batchName: batchName.trim() || undefined,
          items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${data.data?.totalAdded ?? items.length} item(s)`);
        setRows([{}]);
        setBatchName("");
        setProductId("");
      } else {
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard/inventory" className="text-sm text-primary hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Add stock</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter one line per inventory item. Each row is matched across fields.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Product *</label>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
          >
            <option value="">Select product with template…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Batch name (optional)</label>
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
            placeholder="e.g. Import March 2026"
          />
        </div>

        {!productId ? (
          <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            Select a product to see its template fields
          </div>
        ) : fields.length === 0 ? (
          <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            No fields found for this product's template
          </div>
        ) : (
          <div className="space-y-4">
            {/* Field headers */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="grid gap-1 bg-muted/50 p-1" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(150px, 1fr))` }}>
                {fields.map((f) => (
                  <div key={f.name} className="px-3 py-2 rounded bg-muted">
                    <div className="text-xs font-semibold text-foreground">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {f.type}
                      {f.required && " •"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Row inputs */}
              <div className="space-y-0.5 p-1 bg-card">
                {rows.map((row, ridx) => (
                  <div
                    key={ridx}
                    className="grid gap-1 items-start"
                    style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(150px, 1fr))` }}
                  >
                    {fields.map((f) => (
                      <div key={f.name} className="relative">
                        {f.type === "multiline" ? (
                          <textarea
                            rows={2}
                            value={row[f.name] || ""}
                            onChange={(e) => updateRow(ridx, f.name, e.target.value)}
                            placeholder={f.required ? `${f.label} *` : f.label}
                            className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded resize-y"
                          />
                        ) : (
                          <input
                            type={f.type === "number" ? "number" : "text"}
                            value={row[f.name] || ""}
                            onChange={(e) => updateRow(ridx, f.name, e.target.value)}
                            placeholder={f.required ? `${f.label} *` : f.label}
                            className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Add row button */}
            <button
              type="button"
              onClick={addRow}
              className="text-sm text-primary hover:underline font-medium"
            >
              + Add row
            </button>

            {/* Summary */}
            <div className="text-xs text-muted-foreground">
              {rows.filter((r) => Object.values(r).some((v) => v?.trim())).length} row{rows.filter((r) => Object.values(r).some((v) => v?.trim())).length !== 1 ? "s" : ""} with data
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !productId || fields.length === 0}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add to inventory"}
        </button>
      </form>
    </div>
  );
}
