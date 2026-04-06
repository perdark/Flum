"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type StockBatchField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  displayOrder?: number;
};

function splitFieldLines(text: string): string[] {
  const s = text.replace(/\r\n/g, "\n");
  if (s === "") return [];
  return s.split("\n");
}

function prefillLines(
  fields: StockBatchField[],
  defining?: Record<string, string | number | boolean> | null,
  defaults?: Record<string, string | number | boolean> | null
): Record<string, string> {
  const o: Record<string, string> = {};
  for (const f of fields) {
    const dv = defining?.[f.name];
    const def = defaults?.[f.name];
    const v = dv !== undefined && dv !== null ? dv : def;
    o[f.name] = v !== undefined && v !== null ? String(v) : "";
  }
  return o;
}

/**
 * Bulk add stock for one inventory product: one textarea per template field.
 * Checkbox: each line = separate stock row vs one row per field (multiline values).
 */
export function AddInventoryStockBatchModal({
  isOpen,
  onClose,
  onSuccess,
  templateId,
  productName,
  templateName,
  catalogItemId,
  fieldsSchema,
  definingValues,
  defaultValues,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  templateId: string;
  productName: string;
  templateName: string;
  catalogItemId: string;
  fieldsSchema: StockBatchField[];
  definingValues?: Record<string, string | number | boolean> | null;
  defaultValues?: Record<string, string | number | boolean> | null;
}) {
  const sortedFields = useMemo(
    () => [...fieldsSchema].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [fieldsSchema]
  );

  const dataFields = useMemo(
    () => sortedFields.filter((f) => f.type !== "group"),
    [sortedFields]
  );

  const [lineTexts, setLineTexts] = useState<Record<string, string>>({});
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** When true: line N in each field = stock row N. When false: entire textarea per field = one combined stock row. */
  const [eachLineIsStock, setEachLineIsStock] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLineTexts(prefillLines(sortedFields, definingValues, defaultValues));
    setCost("");
    setEachLineIsStock(true);
  }, [isOpen, templateId, catalogItemId, sortedFields, definingValues, defaultValues]);

  const entryCount = useMemo(() => {
    if (!eachLineIsStock) {
      const any = dataFields.some((f) => (lineTexts[f.name] ?? "").replace(/\r\n/g, "\n").trim().length > 0);
      return any ? 1 : 0;
    }
    const lengths = dataFields.map((f) => splitFieldLines(lineTexts[f.name] ?? "").length);
    return lengths.length ? Math.max(0, ...lengths) : 0;
  }, [eachLineIsStock, lineTexts, dataFields]);

  const parsedItems = useMemo(() => {
    if (!eachLineIsStock) {
      const row: Record<string, string> = {};
      for (const f of dataFields) {
        row[f.name] = (lineTexts[f.name] ?? "").replace(/\r\n/g, "\n").trim();
      }
      if (Object.values(row).some((v) => v.length > 0)) return [row];
      return [];
    }
    if (entryCount === 0) return [];
    const out: Record<string, string>[] = [];
    for (let i = 0; i < entryCount; i++) {
      const row: Record<string, string> = {};
      for (const f of dataFields) {
        const lines = splitFieldLines(lineTexts[f.name] ?? "");
        row[f.name] = (lines[i] ?? "").trim();
      }
      if (Object.values(row).some((v) => v.length > 0)) {
        out.push(row);
      }
    }
    return out;
  }, [eachLineIsStock, entryCount, lineTexts, dataFields]);

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
      const res = await fetch(`/api/inventory/templates/${templateId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsedItems,
          cost: cost || null,
          catalogItemId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${data.data.count} stock ${data.data.count === 1 ? "entry" : "entries"}`);
        onSuccess?.();
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
    dataFields.length === 1
      ? "grid grid-cols-1 gap-4"
      : dataFields.length === 2
        ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add stock — {productName}
            <span className="block text-sm font-normal text-muted-foreground mt-1">
              Template: {templateName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={eachLineIsStock}
              onChange={(e) => setEachLineIsStock(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">Each line is a separate stock row</span>
              <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                <strong>On:</strong> e.g. two lines in a field → two stock rows (line 1 = row 1, line 2 = row 2). With
                multiple fields, line 1 across fields = first row, line 2 = second row, etc.
                <br />
                <strong>Off:</strong> all lines in each field become one value in a <em>single</em> stock row (good for
                multiline content).
              </span>
            </span>
          </label>

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
            {dataFields.map((f) => {
              const lines = splitFieldLines(lineTexts[f.name] ?? "");
              return (
                <div key={f.name} className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </label>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {eachLineIsStock ? `${lines.length} line${lines.length !== 1 ? "s" : ""}` : "1 row"}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    className="w-full min-h-[12rem] px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono resize-y"
                    value={lineTexts[f.name] ?? ""}
                    onChange={(e) => setFieldText(f.name, e.target.value)}
                    placeholder={
                      eachLineIsStock
                        ? `One value per line for ${f.label}…`
                        : `All text becomes one value for ${f.label} (can use multiple lines)…`
                    }
                    spellCheck={false}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{parsedItems.length}</span> stock{" "}
            {parsedItems.length === 1 ? "row" : "rows"} will be added
            {eachLineIsStock &&
            parsedItems.length !== entryCount &&
            entryCount > 0 &&
            parsedItems.length < entryCount ? (
              <span className="block text-xs mt-1">
                (blank-only rows were skipped)
              </span>
            ) : null}
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || parsedItems.length === 0}>
              {submitting ? "Adding…" : `Add ${parsedItems.length}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
