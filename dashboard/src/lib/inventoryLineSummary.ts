/** Build human-readable field breakdown for inventory JSON `values` + template fieldsSchema. */

export type FieldSchemaLite = { name: string; label?: string; type?: string };

export function summarizeInventoryValues(
  values: Record<string, unknown> | null | undefined,
  fieldsSchema: FieldSchemaLite[] | null | undefined
): { fieldSummaries: { fieldLabel: string; value: string }[]; flatPreview: string } {
  const summaries: { fieldLabel: string; value: string }[] = [];
  if (!values || typeof values !== "object" || !Array.isArray(fieldsSchema)) {
    return { fieldSummaries: summaries, flatPreview: "" };
  }
  for (const f of fieldsSchema) {
    if (!f?.name || f.type === "group") continue;
    const raw = values[f.name];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string" && raw.trim() === "") continue;
    const label = f.label || f.name;
    let text: string;
    if (Array.isArray(raw)) {
      text = raw.map((x) => (x === null || x === undefined ? "" : String(x))).join(", ");
    } else if (typeof raw === "object") {
      text = JSON.stringify(raw);
    } else {
      text = String(raw);
    }
    if (!text.trim()) continue;
    summaries.push({ fieldLabel: label, value: text.length > 240 ? `${text.slice(0, 240)}…` : text });
  }
  const flatPreview =
    summaries.length > 0
      ? summaries.map((s) => `${s.fieldLabel}: ${s.value}`).join(" · ").slice(0, 140)
      : "";
  return { fieldSummaries: summaries, flatPreview };
}
