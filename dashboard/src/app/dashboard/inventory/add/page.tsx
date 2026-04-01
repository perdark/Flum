"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  inventoryTemplateId: string | null;
}

export default function AddStockBatchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [jsonLines, setJsonLines] = useState(
    '[\n  { "code": "EXAMPLE-1", "multiSellEnabled": false }\n]'
  );
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Select a product");
      return;
    }
    let items: Record<string, unknown>[];
    try {
      items = JSON.parse(jsonLines);
      if (!Array.isArray(items) || items.length === 0) throw new Error("Need a JSON array");
    } catch {
      toast.error("Invalid JSON — use an array of objects (template fields + optional multi-sell keys)");
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
        toast.success(`Added ${data.data?.totalAdded ?? items.length} line(s)`);
        setJsonLines("[\n]\n");
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
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/inventory" className="text-sm text-primary hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Add stock batch</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a JSON array of rows. Each object uses your template field names. Optional:{" "}
          <code className="text-xs bg-muted px-1 rounded">multiSellEnabled</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">multiSellMax</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">cooldownEnabled</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">cooldownDurationHours</code> (removed from values before
          storage).
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

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Items (JSON array)</label>
          <textarea
            value={jsonLines}
            onChange={(e) => setJsonLines(e.target.value)}
            rows={16}
            className="w-full font-mono text-sm px-4 py-3 bg-muted border border-input rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Add to inventory"}
        </button>
      </form>
    </div>
  );
}
