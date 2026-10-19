import type { PlayValueOp, ScoreTemplate } from '@onboard/shared';

/** Partial record edits use declared keys and finite scalar values only. */
export function validateInputKey(op: PlayValueOp, template: ScoreTemplate | null): string | null {
  if (op.inputKey === undefined) return null;
  const category = template?.categories.find((entry) => entry.key === op.categoryKey);
  if (
    category?.input !== 'counts' ||
    !category.inputs?.includes(op.inputKey) ||
    ['__proto__', 'prototype', 'constructor'].includes(op.inputKey) ||
    op.roundIndex !== undefined
  ) {
    return 'Ô nhập không hợp lệ';
  }
  const signed =
    template?.slug === 'zoo-tycoon' &&
    template.templateVersion >= 3 &&
    category.key === 'endQuantities' &&
    ['buildingPopularity', 'buildingConservation'].includes(op.inputKey);
  if (
    op.value !== null &&
    (typeof op.value !== 'number' || !Number.isFinite(op.value) || (!signed && op.value < 0))
  )
    return 'Số lượng không hợp lệ';
  return null;
}

/** A null value removes only the selected key, preserving concurrent sibling edits. */
export function applyInputValue(values: Record<string, unknown>, op: PlayValueOp) {
  const key = op.inputKey!;
  const previous = values[op.categoryKey];
  const record = {
    ...(previous && typeof previous === 'object' && !Array.isArray(previous)
      ? (previous as Record<string, number>)
      : {}),
  };
  const oldValue = record[key] ?? null;
  if (op.value === null) delete record[key];
  else record[key] = op.value as number;
  const next = { ...values };
  if (Object.keys(record).length) next[op.categoryKey] = record;
  else delete next[op.categoryKey];
  return { oldValue, values: next };
}
