/**
 * Helpers for matching product variant optionCombination entries to option values / groups.
 * Supports legacy combos (group name → label) and id-based combos (groupId → valueId).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(s: string): boolean {
  return UUID_RE.test(s);
}

/** True if this variant row references the given option value (by id or display value string). */
export function variantReferencesValue(
  optionCombination: Record<string, string>,
  valueId: string,
  valueLabel: string
): boolean {
  for (const v of Object.values(optionCombination)) {
    if (v === valueId || v === valueLabel) return true;
  }
  return false;
}

/** True if variant references any value belonging to the group (by id or label). */
export function variantReferencesGroupValues(
  optionCombination: Record<string, string>,
  groupName: string,
  values: Array<{ id: string; value: string }>
): boolean {
  for (const val of values) {
    if (variantReferencesValue(optionCombination, val.id, val.value)) return true;
  }
  // Legacy: key is group name → one of labels
  const byName = optionCombination[groupName];
  if (byName && values.some((v) => v.value === byName)) return true;
  return false;
}

type GroupRow = { id: string; name: string };
type ValueRow = { id: string; optionGroupId: string; value: string };

/**
 * Canonical string for deduping combinations (sorted groupId entries).
 */
export function canonicalComboKey(
  combo: Record<string, string>,
  groups: GroupRow[],
  allValues: ValueRow[]
): string {
  const groupByName = new Map(groups.map((g) => [g.name, g]));
  const valuesByGroup = new Map<string, ValueRow[]>();
  for (const g of groups) {
    valuesByGroup.set(g.id, []);
  }
  for (const v of allValues) {
    valuesByGroup.get(v.optionGroupId)?.push(v);
  }

  const pairs: [string, string][] = [];

  for (const [k, v] of Object.entries(combo)) {
    if (isUuidLike(k) && isUuidLike(v)) {
      pairs.push([k, v]);
      continue;
    }
    const g = groupByName.get(k);
    if (!g) continue;
    const vals = valuesByGroup.get(g.id) || [];
    const valRow = vals.find((row) => row.value === v || row.id === v);
    if (valRow) pairs.push([g.id, valRow.id]);
  }

  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(Object.fromEntries(pairs));
}
