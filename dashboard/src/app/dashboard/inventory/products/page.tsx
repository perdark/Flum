"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  InventoryProductStockModal,
  type StockFieldSchema,
} from "@/components/dashboard/InventoryProductStockModal";
import { AddInventoryStockBatchModal } from "@/components/dashboard/AddInventoryStockBatchModal";
import { Plus, RefreshCw, Search } from "lucide-react";

type CatalogProductRow = {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  codesCount: number;
  stockCount: number;
  definingValues?: Record<string, string | number | boolean> | null;
  defaultValues?: Record<string, string | number | boolean> | null;
};

type TemplateOption = { id: string; name: string };

type TemplateDetail = {
  id: string;
  name: string;
  fieldsSchema: StockFieldSchema[];
  multiSellEnabled: boolean;
  multiSellMax: number;
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

/** Legacy rows may have values in defaultValues; defining wins. */
function mergedSkuStored(row: CatalogProductRow): Record<string, string | number | boolean> | undefined {
  const m = { ...(row.defaultValues ?? {}), ...(row.definingValues ?? {}) };
  return Object.keys(m).length ? m : undefined;
}

function normalizeFields(raw: unknown): StockFieldSchema[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: Record<string, unknown>) => ({
    name: String(f.name ?? ""),
    type: (["string", "number", "boolean", "group", "multiline"].includes(f.type as string)
      ? f.type
      : "string") as StockFieldSchema["type"],
    required: Boolean(f.required),
    label: String(f.label ?? f.name ?? ""),
    displayOrder: typeof f.displayOrder === "number" ? f.displayOrder : 0,
  }));
}

