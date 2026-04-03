"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { DollarSign, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type CostType = "cost" | "debt" | "payment";

interface CostRow {
  id: string;
  type: string;
  description: string;
  amount: string;
  templateId: string | null;
  productId: string | null;
  creditorName: string | null;
  dueDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
  paidAmount: string | null;
  relatedDebtId: string | null;
  createdAt: string;
  updatedAt: string;
  templateName: string | null;
  productName: string | null;
}

interface Summary {
  totalCosts: string;
  outstandingDebts: string;
  totalPaid: string;
}

type TabKey = "all" | CostType;

export default function CostsPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CostRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalCosts: "0",
    outstandingDebts: "0",
    totalPaid: "0",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostRow | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [productOptions, setProductOptions] = useState<{ id: string; name: string }[]>([]);
  const [unpaidDebts, setUnpaidDebts] = useState<{ id: string; description: string; amount: string }[]>([]);

  const [formType, setFormType] = useState<CostType>("cost");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formCreditor, setFormCreditor] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formRelatedDebtId, setFormRelatedDebtId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSupportLists = useCallback(async () => {
    try {
      const [tRes, pRes, dRes] = await Promise.all([
        fetch("/api/inventory/templates"),
        fetch("/api/products/summary?limit=300&isActive=true"),
        fetch("/api/costs?type=debt&isPaid=false"),
      ]);
      const tJson = await tRes.json();
      if (tJson.success && Array.isArray(tJson.data)) {
        setTemplates(tJson.data.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      }
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.data)) {
        setProductOptions(
          pJson.data.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))
        );
      }
      const dJson = await dRes.json();
      if (dJson.success && dJson.data?.entries) {
        setUnpaidDebts(
          dJson.data.entries.map((e: CostRow) => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
          }))
        );
      }
    } catch {
      /* optional */
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("type", tab);
      const res = await fetch(`/api/costs?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      setEntries(data.data.entries);
      setSummary(data.data.summary);
    } catch {
      toast.error("Failed to load costs");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const openAdd = () => {
    setEditing(null);
    setFormType("cost");
    setFormDescription("");
    setFormAmount("");
    setFormTemplateId("");
    setFormProductId("");
    setFormCreditor("");
    setFormDueDate("");
    setFormRelatedDebtId("");
    void loadSupportLists();
    setModalOpen(true);
  };

  const openEdit = (row: CostRow) => {
    setEditing(row);
    setFormType(row.type as CostType);
    setFormDescription(row.description);
    setFormAmount(row.amount);
    setFormTemplateId(row.templateId || "");
    setFormProductId(row.productId || "");
    setFormCreditor(row.creditorName || "");
    setFormDueDate(row.dueDate ? row.dueDate.slice(0, 10) : "");
    setFormRelatedDebtId(row.relatedDebtId || "");
    void loadSupportLists();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formDescription.trim()) return toast.error("Description required");
    const amt = parseFloat(formAmount);
    if (!Number.isFinite(amt)) return toast.error("Valid amount required");

    setSubmitting(true);
    try {
      const linkInventory = formType === "cost";
      const body = {
        type: formType,
        description: formDescription.trim(),
        amount: formAmount,
        templateId: linkInventory ? formTemplateId || null : null,
        productId: linkInventory ? formProductId || null : null,
        creditorName: formType === "debt" ? formCreditor || null : null,
        dueDate: formType === "debt" && formDueDate ? formDueDate : null,
        relatedDebtId: formType === "payment" && formRelatedDebtId ? formRelatedDebtId : null,
      };

      if (editing) {
        const editLinkInventory = formType === "cost";
        const res = await fetch(`/api/costs/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formType,
            description: formDescription.trim(),
            amount: formAmount,
            templateId: editLinkInventory ? formTemplateId || null : null,
            productId: editLinkInventory ? formProductId || null : null,
            creditorName: formCreditor || null,
            dueDate: formDueDate || null,
            relatedDebtId: formRelatedDebtId || null,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success("Entry updated");
      } else {
        const res = await fetch("/api/costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        toast.success("Entry created");
      }
      setModalOpen(false);
      void fetchEntries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (row: CostRow) => {
    try {
      const res = await fetch(`/api/costs/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPaid: true,
          paidAt: new Date().toISOString(),
          paidAmount: row.amount,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Marked as paid");
      void fetchEntries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const removeEntry = async (row: CostRow) => {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch(`/api/costs/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Deleted");
      void fetchEntries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const typeBadge = (t: string) => {
    const cls =
      t === "cost"
        ? "bg-slate-500/15 text-slate-600 dark:text-slate-300"
        : t === "debt"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", cls)}>
        {t}
      </span>
    );
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "cost", label: "Costs" },
    { key: "debt", label: "Debts" },
    { key: "payment", label: "Payments" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Costs &amp; Debts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track inventory-related costs, debts, and payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchEntries()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total costs</p>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(parseFloat(summary.totalCosts) || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outstanding debts
          </p>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(parseFloat(summary.outstandingDebts) || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total paid</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(parseFloat(summary.totalPaid) || 0)}
          </p>
        </div>
      </div>

      <div className="flex border-b border-border gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold transition-colors relative",
              tab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Template / Product</th>
                  <th className="px-3 py-3">Creditor</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 hover:bg-muted/30">
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {fmtDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate font-medium text-foreground">
                      {row.description}
                    </td>
                    <td className="px-3 py-2.5">{typeBadge(row.type)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatCurrency(parseFloat(row.amount) || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {[row.templateName, row.productName].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{row.creditorName || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {row.type === "debt" ? (
                        row.isPaid ? (
                          <span className="text-emerald-600 font-medium">Paid</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Unpaid</span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {row.type === "debt" && !row.isPaid && (
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => markPaid(row)}>
                            Mark paid
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => void removeEntry(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit entry" : "Add entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={formType}
                onChange={(e) => {
                  const next = e.target.value as CostType;
                  setFormType(next);
                  if (next === "debt" || next === "payment") {
                    setFormTemplateId("");
                    setFormProductId("");
                  }
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cost">Cost</option>
                <option value="debt">Debt</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
              />
            </div>
            {formType === "cost" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Template (optional)</label>
                  <select
                    value={formTemplateId}
                    onChange={(e) => setFormTemplateId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Product (optional)</label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {formType === "debt" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Creditor name</label>
                  <input
                    value={formCreditor}
                    onChange={(e) => setFormCreditor(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            {formType === "payment" && (
              <div>
                <label className="text-xs text-muted-foreground">Link to debt (optional)</label>
                <select
                  value={formRelatedDebtId}
                  onChange={(e) => setFormRelatedDebtId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {unpaidDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.description.slice(0, 48)} ({formatCurrency(parseFloat(d.amount) || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
