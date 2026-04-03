/**
 * Count "codes" (atomic values) per inventory row for templates with multi-line / array fields.
 * Skips internal _metadata keys.
 * `wholeFieldIsOneItem`: when true, the entire field value counts as one code (multiline = still one code).
 */

export type FieldSchemaLike = { name: string; type?: string; label?: string };

/** Field schema with optional "whole field = one stock item" flag from template editor */
export type FieldSchemaForCodes = FieldSchemaLike & { wholeFieldIsOneItem?: boolean };

export function getTemplateFieldNames(fieldsSchema: FieldSchemaLike[] | null | undefined): string[] {
  if (!Array.isArray(fieldsSchema)) return [];
  return fieldsSchema.filter((f) => f?.name && f.type !== "group").map((f) => f.name);
}

export function getTemplateFieldsForCodes(
  fieldsSchema: FieldSchemaForCodes[] | null | undefined
): FieldSchemaForCodes[] {
  if (!Array.isArray(fieldsSchema)) return [];
  return fieldsSchema.filter((f) => f?.name && f.type !== "group");
}

function isEmptyScalar(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

/** Atomic values in one field on a row (multiline string → line count, array → non-empty elements, else 0 or 1). */
export function countCodesForField(values: Record<string, unknown> | null | undefined, fieldName: string): number {
  if (!values || typeof values !== "object") return 0;
  const raw = values[fieldName];
  if (isEmptyScalar(raw)) return 0;
  if (Array.isArray(raw)) {
    return raw.filter((x) => !isEmptyScalar(x)).length;
  }
  if (typeof raw === "string" && raw.includes("\n")) {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean).length;
  }
  return 1;
}

/** When wholeFieldIsOneItem: non-empty field = exactly one code (ignore newlines as separate codes). */
export function countCodesForFieldWhole(values: Record<string, unknown> | null | undefined, fieldName: string): number {
  if (!values || typeof values !== "object") return 0;
  const raw = values[fieldName];
  if (isEmptyScalar(raw)) return 0;
  if (Array.isArray(raw)) {
    return raw.some((x) => !isEmptyScalar(x)) ? 1 : 0;
  }
  return 1;
}

export function countCodesForFieldWithSchema(
  values: Record<string, unknown> | null | undefined,
  field: FieldSchemaForCodes
): number {
  if (!field?.name) return 0;
  if (field.wholeFieldIsOneItem) {
    return countCodesForFieldWhole(values, field.name);
  }
  return countCodesForField(values, field.name);
}

/** Sum of codes across all template fields on one row (excluding _metadata). */
export function countCodesInRow(
  values: Record<string, unknown> | null | undefined,
  fieldNames: string[]
): number {
  if (!values || typeof values !== "object") return 0;
  let n = 0;
  for (const name of fieldNames) {
    n += countCodesForField(values, name);
  }
  return n;
}

export function countCodesInRowWithSchema(
  values: Record<string, unknown> | null | undefined,
  fields: FieldSchemaForCodes[]
): number {
  if (!values || typeof values !== "object") return 0;
  let n = 0;
  for (const f of fields) {
    n += countCodesForFieldWithSchema(values, f);
  }
  return n;
}

/** List atomic code strings for display (one entry per code). */
export function listAtomicCodesForField(
  values: Record<string, unknown> | null | undefined,
  field: FieldSchemaForCodes
): string[] {
  if (!values || typeof values !== "object" || !field?.name) return [];
  const raw = values[field.name];
  if (isEmptyScalar(raw)) return [];
  if (field.wholeFieldIsOneItem) {
    if (Array.isArray(raw)) {
      const items = raw.filter((x) => !isEmptyScalar(x));
      return items.length > 0 ? [items.map(String).join(", ")] : [];
    }
    return [String(raw).trim()];
  }
  if (Array.isArray(raw)) {
    return raw.filter((x) => !isEmptyScalar(x)).map(String);
  }
  if (typeof raw === "string" && raw.includes("\n")) {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(raw)];
}

/** Take up to `take` atomic codes from a field value; remainder is what's left in that field (or null if none). */
export function peelAtomicCodesFromField(raw: unknown, take: number): { peeled: unknown[]; remainder: unknown | null } {
  if (take <= 0) return { peeled: [], remainder: raw };
  if (isEmptyScalar(raw)) return { peeled: [], remainder: raw };

  if (Array.isArray(raw)) {
    const items = raw.filter((x) => !isEmptyScalar(x));
    const peeled = items.slice(0, take);
    const rest = items.slice(take);
    return { peeled, remainder: rest.length > 0 ? rest : null };
  }

  if (typeof raw === "string") {
    const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return { peeled: [], remainder: raw };
    const peeledLines = lines.slice(0, take);
    const restLines = lines.slice(take);
    const remainder = restLines.length > 0 ? restLines.join("\n") : null;
    return { peeled: peeledLines, remainder };
  }

  /* number, boolean, single scalar */
  if (take >= 1) return { peeled: [raw], remainder: null };
  return { peeled: [], remainder: raw };
}

/**
 * Peel codes respecting wholeFieldIsOneItem: whole field yields at most one peel (the full value).
 */
export function peelAtomicCodesFromFieldWithSchema(
  raw: unknown,
  take: number,
  field: FieldSchemaForCodes
): { peeled: unknown[]; remainder: unknown | null } {
  if (take <= 0) return { peeled: [], remainder: raw };
  if (field.wholeFieldIsOneItem) {
    if (isEmptyScalar(raw)) return { peeled: [], remainder: raw };
    if (take >= 1) return { peeled: [raw], remainder: null };
    return { peeled: [], remainder: raw };
  }
  return peelAtomicCodesFromField(raw, take);
}

/** Split a decimal cost string across `part` of `whole` atomic units (same logic as reserve-codes). */
export function splitCostAcrossUnits(total: string | null | undefined, part: number, whole: number): string | null {
  if (!total || whole <= 0 || part <= 0) return total ?? null;
  const t = parseFloat(total);
  if (!Number.isFinite(t) || t <= 0) return total ?? null;
  const u = (t * part) / whole;
  return u.toFixed(2);
}