export default function InventoryProductsPage() {
  const [rows, setRows] = useState<CatalogProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null);
  const [tplLoading, setTplLoading] = useState(false);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockField, setStockField] = useState<StockFieldSchema | null>(null);
  const [stockItems, setStockItems] = useState<StockEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockStatus, setStockStatus] = useState("available");

  const [addBatchOpen, setAddBatchOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [tplLoadingCreate, setTplLoadingCreate] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/catalog-products");
      const data = await res.json();
      if (data.success) {
        setRows(data.data as CatalogProductRow[]);
      } else {
        toast.error(data.error || "Failed to load inventory products");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setTemplateDetail(null);
      return;
    }
    setTplLoading(true);
    fetch(`/api/inventory/templates/${selected.templateId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const fs = normalizeFields(d.data.fieldsSchema);
          setTemplateDetail({
            id: d.data.id,
            name: d.data.name,
            fieldsSchema: fs,
            multiSellEnabled: Boolean(d.data.multiSellEnabled),
            multiSellMax: Number(d.data.multiSellMax) || 5,
          });
        } else {
          toast.error(d.error || "Failed to load template");
          setTemplateDetail(null);
        }
      })
      .catch(() => {
        toast.error("Network error");
        setTemplateDetail(null);
      })
      .finally(() => setTplLoading(false));
  }, [selected?.templateId, selected?.id]);

  const fetchStock = useCallback(
    async (fieldName: string) => {
      if (!selected) return;
      setStockLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("field", fieldName);
        params.set("status", stockStatus);
        params.set("limit", "200");
        params.set("catalogItemId", selected.id);
        const res = await fetch(
          `/api/inventory/templates/${selected.templateId}/stock?${params.toString()}`
        );
        const data = await res.json();
        if (data.success) {
          setStockItems(data.data as StockEntry[]);
        } else {
          toast.error(data.error || "Failed to load stock");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setStockLoading(false);
      }
    },
    [selected, stockStatus]
  );

  useEffect(() => {
    if (stockModalOpen && stockField && selected) {
      void fetchStock(stockField.name);
    }
  }, [stockModalOpen, stockField?.name, selected?.id, stockStatus, fetchStock]);

  const openCreate = () => {
    setCreateOpen(true);
    setNewName("");
    setNewTemplateId("");
    setTplLoadingCreate(true);
    fetch("/api/inventory/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setTemplates(
            d.data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
          );
          if (d.data[0]?.id) setNewTemplateId(d.data[0].id);
        }
      })
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setTplLoadingCreate(false));
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!newTemplateId || !name) {
      toast.error("Choose a template and enter a product name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/templates/${newTemplateId}/catalog-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Inventory product created");
        setCreateOpen(false);
        await load();
        if (data.data?.id) setSelectedId(data.data.id);
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.templateName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalCodes = rows.reduce((s, r) => s + r.codesCount, 0);

  const sortedFields = useMemo(() => {
    if (!templateDetail) return [];
    return [...templateDetail.fieldsSchema].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );
  }, [templateDetail]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory products</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Add stock in bulk here (per SKU). Templates only define field shapes — see{" "}
            <Link href="/dashboard/inventory/templates" className="text-primary underline-offset-2 hover:underline">
              Templates
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            New inventory product
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/inventory">Stock &amp; batches</Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product or template…"
          className="w-full pl-10 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          {rows.length} product{rows.length !== 1 ? "s" : ""} · {totalCodes} codes in available stock
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          {rows.length === 0
            ? "No inventory products yet. Create one to set field values and add stock."
            : "No matches."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium tabular-nums">Codes</th>
                <th className="px-4 py-3 font-medium tabular-nums">Rows</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "border-t border-border cursor-pointer transition-colors",
                    selectedId === r.id ? "bg-primary/10" : "hover:bg-muted/20"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.templateName}</td>
                  <td className="px-4 py-3 tabular-nums">{r.codesCount}</td>
                  <td className="px-4 py-3 tabular-nums">{r.stockCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        r.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                      )}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="border border-border bg-background rounded-lg p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                Template: <span className="text-foreground font-medium">{selected.templateName}</span>
                {" · "}
                <span className="tabular-nums">{selected.codesCount} codes</span>,{" "}
                <span className="tabular-nums">{selected.stockCount} rows</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!selected.isActive || tplLoading || !templateDetail}
                title={!selected.isActive ? "Activate this product first" : undefined}
                onClick={() => setAddBatchOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add stock batch
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                Clear selection
              </Button>
            </div>
          </div>

          {tplLoading || !templateDetail ? (
            <div className="text-sm text-muted-foreground py-6">Loading template fields…</div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Fields &amp; stock</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Use <strong className="text-foreground">Add stock batch</strong> above for many lines at once. Pick a
                  field below to list or edit rows one at a time.
                </p>
                <div className="flex flex-wrap gap-3">
                  {sortedFields.map((field) =>
                    field.type === "group" ? (
                      <div
                        key={field.name}
                        className="flex items-center gap-3 px-4 py-3 bg-muted/40 border border-dashed border-input rounded-lg text-left text-xs text-muted-foreground"
                      >
                        {field.label} (group)
                      </div>
                    ) : (
                      <button
                        key={field.name}
                        type="button"
                        onClick={() => {
                          setStockField(field);
                          setStockModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-4 py-3 bg-secondary hover:bg-secondary/80 border border-input rounded-lg transition-colors text-left"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{field.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {field.type}
                            {field.required ? " · required" : ""}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {selected && templateDetail && stockField && (
        <InventoryProductStockModal
          templateId={selected.templateId}
          templateName={templateDetail.name}
          fieldsSchema={templateDetail.fieldsSchema}
          multiSellEnabled={templateDetail.multiSellEnabled}
          multiSellMax={templateDetail.multiSellMax}
          catalogItemId={selected.id}
          catalogItemName={selected.name}
          field={stockField}
          isOpen={stockModalOpen}
          onClose={() => {
            setStockModalOpen(false);
            setStockField(null);
          }}
          stockItems={stockItems}
          loading={stockLoading}
          statusFilter={stockStatus}
          onStatusFilterChange={setStockStatus}
          onRefresh={() => fetchStock(stockField.name)}
          definingValues={mergedSkuStored(selected)}
          defaultValues={null}
        />
      )}

      {selected && templateDetail && (
        <AddInventoryStockBatchModal
          isOpen={addBatchOpen}
          onClose={() => setAddBatchOpen(false)}
          onSuccess={() => void load()}
          templateId={selected.templateId}
          productName={selected.name}
          templateName={templateDetail.name}
          catalogItemId={selected.id}
          fieldsSchema={templateDetail.fieldsSchema}
          definingValues={mergedSkuStored(selected)}
          defaultValues={null}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New inventory product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Template (field schema)</label>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                disabled={tplLoadingCreate || templates.length === 0}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 && !tplLoadingCreate && (
                <p className="text-xs text-destructive mt-1">Create a template first.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Product name</label>
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Steam 2 month"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving || tplLoadingCreate}
              >
                {saving ? "Saving…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
